import json
import os
from datetime import datetime, timedelta
from typing import List, Optional, Dict

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://ai_cfo:ai_cfo_password@db:5432/ai_cfo_db")

TTL = {
    "working":    timedelta(hours=24),
    "episodic":   timedelta(days=30),
    "semantic":   None,
    "procedural": None,
}


def get_conn():
    import psycopg
    from psycopg.rows import dict_row
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


async def get_embedding(text: str) -> Optional[List[float]]:
    try:
        from kb_ingest import generate_embedding
        return await generate_embedding(text, sensibilite="professionnel")
    except Exception as e:
        print(f"[WARN] Memory embedding error: {e}")
        return None


async def save_memory(tier: str, agent: str, content: str,
                      session_id: Optional[str] = None, user_id: str = "default",
                      importance: float = 1.0, metadata: Dict = {}) -> Optional[str]:
    embedding = await get_embedding(content)
    expires_at = datetime.now() + TTL[tier] if TTL.get(tier) else None
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                if embedding:
                    cur.execute(
                        """INSERT INTO agent_memory (tier, agent, session_id, user_id, content, embedding, importance, expires_at, metadata)
                           VALUES (%s,%s,%s,%s,%s,%s::vector,%s,%s,%s) RETURNING id""",
                        (tier, agent, session_id, user_id, content, embedding, importance, expires_at, json.dumps(metadata))
                    )
                else:
                    cur.execute(
                        """INSERT INTO agent_memory (tier, agent, session_id, user_id, content, importance, expires_at, metadata)
                           VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                        (tier, agent, session_id, user_id, content, importance, expires_at, json.dumps(metadata))
                    )
                row = cur.fetchone()
                conn.commit()
                return str(row["id"]) if row else None
    except Exception as e:
        print(f"[WARN] save_memory error: {e}")
        return None


async def search_memories(query: str, agent: Optional[str] = None,
                          user_id: str = "default", limit: int = 5) -> List[Dict]:
    query_emb = await get_embedding(query)
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                if query_emb:
                    where = "user_id = %s"
                    params: list = [user_id]
                    if agent:
                        where += " AND agent = %s"
                        params.append(agent)
                    params += [query_emb, limit]
                    cur.execute(
                        f"""SELECT id, tier, agent, content, importance, access_count, created_at, metadata,
                                   1 - (embedding <=> %s::vector) AS similarity
                            FROM active_memories WHERE {where}
                            ORDER BY similarity DESC, importance DESC, created_at DESC LIMIT %s""",
                        params
                    )
                else:
                    where = "user_id = %s"
                    params2: list = [user_id]
                    if agent:
                        where += " AND agent = %s"
                        params2.append(agent)
                    params2.append(limit)
                    cur.execute(
                        f"SELECT id, tier, agent, content, importance, access_count, created_at, metadata, 0 AS similarity FROM active_memories WHERE {where} ORDER BY created_at DESC LIMIT %s",
                        params2
                    )
                rows = cur.fetchall()
                if rows:
                    ids = [str(r["id"]) for r in rows]
                    cur.execute("UPDATE agent_memory SET access_count=access_count+1, last_accessed_at=NOW() WHERE id=ANY(%s)", [ids])
                    conn.commit()
                return [{"id": str(r["id"]), "tier": r["tier"], "agent": r["agent"], "content": r["content"],
                         "importance": r["importance"], "similarity": float(r["similarity"])} for r in rows]
    except Exception as e:
        print(f"[WARN] search_memories error: {e}")
        return []


async def inject_memory_context(question: str, agent: str, user_id: str = "default") -> str:
    memories = await search_memories(query=question, agent=agent, user_id=user_id, limit=3)
    if not memories:
        return ""
    TIER_LABELS = {"working": "Recent", "episodic": "Session precedente", "semantic": "Connaissance", "procedural": "Procedure"}
    lines = [f"[{TIER_LABELS.get(m['tier'], m['tier'])}] {m['content'][:300]}" for m in memories]
    return "\n\nContexte memorise :\n" + "\n".join(lines)


async def save_session_summary(session_id: str, agent: str, question: str, answer: str, user_id: str = "default"):
    await save_memory(
        tier="working", agent=agent,
        content=f"Q: {question[:200]}\nR: {answer[:400]}",
        session_id=session_id, user_id=user_id, importance=0.7
    )


async def decay_memories():
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM agent_memory WHERE expires_at IS NOT NULL AND expires_at < NOW()")
                cur.execute("UPDATE agent_memory SET importance=importance*0.9 WHERE last_accessed_at < NOW()-INTERVAL '7 days' AND importance > 0.1")
                conn.commit()
        print("[INFO] Memory decay OK")
    except Exception as e:
        print(f"[WARN] decay_memories error: {e}")
