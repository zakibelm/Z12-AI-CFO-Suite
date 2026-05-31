from __future__ import annotations
import os, secrets, datetime as dt
from typing import Optional
import jwt, psycopg, bcrypt
from psycopg.rows import dict_row
from fastapi import APIRouter, HTTPException, Response, Cookie
from fastapi.responses import JSONResponse
from pydantic import BaseModel

DATABASE_URL       = os.getenv("DATABASE_URL", "").strip()
SESSION_JWT_SECRET = os.getenv("SESSION_JWT_SECRET", os.getenv("SUPABASE_JWT_SECRET", "phoenix-local-secret")).strip()
SESSION_TTL_HOURS  = int(os.getenv("SESSION_TTL_HOURS", "12"))
FRONTEND_URL       = os.getenv("FRONTEND_URL", "https://phoenix.optigenius.pro").strip().rstrip("/")
COOKIE_NAME        = "phoenix_session"
IS_HTTPS           = FRONTEND_URL.startswith("https://")

router = APIRouter(prefix="/api/auth/local", tags=["auth-local"])

def _conn():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

def _now():
    return dt.datetime.now(dt.timezone.utc)

def _sign_jwt(user_id, jti, expires_at):
    return jwt.encode(
        {"sub": str(user_id), "jti": jti,
         "iat": int(_now().timestamp()), "exp": int(expires_at.timestamp()),
         "aud": "phoenix", "iss": "phoenix-auth"},
        SESSION_JWT_SECRET, algorithm="HS256")

def _set_cookie(resp, token):
    resp.set_cookie(key=COOKIE_NAME, value=token, max_age=SESSION_TTL_HOURS*3600,
        httponly=True, secure=IS_HTTPS, samesite="lax", path="/")

def _clear_cookie(resp):
    resp.delete_cookie(key=COOKIE_NAME, path="/")

def _get_user(token):
    if not token:
        return None
    try:
        p = jwt.decode(token, SESSION_JWT_SECRET, algorithms=["HS256"], audience="phoenix")
        uid = p.get("sub")
        jti = p.get("jti")
        if not uid or not jti:
            return None
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                """SELECT u.id, u.email, u.name, u.picture_url
                   FROM local_users u
                   JOIN user_sessions s ON s.user_id = u.id
                   WHERE u.id = %s::uuid AND s.jti = %s
                     AND s.revoked_at IS NULL AND s.expires_at > NOW()
                     AND u.is_active = TRUE LIMIT 1""",
                (uid, jti))
            return cur.fetchone()
    except Exception:
        return None

class RegisterBody(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class LoginBody(BaseModel):
    email: str
    password: str

class ForgotBody(BaseModel):
    email: str

class ResetBody(BaseModel):
    token: str
    password: str

@router.post("/register")
async def register(body: RegisterBody):
    email = body.email.lower().strip()
    if len(body.password) < 8:
        raise HTTPException(400, "Le mot de passe doit contenir au moins 8 caracteres")
    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    try:
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "INSERT INTO local_users (email, password_hash, name) VALUES (%s, %s, %s) RETURNING id",
                (email, hashed, body.name or email.split("@")[0]))
            c.commit()
            user_id = cur.fetchone()["id"]
    except Exception as e:
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(409, "Cet email est deja utilise")
        raise HTTPException(500, f"Erreur creation compte: {e}")
    jti = secrets.token_urlsafe(24)
    exp = _now() + dt.timedelta(hours=SESSION_TTL_HOURS)
    token = _sign_jwt(user_id, jti, exp)
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            "INSERT INTO user_sessions (user_id, jti, expires_at, token) VALUES (%s, %s, %s, %s)",
            (str(user_id), jti, exp, token))
        c.commit()
    resp = JSONResponse({"ok": True, "email": email})
    _set_cookie(resp, token)
    return resp

@router.post("/login")
async def login(body: LoginBody):
    email = body.email.lower().strip()
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            "SELECT id, email, name, picture_url, password_hash, is_active FROM local_users WHERE email = %s LIMIT 1",
            (email,))
        user = cur.fetchone()
    if not user or not user["is_active"]:
        raise HTTPException(401, "Email ou mot de passe incorrect")
    if not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode()):
        raise HTTPException(401, "Email ou mot de passe incorrect")
    jti = secrets.token_urlsafe(24)
    exp = _now() + dt.timedelta(hours=SESSION_TTL_HOURS)
    token = _sign_jwt(user["id"], jti, exp)
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            "INSERT INTO user_sessions (user_id, jti, expires_at, token) VALUES (%s, %s, %s, %s)",
            (str(user["id"]), jti, exp, token))
        c.commit()
    resp = JSONResponse({"ok": True, "user": {
        "id": str(user["id"]), "email": user["email"],
        "name": user["name"], "picture_url": user["picture_url"]}})
    _set_cookie(resp, token)
    return resp

@router.get("/me")
async def me(phoenix_session: Optional[str] = Cookie(default=None, alias=COOKIE_NAME)):
    user = _get_user(phoenix_session)
    if not user:
        raise HTTPException(401, "Non authentifie")
    return {"id": str(user["id"]), "email": user["email"],
            "name": user["name"], "picture_url": user["picture_url"], "locale": None}

@router.post("/logout")
async def logout(phoenix_session: Optional[str] = Cookie(default=None, alias=COOKIE_NAME)):
    if phoenix_session:
        try:
            p = jwt.decode(phoenix_session, SESSION_JWT_SECRET, algorithms=["HS256"], audience="phoenix")
            jti = p.get("jti")
            if jti:
                with _conn() as c, c.cursor() as cur:
                    cur.execute("UPDATE user_sessions SET revoked_at = NOW() WHERE jti = %s", (jti,))
                    c.commit()
        except Exception:
            pass
    resp = JSONResponse({"ok": True})
    _clear_cookie(resp)
    return resp

@router.post("/forgot-password")
async def forgot_password(body: ForgotBody):
    email = body.email.lower().strip()
    token = secrets.token_urlsafe(32)
    exp = _now() + dt.timedelta(hours=1)
    try:
        with _conn() as c, c.cursor() as cur:
            cur.execute("SELECT id FROM local_users WHERE email = %s LIMIT 1", (email,))
            user = cur.fetchone()
            if user:
                cur.execute(
                    """INSERT INTO password_reset_tokens (user_id, token, expires_at)
                       VALUES (%s, %s, %s)
                       ON CONFLICT (user_id) DO UPDATE
                       SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at""",
                    (str(user["id"]), token, exp))
                c.commit()
    except Exception:
        pass
    return {"ok": True, "message": "Lien genere.",
            "reset_url": f"{FRONTEND_URL}/login?reset_token={token}"}

@router.post("/reset-password")
async def reset_password(body: ResetBody):
    if len(body.password) < 8:
        raise HTTPException(400, "Minimum 8 caracteres")
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            "SELECT user_id, expires_at FROM password_reset_tokens WHERE token = %s LIMIT 1",
            (body.token,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(400, "Token invalide ou expire")
        if row["expires_at"] < _now():
            raise HTTPException(400, "Token expire")
        hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
        cur.execute("UPDATE local_users SET password_hash = %s WHERE id = %s::uuid",
                    (hashed, str(row["user_id"])))
        cur.execute("DELETE FROM password_reset_tokens WHERE token = %s", (body.token,))
        c.commit()
    return {"ok": True, "message": "Mot de passe reinitialise"}
