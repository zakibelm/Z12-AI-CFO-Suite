"""
Google Sign-In + Drive OAuth integration for Phoenix v3.

Flow:
  1. Frontend calls GET /api/auth/google/login -> redirects to Google.
  2. Google redirects back to /api/auth/google/callback?code=...&state=...
  3. Backend exchanges code for tokens, upserts user, signs a session JWT,
     sets it as an HttpOnly Secure SameSite=Lax cookie, and 302s to FRONTEND_URL.
  4. Frontend calls GET /api/auth/me to know who is logged in.
  5. POST /api/auth/logout clears the cookie and revokes the session.
  6. GET /api/auth/google/access-token returns the Drive access token (auto-refresh).
"""

from __future__ import annotations

import os
import secrets
import json
import datetime as dt
from typing import Optional

import httpx
import jwt
import psycopg
from psycopg.rows import dict_row
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Request, HTTPException, status, Response, Cookie
from fastapi.responses import RedirectResponse, JSONResponse

# ----------------------------------------------------------------------
# Config (read from env at import time)
# ----------------------------------------------------------------------
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "").strip()
GOOGLE_SCOPES        = os.getenv("GOOGLE_SCOPES", "openid email profile https://www.googleapis.com/auth/drive.readonly").strip()
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:5173").strip().rstrip("/")
SESSION_JWT_SECRET   = os.getenv("SESSION_JWT_SECRET", os.getenv("SUPABASE_JWT_SECRET", "")).strip()
SESSION_TTL_HOURS    = int(os.getenv("SESSION_TTL_HOURS", "12"))
TOKEN_ENC_KEY        = os.getenv("TOKEN_ENC_KEY", "").strip()
DATABASE_URL         = os.getenv("DATABASE_URL", "").strip()
COOKIE_NAME          = "phoenix_session"

# Cookie security: in prod always Secure + SameSite=Lax
_IS_HTTPS = FRONTEND_URL.startswith("https://") or GOOGLE_REDIRECT_URI.startswith("https://")

_fernet: Optional[Fernet] = None
if TOKEN_ENC_KEY:
    try:
        _fernet = Fernet(TOKEN_ENC_KEY.encode() if isinstance(TOKEN_ENC_KEY, str) else TOKEN_ENC_KEY)
    except Exception:
        _fernet = None

router = APIRouter(prefix="/auth", tags=["auth"])

# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
def _enc(token: Optional[str]) -> Optional[bytes]:
    if not token or not _fernet:
        return None
    return _fernet.encrypt(token.encode())

def _dec(token_bytes: Optional[bytes]) -> Optional[str]:
    if not token_bytes or not _fernet:
        return None
    try:
        return _fernet.decrypt(bytes(token_bytes)).decode()
    except (InvalidToken, Exception):
        return None

def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)

def _conn():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

def _sign_session_jwt(user_id: str, jti: str, expires_at: dt.datetime) -> str:
    payload = {
        "sub": str(user_id),
        "jti": jti,
        "iat": int(_now().timestamp()),
        "exp": int(expires_at.timestamp()),
        "aud": "phoenix",
        "iss": "phoenix-auth",
    }
    return jwt.encode(payload, SESSION_JWT_SECRET, algorithm="HS256")

def _set_session_cookie(resp: Response, token: str, max_age_seconds: int) -> None:
    resp.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=max_age_seconds,
        httponly=True,
        secure=_IS_HTTPS,
        samesite="lax",
        path="/",
    )

def _clear_session_cookie(resp: Response) -> None:
    resp.delete_cookie(key=COOKIE_NAME, path="/")

def _get_user_from_cookie(token: Optional[str]) -> Optional[dict]:
    if not token or not SESSION_JWT_SECRET:
        return None
    try:
        payload = jwt.decode(token, SESSION_JWT_SECRET, algorithms=["HS256"], audience="phoenix")
    except Exception:
        return None
    user_id = payload.get("sub")
    jti = payload.get("jti")
    if not user_id or not jti:
        return None
    try:
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                """SELECT u.id, u.email, u.name, u.picture_url, u.locale
                   FROM users u
                   JOIN user_sessions s ON s.user_id = u.id
                   WHERE u.id = %s::uuid AND s.jti = %s
                     AND s.revoked_at IS NULL AND s.expires_at > NOW()
                     AND u.is_active = TRUE
                   LIMIT 1""",
                (user_id, jti),
            )
            return cur.fetchone()
    except Exception:
        return None

# ----------------------------------------------------------------------
# Endpoints
# ----------------------------------------------------------------------
@router.get("/config")
async def auth_config():
    """Public diagnostic: tells the frontend whether Google login is wired."""
    return {
        "google_login_enabled": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI and SESSION_JWT_SECRET),
        "client_id": GOOGLE_CLIENT_ID or None,
    }

@router.get("/google/login")
async def google_login(request: Request, redirect_to: Optional[str] = None):
    if not (GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI):
        raise HTTPException(500, "Google OAuth not configured on server")
    state = secrets.token_urlsafe(32)
    expires = _now() + dt.timedelta(minutes=10)
    try:
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "INSERT INTO oauth_state (state, expires_at, redirect_to) VALUES (%s, %s, %s)",
                (state, expires, redirect_to or FRONTEND_URL),
            )
            c.commit()
    except Exception as e:
        raise HTTPException(500, f"Could not persist OAuth state: {e}")

    from urllib.parse import urlencode
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
        "state": state,
    }
    return RedirectResponse("https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params))

@router.get("/google/callback")
async def google_callback(request: Request, code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    if error:
        return RedirectResponse(f"{FRONTEND_URL}/login?error={error}")
    if not code or not state:
        raise HTTPException(400, "Missing code or state")

    redirect_to = FRONTEND_URL
    try:
        with _conn() as c, c.cursor() as cur:
            cur.execute("SELECT redirect_to, expires_at FROM oauth_state WHERE state = %s", (state,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(400, "Invalid OAuth state")
            if row["expires_at"] < _now():
                cur.execute("DELETE FROM oauth_state WHERE state = %s", (state,))
                c.commit()
                raise HTTPException(400, "OAuth state expired")
            redirect_to = row["redirect_to"] or FRONTEND_URL
            cur.execute("DELETE FROM oauth_state WHERE state = %s", (state,))
            c.commit()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"OAuth state validation error: {e}")

    # Exchange code for tokens
    async with httpx.AsyncClient(timeout=15) as cli:
        token_resp = await cli.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
    if token_resp.status_code != 200:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=token_exchange_failed")
    tokens = token_resp.json()
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_in = int(tokens.get("expires_in") or 3600)
    id_token = tokens.get("id_token")
    scope = tokens.get("scope") or GOOGLE_SCOPES

    # Get user profile (we trust Google over TLS; we don't verify id_token signature here for simplicity
    # because we just exchanged a one-time code with our client_secret over HTTPS.)
    user_info = {}
    if id_token:
        try:
            # decode without verifying signature is ok in this exact flow (we have it from a fresh code exchange)
            user_info = jwt.decode(id_token, options={"verify_signature": False, "verify_aud": False})
        except Exception:
            user_info = {}
    if not user_info or "email" not in user_info:
        async with httpx.AsyncClient(timeout=10) as cli:
            ui = await cli.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
        if ui.status_code == 200:
            user_info = ui.json()

    google_sub = user_info.get("sub") or user_info.get("id")
    email = user_info.get("email")
    name = user_info.get("name")
    picture = user_info.get("picture")
    locale = user_info.get("locale")
    if not google_sub or not email:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=userinfo_failed")

    expires_at_token = _now() + dt.timedelta(seconds=expires_in)
    access_enc = _enc(access_token)
    refresh_enc = _enc(refresh_token) if refresh_token else None

    # Upsert user
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            """INSERT INTO users (google_sub, email, name, picture_url, locale, last_login_at,
                                  google_access_token_enc, google_refresh_token_enc,
                                  google_token_expires_at, google_scopes)
               VALUES (%s,%s,%s,%s,%s,NOW(),%s,%s,%s,%s)
               ON CONFLICT (google_sub) DO UPDATE SET
                 email = EXCLUDED.email,
                 name = COALESCE(EXCLUDED.name, users.name),
                 picture_url = COALESCE(EXCLUDED.picture_url, users.picture_url),
                 locale = COALESCE(EXCLUDED.locale, users.locale),
                 last_login_at = NOW(),
                 google_access_token_enc = EXCLUDED.google_access_token_enc,
                 google_refresh_token_enc = COALESCE(EXCLUDED.google_refresh_token_enc, users.google_refresh_token_enc),
                 google_token_expires_at = EXCLUDED.google_token_expires_at,
                 google_scopes = EXCLUDED.google_scopes
               RETURNING id""",
            (google_sub, email, name, picture, locale,
             access_enc, refresh_enc, expires_at_token, scope),
        )
        user_id = cur.fetchone()["id"]

        # Create a session
        jti = secrets.token_urlsafe(24)
        session_exp = _now() + dt.timedelta(hours=SESSION_TTL_HOURS)
        ua = (request.headers.get("user-agent") or "")[:512]
        ip_raw = request.client.host if request.client else None
        cur.execute(
            """INSERT INTO user_sessions (user_id, jti, user_agent, ip, expires_at)
               VALUES (%s, %s, %s, %s::inet, %s)""",
            (str(user_id), jti, ua, ip_raw, session_exp),
        )
        c.commit()

    session_jwt = _sign_session_jwt(str(user_id), jti, session_exp)
    resp = RedirectResponse(redirect_to or FRONTEND_URL)
    _set_session_cookie(resp, session_jwt, SESSION_TTL_HOURS * 3600)
    return resp

@router.get("/me")
async def auth_me(phoenix_session: Optional[str] = Cookie(default=None, alias=COOKIE_NAME)):
    user = _get_user_from_cookie(phoenix_session)
    if not user:
        raise HTTPException(401, "Not authenticated")
    return {
        "id": str(user["id"]),
        "email": user["email"],
        "name": user["name"],
        "picture_url": user["picture_url"],
        "locale": user["locale"],
    }

@router.post("/logout")
async def logout(phoenix_session: Optional[str] = Cookie(default=None, alias=COOKIE_NAME)):
    if phoenix_session and SESSION_JWT_SECRET:
        try:
            payload = jwt.decode(phoenix_session, SESSION_JWT_SECRET, algorithms=["HS256"], audience="phoenix")
            jti = payload.get("jti")
            if jti:
                with _conn() as c, c.cursor() as cur:
                    cur.execute("UPDATE user_sessions SET revoked_at = NOW() WHERE jti = %s", (jti,))
                    c.commit()
        except Exception:
            pass
    resp = JSONResponse({"ok": True})
    _clear_session_cookie(resp)
    return resp

@router.get("/google/access-token")
async def google_access_token(phoenix_session: Optional[str] = Cookie(default=None, alias=COOKIE_NAME)):
    """Returns a fresh Google Drive access token for the logged-in user.
    Auto-refreshes if expired."""
    user = _get_user_from_cookie(phoenix_session)
    if not user:
        raise HTTPException(401, "Not authenticated")
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            """SELECT google_access_token_enc, google_refresh_token_enc,
                      google_token_expires_at, google_scopes
               FROM users WHERE id = %s::uuid""",
            (str(user["id"]),),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(404, "User not found")

    expires_at = row["google_token_expires_at"]
    access = _dec(row["google_access_token_enc"])
    needs_refresh = (not access) or (expires_at and expires_at <= _now() + dt.timedelta(seconds=60))
    if needs_refresh:
        refresh = _dec(row["google_refresh_token_enc"])
        if not refresh:
            raise HTTPException(401, "No refresh token available; please log in again")
        async with httpx.AsyncClient(timeout=15) as cli:
            r = await cli.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "refresh_token": refresh,
                    "grant_type": "refresh_token",
                },
            )
        if r.status_code != 200:
            raise HTTPException(401, f"Refresh failed: {r.text[:200]}")
        tk = r.json()
        access = tk.get("access_token")
        new_expires = _now() + dt.timedelta(seconds=int(tk.get("expires_in") or 3600))
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                """UPDATE users SET google_access_token_enc = %s,
                                    google_token_expires_at = %s
                   WHERE id = %s::uuid""",
                (_enc(access), new_expires, str(user["id"])),
            )
            c.commit()
        expires_at = new_expires
    return {
        "access_token": access,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "scopes": row["google_scopes"],
    }
