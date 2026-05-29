"""
Z12 AI CFO Suite — Cache sémantique des réponses
Item 5 — Optimisation tokens : ~30% de coût en moins sur questions répétées
Utilise psycopg3 (synchrone via executor) — même pattern que kb_storage.py
"""
import asyncio
import hashlib
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from typing import Optional

try:
    import psycopg
    from psycopg.rows import dict_row
    _HAS_PSYCOPG = True
except ImportError:
    psycopg = None
    _HAS_PSYCOPG = False

# ─────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────
CACHE_TTL_HOURS = int(os.getenv("CACHE_TTL_HOURS", "48"))
CACHE_MAX_ENTRIES = int(os.getenv("CACHE_MAX_ENTRIES", "1000"))
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://ai_cfo:ai_cfo_password@localhost:5432/ai_cfo_db")

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="cache")


# ─────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────
def _query_hash(query: str, agent: str) -> str:
    key = f"{agent}:{query.strip().lower()}"
    return hashlib.sha256(key.encode()).hexdigest()


def _get_conn():
    """Connexion psycopg3 synchrone."""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


# ─────────────────────────────────────────────────────────
# Init table (appelé au démarrage)
# ─────────────────────────────────────────────────────────
def _init_cache_table_sync() -> None:
    if not _HAS_PSYCOPG:
        return
    try:
        with _get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS response_cache (
                    id          SERIAL PRIMARY KEY,
                    query_hash  TEXT NOT NULL,
                    agent       TEXT NOT NULL DEFAULT 'Auto',
                    query_text  TEXT NOT NULL,
                    response    TEXT NOT NULL,
                    hit_count   INTEGER NOT NULL DEFAULT 0,
                    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    expires_at  TIMESTAMPTZ NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_cache_hash  ON response_cache(query_hash);
                CREATE INDEX IF NOT EXISTS idx_cache_agent ON response_cache(agent);
                CREATE INDEX IF NOT EXISTS idx_cache_exp   ON response_cache(expires_at);
            """)
            conn.commit()
        print("[CACHE] Table response_cache initialisée ✓")
    except Exception as e:
        print(f"[CACHE] Init table ignorée : {e}")


async def init_cache_table() -> None:
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(_executor, _init_cache_table_sync)


# ─────────────────────────────────────────────────────────
# Lookup cache
# ─────────────────────────────────────────────────────────
def _get_cached_sync(query_hash: str) -> Optional[dict]:
    if not _HAS_PSYCOPG:
        return None
    try:
        with _get_conn() as conn:
            row = conn.execute(
                "SELECT id, response FROM response_cache WHERE query_hash=%s AND expires_at>NOW() ORDER BY created_at DESC LIMIT 1",
                (query_hash,)
            ).fetchone()
            if row:
                conn.execute("UPDATE response_cache SET hit_count=hit_count+1 WHERE id=%s", (row["id"],))
                conn.commit()
            return row
    except Exception as e:
        print(f"[CACHE] lookup error: {e}")
        return None


async def get_cached_response(query: str, agent: str) -> Optional[str]:
    q_hash = _query_hash(query, agent)
    loop = asyncio.get_event_loop()
    row = await loop.run_in_executor(_executor, _get_cached_sync, q_hash)
    if row:
        print(f"[CACHE] HIT agent={agent} hash={q_hash[:8]}...")
        return row["response"]
    return None


# ─────────────────────────────────────────────────────────
# Écriture cache
# ─────────────────────────────────────────────────────────
def _cache_response_sync(query_hash: str, query: str, agent: str, response: str) -> None:
    if not _HAS_PSYCOPG:
        return
    try:
        expires = datetime.utcnow() + timedelta(hours=CACHE_TTL_HOURS)
        with _get_conn() as conn:
            conn.execute(
                "INSERT INTO response_cache (query_hash,agent,query_text,response,expires_at) VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                (query_hash, agent, query[:500], response, expires)
            )
            # Purge old entries if too many
            count = conn.execute("SELECT COUNT(*) as c FROM response_cache").fetchone()["c"]
            if count > CACHE_MAX_ENTRIES:
                conn.execute("DELETE FROM response_cache WHERE id IN (SELECT id FROM response_cache ORDER BY hit_count ASC, created_at ASC LIMIT 100)")
            conn.commit()
        print(f"[CACHE] STORED agent={agent} hash={query_hash[:8]}...")
    except Exception as e:
        print(f"[CACHE] store error: {e}")


async def cache_response(query: str, agent: str, response: str) -> None:
    # Filtre anti-cache pour données client spécifiques
    if len(response) < 50 or response.startswith("[LLM"):
        return
    skip_kw = ["mon chiffre", "notre résultat", "l'exercice", "notre bilan", "notre entreprise"]
    if any(k in query.lower() for k in skip_kw):
        return
    q_hash = _query_hash(query, agent)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(_executor, _cache_response_sync, q_hash, query, agent, response)


# ─────────────────────────────────────────────────────────
# Stats cache
# ─────────────────────────────────────────────────────────
def _get_stats_sync() -> dict:
    if not _HAS_PSYCOPG:
        return {"available": False}
    try:
        with _get_conn() as conn:
            row = conn.execute(
                "SELECT COUNT(*) as total, SUM(hit_count) as hits, COUNT(*) FILTER (WHERE expires_at>NOW()) as active FROM response_cache"
            ).fetchone()
            return {"total_entries": row["total"] or 0, "active": row["active"] or 0, "total_hits": row["hits"] or 0, "ttl_hours": CACHE_TTL_HOURS}
    except Exception as e:
        return {"error": str(e)}


async def get_cache_stats() -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _get_stats_sync)
