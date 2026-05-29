"""
webhook.py — Reception des messages WhatsApp entrants
Routing : texte -> OpenRouter direct | fichier -> RAG pgvector
"""
import os
import logging
import httpx
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from .sender import send_message

logger = logging.getLogger(__name__)
router = APIRouter()

WHITELIST = set(
    n.strip() for n in os.getenv("WHATSAPP_WHITELIST", "").split(",") if n.strip()
)
import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL", "")

def get_openrouter_key() -> str:
    """Read OpenRouter API key from DB (first active admin user)."""
    # Fallback to env var first
    env_key = os.getenv("OPENROUTER_API_KEY", "")
    if env_key:
        return env_key
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute(
            "SELECT openrouter_key FROM local_users WHERE openrouter_key IS NOT NULL AND openrouter_key != \'\' AND is_active = TRUE LIMIT 1"
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        return row[0] if row else ""
    except Exception as e:
        logger.error(f"[WARN] Could not read openrouter_key from DB: {e}")
        return ""
BACKEND_BASE = "http://localhost:8000"

class WhatsAppMessage(BaseModel):
    phone: str
    message: Optional[str] = ""
    type: str = "text"
    mimetype: Optional[str] = None
    filename: Optional[str] = None
    data_base64: Optional[str] = None

async def handle_text_message(phone: str, text: str):
    """Appel direct OpenRouter - bypass JWT."""
    openrouter_key = get_openrouter_key()
    if not openrouter_key:
        logger.warning("[WhatsApp] Cle OpenRouter manquante - envoi message aide")
        await send_message(phone, "Z12 CFO: Cle OpenRouter non configuree. Connectez-vous sur cfo.optigenius.pro > Parametres pour la saisir.")
        return
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek/deepseek-r1",
                    "messages": [
                        {"role": "system", "content": "Tu es Sophie, CPA virtuelle specialisee en fiscalite canadienne et quebecoise. Reponds en francais, de facon concise."},
                        {"role": "user", "content": text}
                    ],
                    "max_tokens": 500
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                reply = data["choices"][0]["message"]["content"]
                reply = reply[:1500] + ("..." if len(reply) > 1500 else "")
                await send_message(phone, f"Z12 CFO\n{reply}")
            else:
                logger.error(f"OpenRouter error: {resp.status_code} {resp.text}")
                await send_message(phone, "Z12 - Service temporairement indisponible.")
    except Exception as e:
        logger.error(f"handle_text_message error: {e}")
        await send_message(phone, "Z12 - Erreur technique. Reessayez sur cfo.optigenius.pro")

async def handle_file_message(phone: str, filename: str, data_base64: str, mimetype: str):
    try:
        import base64
        file_bytes = base64.b64decode(data_base64)
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{BACKEND_BASE}/api/knowledge/ingest",
                files={"files": (filename, file_bytes, mimetype)},
                data={"bulk_metadata": '{"domaine":"Financial","sensibilite":"standard","source":"whatsapp"}'}
            )
            if resp.status_code == 200:
                await send_message(phone, f"Z12 - Fichier {filename} indexe avec succes.")
            else:
                await send_message(phone, f"Z12 - Echec indexation {filename}.")
    except Exception as e:
        logger.error(f"handle_file_message error: {e}")
        await send_message(phone, "Z12 - Erreur lors de l'indexation.")

@router.post("/api/whatsapp/webhook")
async def whatsapp_webhook(request: Request, background_tasks: BackgroundTasks):
    # Twilio envoie du form-urlencoded
    try:
        form = await request.form()
        phone = str(form.get("From", "")).replace("whatsapp:", "").strip()
        text = str(form.get("Body", ""))
        num_media = int(form.get("NumMedia", 0))
        msg_type = "image" if num_media > 0 else "text"
    except Exception as e:
        logger.error(f"Form parse error: {e}")
        raise HTTPException(status_code=400, detail="Invalid form data")

    if WHITELIST and phone not in WHITELIST:
        logger.info(f"Ignored non-whitelisted: {phone}")
        return {"status": "ignored"}

    if msg_type == "text" and text:
        background_tasks.add_task(handle_text_message, phone, text)

    return {"status": "ok"}

    if WHITELIST and msg.phone not in WHITELIST:
        logger.info(f"Ignored non-whitelisted: {msg.phone}")
        return {"status": "ignored"}

    if msg.type == "text" and msg.message:
        background_tasks.add_task(handle_text_message, msg.phone, msg.message)
    elif msg.type in ("document", "image") and msg.data_base64:
        fname = msg.filename or "upload.bin"
        background_tasks.add_task(handle_file_message, msg.phone, fname, msg.data_base64, msg.mimetype or "application/octet-stream")

    return {"status": "ok"}

@router.get("/api/whatsapp/status")
async def whatsapp_status():
    return {
        "bridge_running": False,
        "bridge_connected": False,
        "mode": "twilio_api",
        "whitelist_count": len(WHITELIST),
        "twilio_from": os.getenv("TWILIO_WHATSAPP_FROM", "")
    }
