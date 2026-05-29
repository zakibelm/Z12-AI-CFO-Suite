import os
import psycopg2
from fastapi import APIRouter, Request, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user_id

router = APIRouter()
DATABASE_URL = os.environ.get("DATABASE_URL", "")

class ApiKeyPayload(BaseModel):
    api_key: str

@router.post("/save-key")
async def save_api_key(
    payload: ApiKeyPayload,
    request: Request,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    x_internal_service: Optional[str] = Header(None),
):
    """Save OpenRouter API key for the authenticated user."""
    user_id = await get_current_user_id(request, authorization, x_user_id, x_internal_service)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    key = payload.api_key.strip()
    if not key.startswith("sk-or-"):
        raise HTTPException(status_code=400, detail="Invalid OpenRouter key format")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute(
            "UPDATE local_users SET openrouter_key = %s WHERE id = %s",
            (key, user_id)
        )
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get-key-status")
async def get_key_status(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    x_internal_service: Optional[str] = Header(None),
):
    """Check if user has a saved OpenRouter key (without revealing it)."""
    user_id = await get_current_user_id(request, authorization, x_user_id, x_internal_service)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute(
            "SELECT openrouter_key IS NOT NULL AND openrouter_key != \'\' FROM local_users WHERE id = %s",
            (user_id,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        has_key = bool(row and row[0])
        return {"has_key": has_key}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
