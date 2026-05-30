"""
AI CFO Suite - Backend FastAPI
Point d'entree principal : configure l'app, les middlewares et les routes.

Architecture :
    - utils/security.py     : sanitisation et validation
    - services/text_extractor.py : extraction de texte multi-format
    - services/rag_service.py    : chunking et contexte RAG
    - agent_prompts.py           : prompts systeme des agents IA
"""
import asyncio
import json
import os
import sys
from collections.abc import AsyncGenerator
from pathlib import Path

import httpx
from dotenv import load_dotenv
from pydantic import BaseModel
from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# Modules internes
from agent_prompts import AGENT_PROMPTS
from services.rag_service import build_rag_context, load_document_text
from services.text_extractor import extract_text_from_file
from utils.security import is_allowed_file_type, is_safe_path, sanitize_filename
from z_kernel import call_llm, call_llm_stream, select_model
from kb_storage import vector_search
from kb_ingest import generate_embedding
from security_pii import scrub_text, ScrubLevel
from auth_google import router as auth_router
from whatsapp.webhook import router as whatsapp_router
from settings import router as settings_router
from auth import get_current_user_id
from response_cache import get_cached_response, cache_response, init_cache_table, get_cache_stats

# Encodage UTF-8 sous Windows
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer, "strict")
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.buffer, "strict")

# Charger le .env depuis la racine du projet (pas depuis backend/)
_project_root = Path(__file__).parent.parent
print(f"[DEBUG] Project root: {_project_root}")
print(f"[DEBUG] Env path: {_project_root / '.env'}")
print(f"[DEBUG] Env exists: {(_project_root / '.env').exists()}")
load_dotenv(_project_root / ".env", override=True)
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
print(f"[DEBUG] API Key loaded: {OPENROUTER_API_KEY[:10] if OPENROUTER_API_KEY else 'EMPTY'}...")
DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "deepseek/deepseek-v4-pro")
# Item 5 — Résumé glissant : max messages avant résumé
SLIDING_WINDOW_SIZE: int = int(os.getenv("SLIDING_WINDOW_SIZE", "8"))  # messages avant compression
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Dossier d'uploads
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Limites de securite
MAX_FILE_SIZE = 50 * 1024 * 1024   # 50 MB par fichier
MAX_FILES_PER_REQUEST = 50          # max 50 fichiers par upload

# ─────────────────────────────────────────────────────────────────────────────
# Application FastAPI
# ─────────────────────────────────────────────────────────────────────────────

# --- AUTH_MODE security check ---
import os as _os
_AUTH_MODE = _os.environ.get("AUTH_MODE", "dev")
if _AUTH_MODE != "strict":
    print(f"[SECURITY WARNING] AUTH_MODE={_AUTH_MODE} — set AUTH_MODE=strict in production")
else:
    print("[SECURITY] AUTH_MODE=strict — production mode active")

app = FastAPI(
    title="AI CFO Suite API",
    description="API pour la suite AI CFO : upload, extraction, RAG et requetes IA.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://cfo.optigenius.pro", "http://cfo.optigenius.pro"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# CFO Knowledge Factory — router (KB + Factory endpoints)
# ─────────────────────────────────────────────────────────────────────────────
try:
    from cfo_kf_routes import router as cfo_kf_router
    app.include_router(cfo_kf_router)
    app.include_router(auth_router)
    try:
        from auth_local import router as auth_local_router
        app.include_router(auth_local_router)
        print("[INFO] Local auth router mounted")
    except Exception as _el:
        print(f"[WARN] auth_local not loaded: {_el}")
    print("[INFO] CFO Knowledge Factory router mounted at /api/knowledge/* and /api/cfo-kf/*")
except Exception as _e:
    print(f"[WARN] CFO Knowledge Factory router not loaded: {_e}")

# ────────────────────────────────────────────────────────────────
# WhatsApp router
# ────────────────────────────────────────────────────────────────
try:
    app.include_router(whatsapp_router)
    app.include_router(settings_router, prefix="/api/settings", tags=["settings"])
    print("[INFO] WhatsApp router mounted at /api/whatsapp/*")
except Exception as _wa:
    print(f"[WARN] WhatsApp router not loaded: {_wa}")


# ─────────────────────────────────────────────────────────────────────────────
# Routes utilitaires
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "AI CFO Suite API", "status": "running", "version": "2.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}

# [REMOVED] debug/config endpoint removed for security
@app.post("/upload", status_code=200)
async def upload_files(files: list[UploadFile] = File(...)):
    """
    Upload et traitement de fichiers financiers.
    - Valide les types et tailles de fichiers
    - Sanitise les noms de fichiers (securite path traversal)
    - Extrait le texte pour le RAG
    """
    if len(files) > MAX_FILES_PER_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Trop de fichiers. Maximum {MAX_FILES_PER_REQUEST} par requete."
        )

    uploaded = []
    errors = []

    for file in files:
        raw_name = file.filename or "unnamed_file"

        # Sanitiser le nom de fichier
        safe_name = sanitize_filename(raw_name)

        # Verifier le type de fichier
        if not is_allowed_file_type(safe_name):
            errors.append({
                "filename": raw_name,
                "error": f"Type de fichier non autorise : .{safe_name.rsplit('.', 1)[-1]}"
            })
            continue

        try:
            content = await file.read(MAX_FILE_SIZE + 1)

            if len(content) > MAX_FILE_SIZE:
                errors.append({
                    "filename": raw_name,
                    "error": f"Fichier trop volumineux (>{MAX_FILE_SIZE // 1024 // 1024} MB)"
                })
                continue

            # Chemin de destination securise
            dest_path = UPLOAD_DIR / safe_name
            if not is_safe_path(UPLOAD_DIR, dest_path):
                errors.append({"filename": raw_name, "error": "Nom de fichier invalide"})
                continue

            # Sauvegarder le fichier original
            dest_path.write_bytes(content)

            # Extraire le texte pour le RAG
            extracted_text = extract_text_from_file(content, safe_name)
            text_path = UPLOAD_DIR / f"{safe_name}.extracted.txt"
            text_path.write_text(extracted_text, encoding="utf-8")

            uploaded.append({
                "filename": safe_name,
                "original_filename": raw_name,
                "size": len(content),
                "path": str(dest_path),
                "extracted_preview": extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text,
                "text_path": str(text_path),
            })

        except Exception as exc:
            errors.append({"filename": raw_name, "error": str(exc)})

    return {
        "message": f"{len(uploaded)} fichier(s) traite(s)",
        "files": uploaded,
        "errors": errors,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Extraction de texte (sans sauvegarde)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/extract-text", status_code=200)
async def extract_text_endpoint(files: list[UploadFile] = File(...)):
    """Extrait le texte de fichiers uploades sans les sauvegarder."""
    if len(files) > MAX_FILES_PER_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Trop de fichiers. Maximum {MAX_FILES_PER_REQUEST} par requete."
        )

    results = []
    for file in files:
        raw_name = file.filename or "unnamed_file"
        safe_name = sanitize_filename(raw_name)

        try:
            content = await file.read(MAX_FILE_SIZE + 1)
            if len(content) > MAX_FILE_SIZE:
                results.append({
                    "filename": safe_name,
                    "content": f"[ERREUR] Fichier trop volumineux (>{MAX_FILE_SIZE // 1024 // 1024} MB)",
                    "size": len(content),
                })
                continue

            text = extract_text_from_file(content, safe_name)
            results.append({"filename": safe_name, "content": text, "size": len(content)})
            del content

        except Exception as exc:
            results.append({"filename": safe_name, "content": f"[Erreur extraction: {exc}]", "size": 0})

    return {"files": results}


# ─────────────────────────────────────────────────────────────────────────────
# RAG - recuperation d'un document
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/rag/{filename}")
async def get_rag_document(filename: str):
    """Recupere le contenu extrait d'un document RAG."""
    safe_name = sanitize_filename(filename)
    doc_text = load_document_text(UPLOAD_DIR, safe_name)

    if doc_text is None:
        raise HTTPException(status_code=404, detail=f"Document '{safe_name}' introuvable dans le RAG.")

    return {"filename": safe_name, "content": doc_text, "size": len(doc_text)}


# ─────────────────────────────────────────────────────────────────────────────
# Helper : construction des messages pour l'API LLM
# ─────────────────────────────────────────────────────────────────────────────

async def _build_messages_context(
    query_text: str,
    selected_agent: str,
    document_name: str | None,
    conversation_history: list,
    sensibilite: str = "professionnel",
) -> tuple[str, list]:
    """
    Construit le system prompt et la liste de messages,
    en integrant le RAG semantique si aucun document precis n'est specifie,
    ou le RAG cible si document_name est fourni.
    """
    system_prompt = AGENT_PROMPTS.get(selected_agent, AGENT_PROMPTS["Auto"])
    system_prompt += "\n\nTu reponds de maniere professionnelle et concise en francais."

    messages = []

    # 1. RAG SEMANTIQUE (si pas de document specifique)
    rag_context = ""
    if not document_name:
        # Generer embedding de la query pour recherche vectorielle
        emb = await generate_embedding(query_text, sensibilite=sensibilite)
        if emb:
            matches = vector_search(emb, limit=3)
            if matches:
                rag_context = "CONTEXTE SEMANTIQUE (KB):\n"
                for m in matches:
                    rag_context += f"--- {m['filename']} ---\n{m.get('text_excerpt', '')}\n"
    
    # 2. RAG CIBLE (si document specifie par l'UI)
    elif document_name:
        safe_name = sanitize_filename(document_name)
        raw_text = load_document_text(UPLOAD_DIR, safe_name)
        if raw_text:
            rag_context = f"CONTEXTE (Document: {document_name}):\n"
            rag_context += build_rag_context(raw_text, query_text)

    # 3. Construction du premier message utilisateur (Context + Query)
    user_content = query_text
    if rag_context:
        user_content = f"{rag_context}\n\n---\n\nQUESTION: {query_text}"

    # 4. Assemblage historique
    if conversation_history:
        # Item 5 — Résumé glissant : garde seulement les N derniers échanges
        if len(conversation_history) > SLIDING_WINDOW_SIZE * 2:
            # Tronque à la fenêtre glissante — garde les plus récents
            conversation_history = conversation_history[-(SLIDING_WINDOW_SIZE * 2):]
            print(f"[TOKENS] Historique tronqué à {SLIDING_WINDOW_SIZE * 2} messages (sliding window)")
        messages.extend(conversation_history)
        if messages and messages[-1]["role"] == "user":
             messages[-1]["content"] = user_content
        else:
             messages.append({"role": "user", "content": user_content})
    else:
        messages.append({"role": "user", "content": user_content})

    return system_prompt, messages


# ─────────────────────────────────────────────────────────────────────────────
# Requete IA standard (non-streaming)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/query", status_code=200)
async def query(payload: dict):
    """
    Requete IA avec contexte RAG optionnel et historique de conversation.
    La cle API est lue exclusivement depuis les variables d'environnement serveur.
    """
    query_text: str = payload.get("query", "").strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="Le champ 'query' est obligatoire.")

    document_name: str | None = payload.get("document_name")
    selected_agent: str = payload.get("agent", "Auto")
    sensibilite: str = payload.get("sensibilite", "professionnel")

    system_prompt, messages = await _build_messages_context(
        query_text, selected_agent, document_name, payload.get("history", []), sensibilite
    )

    model = select_model(selected_agent, 100.0, query_text)
    
    try:
        response_text = await call_llm(
            model=model,
            system_prompt=system_prompt,
            user_prompt=messages[-1]["content"],
            sensibilite=sensibilite
        )
        
        return {
            "agent": selected_agent,
            "response": response_text,
            "model": model
        }

    except HTTPException:
        raise
    except Exception as exc:
        safe_msg = str(exc).encode("ascii", "ignore").decode("ascii")
        raise HTTPException(status_code=500, detail=f"Erreur interne: {safe_msg}") from exc


# ─────────────────────────────────────────────────────────────────────────────
# Requete IA avec streaming SSE (Server-Sent Events)
# ─────────────────────────────────────────────────────────────────────────────




@app.post("/stream-query")
async def stream_query(payload: dict):
    """
    Requete IA avec reponse en streaming (Server-Sent Events).
    Avantage UX : l'utilisateur voit les tokens apparaitre progressivement.
    """
    query_text: str = payload.get("query", "").strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="Le champ 'query' est obligatoire.")

    document_name: str | None = payload.get("document_name")
    selected_agent: str = payload.get("agent", "Auto")
    sensibilite: str = payload.get("sensibilite", "professionnel")

    # Construction du contexte et des messages
    system_prompt, messages = await _build_messages_context(
        query_text, selected_agent, document_name, payload.get("history", []), sensibilite
    )

    model = select_model(selected_agent, 100.0, query_text)
    agent_name = "CFO" if selected_agent == "Auto" else selected_agent

    async def event_stream() -> AsyncGenerator[str, None]:
        # 1. Envoyer l'agent choisi
        yield f"data: {json.dumps({'agent': agent_name})}\n\n"
        
        # 2. Streamer les tokens via z_kernel.call_llm_stream
        async for token in call_llm_stream(
            model=model,
            system_prompt=system_prompt,
            user_prompt=messages[-1]["content"],
            sensibilite=sensibilite
        ):
            yield f"data: {json.dumps({'content': token})}\n\n"
        
        # 3. Fin du stream
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# Entrypoint
# ─────────────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────
# Proxy /api/chat → OpenRouter (clé côté serveur, jamais exposée)
# ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    model: str = DEFAULT_MODEL
    messages: list
    max_tokens: int = 800
    plugins: list = []
    stream: bool = False
    agent: str = "Auto"
    session_id: str = None

@app.post("/api/chat", status_code=200)
async def chat_proxy(payload: ChatRequest, request: Request, user_id: str = "default_user"):
    # Bypass JWT pour appels internes WhatsApp
    x_internal = request.headers.get("X-Internal-Service", "")
    if x_internal == "whatsapp":
        user_id = "whatsapp-service"
    """
    Proxy vers OpenRouter. Utilise OPENROUTER_API_KEY (serveur).
    Fallback: X-API-Key header envoyé par le client (legacy).
    """
    # Priorité 1 : clé serveur dans l'environnement
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    # Priorité 2 : clé transmise par le client (header X-API-Key)
    if not api_key:
        api_key = request.headers.get("X-API-Key", "")
    if not api_key:
        raise HTTPException(status_code=401, detail="Clé API OpenRouter manquante. Configurez OPENROUTER_API_KEY dans le fichier .env du serveur.")

    # --- Mémoire persistante : injection contexte ---
    _question = ""
    for _m in reversed(payload.messages):
        if _m.get("role") == "user":
            _question = str(_m.get("content", ""))[:500]
            break
    # Item 5 — Cache sémantique : bypass OpenRouter si réponse en cache
    if _question:
        _cached = await get_cached_response(_question, payload.agent)
        if _cached:
            return {"content": _cached, "agent": payload.agent, "cached": True}
    _mem_ctx = await inject_memory_context(_question, payload.agent, user_id) if _question else ""
    _msgs = list(payload.messages)
    if _mem_ctx and _msgs and _msgs[0].get("role") == "system":
        _msgs[0] = {**_msgs[0], "content": _msgs[0]["content"] + "\n\n" + _mem_ctx}
    elif _mem_ctx:
        _msgs.insert(0, {"role": "system", "content": _mem_ctx})

    # --- KB QC Patrick injection ---
    if getattr(payload, 'agent', '') == 'Patrick' and _question:
        try:
            from kb_storage import search_kb_qc_by_text
            _kb_chunks = await search_kb_qc_by_text(_question, limit=3)
            if _kb_chunks:
                _kb_ctx = "Contexte KB QC (sources officielles):"
                for _c in _kb_chunks:
                    _src = _c.get("source_url", "source inconnue")
                    _txt = _c.get("text_content", "")[:600]
                    _kb_ctx += "\nSource: " + _src + "\n" + _txt + "\n"
                if _msgs and _msgs[0].get("role") == "system":
                    _msgs[0] = {**_msgs[0], "content": _msgs[0]["content"] + "\n\n" + _kb_ctx}
                else:
                    _msgs.insert(0, {"role": "system", "content": _kb_ctx})
                print(f"[Patrick KB] {len(_kb_chunks)} chunks injected for query: {_question[:80]}")
        except Exception as _kb_err:
            print(f"[Patrick KB] ERROR: {_kb_err}")

    body = {
        "model": payload.model,
        "messages": _msgs,
        "max_tokens": payload.max_tokens,
    }
    if payload.plugins:
        body["plugins"] = payload.plugins

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            OPENROUTER_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://cfo.optigenius.pro",
                "X-Title": "Z12 AI CFO Suite",
            },
            json=body,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    _resp_data = resp.json()
    # --- Mémoire persistante : sauvegarde session ---
    try:
        _answer = ""
        _choices = _resp_data.get("choices", [])
        if _choices:
            _answer = str(_choices[0].get("message", {}).get("content", ""))[:400]
        if _question and _answer:
            import asyncio as _aio
            _sid = payload.session_id or user_id
            _aio.create_task(save_session_summary(_sid, payload.agent, _question, _answer, user_id))
        # Item 5 — Stocker la réponse en cache
        asyncio.create_task(cache_response(_question, payload.agent, _answer))
    except Exception as _me:
        print(f"[WARN] Memory save skip: {_me}")
    return _resp_data




# ─── Phase 4 : Orchestration Multi-Agents ───────────────────────────────────
from fastapi.responses import StreamingResponse as _SR
from pydantic import BaseModel as _BM
from typing import Optional as _Opt, Dict as _Dict, Any as _Any
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from orchestrator.engine import execute_orchestration
from memory.service import save_memory, search_memories, inject_memory_context

class OrchestrateRequest(_BM):
    question: str
    context: _Opt[_Dict[str, _Any]] = {}

@app.post("/api/orchestrate")
async def api_orchestrate(req: OrchestrateRequest, request: Request):
    ctx = req.context or {}
    ctx["api_key"] = os.environ.get("OPENROUTER_API_KEY", "") or request.headers.get("X-API-Key", "")
    return _SR(
        execute_orchestration(req.question, ctx),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

class MemorySaveRequest(_BM):
    tier: str
    agent: str
    content: str
    session_id: _Opt[str] = None
    user_id: str = "default"
    importance: float = 1.0
    metadata: _Dict = {}

@app.post("/api/memory/save")
async def api_memory_save(req: MemorySaveRequest):
    mid = await save_memory(req.tier, req.agent, req.content, req.session_id, req.user_id, req.importance, req.metadata)
    return {"id": mid}

class MemorySearchRequest(_BM):
    query: str
    agent: _Opt[str] = None
    user_id: str = "default"
    limit: int = 5

@app.post("/api/memory/search")
async def api_memory_search(req: MemorySearchRequest):
    mems = await search_memories(req.query, req.agent, req.user_id, req.limit)
    return {"memories": mems}

@app.get("/api/memory/context")
async def api_memory_context(question: str, agent: str, user_id: str = Depends(get_current_user_id)):
    ctx = await inject_memory_context(question, agent, user_id)
    return {"context": ctx}

@app.get("/api/memory/list")
async def api_memory_list(agent: str = None, user_id: str = Depends(get_current_user_id)):
    """Liste les memories actives pour un user (optionnel: filtrer par agent)"""
    try:
        import psycopg
        from psycopg.rows import dict_row
        DATABASE_URL_MEM = os.getenv("DATABASE_URL", "postgresql://ai_cfo:ai_cfo_password@db:5432/ai_cfo_db")
        with psycopg.connect(DATABASE_URL_MEM, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                if agent:
                    cur.execute(
                        """SELECT id, tier, agent, content, importance, access_count, created_at, expires_at
                           FROM agent_memory
                           WHERE user_id = %s AND agent = %s
                             AND (expires_at IS NULL OR expires_at > NOW())
                           ORDER BY created_at DESC LIMIT 50""",
                        (user_id, agent)
                    )
                else:
                    cur.execute(
                        """SELECT id, tier, agent, content, importance, access_count, created_at, expires_at
                           FROM agent_memory
                           WHERE user_id = %s
                             AND (expires_at IS NULL OR expires_at > NOW())
                           ORDER BY created_at DESC LIMIT 100""",
                        (user_id,)
                    )
                rows = cur.fetchall()
                memories = [
                    {
                        "id": str(r["id"]),
                        "tier": r["tier"],
                        "agent": r["agent"],
                        "content": r["content"][:200],
                        "importance": float(r["importance"]),
                        "access_count": r["access_count"],
                        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                        "expires_at": r["expires_at"].isoformat() if r["expires_at"] else None,
                    }
                    for r in rows
                ]
                return {"memories": memories, "count": len(memories)}
    except Exception as e:
        print(f"[WARN] memory list error: {e}")
        return {"memories": [], "count": 0}


@app.delete("/api/memory/clear")
async def api_memory_clear(agent: str = None, user_id: str = Depends(get_current_user_id)):
    """Efface les memories d un user (optionnel: seulement pour un agent specifique)"""
    try:
        import psycopg
        DATABASE_URL_MEM = os.getenv("DATABASE_URL", "postgresql://ai_cfo:ai_cfo_password@db:5432/ai_cfo_db")
        with psycopg.connect(DATABASE_URL_MEM) as conn:
            with conn.cursor() as cur:
                if agent:
                    cur.execute("DELETE FROM agent_memory WHERE user_id = %s AND agent = %s", (user_id, agent))
                else:
                    cur.execute("DELETE FROM agent_memory WHERE user_id = %s", (user_id,))
                deleted = cur.rowcount
                conn.commit()
        return {"deleted": deleted, "agent": agent or "all"}
    except Exception as e:
        print(f"[WARN] memory clear error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Loi 25 — DSAR (Data Subject Access Request) ─────────────────────────────

@app.get("/api/privacy/my-data")
async def api_privacy_my_data(user_id: str = Depends(get_current_user_id)):
    """Droit d'acces - export de toutes les donnees d'un utilisateur (Loi 25 art.27)"""
    import psycopg
    from psycopg.rows import dict_row
    DB_URL = os.getenv("DATABASE_URL", "postgresql://ai_cfo:ai_cfo_password@db:5432/ai_cfo_db")
    result = {}
    try:
        with psycopg.connect(DB_URL, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                # Profil utilisateur
                cur.execute("SELECT id, email, created_at FROM local_users WHERE id::text = %s OR email = %s LIMIT 1", (user_id, user_id))
                user_row = cur.fetchone()
                result["profile"] = {
                    "id": str(user_row["id"]) if user_row else user_id,
                    "email": user_row["email"] if user_row else "N/A",
                    "created_at": user_row["created_at"].isoformat() if user_row and user_row["created_at"] else None,
                } if user_row else {}

                # Memoires agents
                cur.execute(
                    "SELECT tier, agent, content, importance, created_at, expires_at FROM agent_memory WHERE user_id = %s ORDER BY created_at DESC LIMIT 200",
                    (user_id,)
                )
                result["agent_memories"] = [
                    {
                        "tier": r["tier"], "agent": r["agent"],
                        "content": r["content"][:500],
                        "importance": float(r["importance"]),
                        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                        "expires_at": r["expires_at"].isoformat() if r["expires_at"] else None,
                    }
                    for r in cur.fetchall()
                ]

                # Sessions actives
                cur.execute(
                    "SELECT created_at, expires_at FROM user_sessions WHERE user_id::text = %s ORDER BY created_at DESC LIMIT 10",
                    (user_id,)
                )
                result["active_sessions"] = [
                    {
                        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                        "expires_at": r["expires_at"].isoformat() if r["expires_at"] else None,
                    }
                    for r in cur.fetchall()
                ]

        result["export_date"] = __import__("datetime").datetime.utcnow().isoformat() + "Z"
        result["law"] = "Loi 25 (Quebec) - DSAR Export"
        return result
    except Exception as e:
        print(f"[WARN] DSAR export error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'export des donnees")


@app.delete("/api/privacy/delete-my-account")
async def api_privacy_delete_account(user_id: str = Depends(get_current_user_id)):
    """Droit a l'effacement - suppression complete du compte (Loi 25 art.28)"""
    import psycopg
    DB_URL = os.getenv("DATABASE_URL", "postgresql://ai_cfo:ai_cfo_password@db:5432/ai_cfo_db")
    deleted = {}
    try:
        with psycopg.connect(DB_URL) as conn:
            with conn.cursor() as cur:
                # 1. Supprimer les memoires
                cur.execute("DELETE FROM agent_memory WHERE user_id = %s", (user_id,))
                deleted["memories"] = cur.rowcount

                # 2. Supprimer les sessions
                cur.execute("DELETE FROM user_sessions WHERE user_id::text = %s", (user_id,))
                deleted["sessions"] = cur.rowcount

                # 3. Supprimer le compte local
                cur.execute("DELETE FROM local_users WHERE id::text = %s", (user_id,))
                deleted["account"] = cur.rowcount

                conn.commit()

        return {
            "message": "Compte et donnees supprimes conformement a la Loi 25",
            "deleted": deleted,
            "date": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        }
    except Exception as e:
        print(f"[WARN] Account delete error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression du compte")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

@app.post("/api/auth/logout")
@app.get("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("token", path="/")
    response.delete_cookie("jwt", path="/")
    response.delete_cookie("session", path="/")
    return {"status": "logged out"}
