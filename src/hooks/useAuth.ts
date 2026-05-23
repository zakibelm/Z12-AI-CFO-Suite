// src/hooks/useAuth.ts
// JWT Authentication hook — Z12 AI CFO Suite
import { useState, useEffect, useCallback } from "react";

const API = "/api";
const TOKEN_KEY = "z12_jwt";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem(TOKEN_KEY),
    loading: true,
    error: null,
  });

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setState(s => ({ ...s, loading: false }));
      return;
    }
    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((user: AuthUser) => setState({ user, token, loading: false, error: null }))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setState({ user: null, token: null, loading: false, error: null });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const r = await fetch(`${API}/auth/local/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ detail: "Erreur de connexion" }));
        throw new Error(err.detail || "Email ou mot de passe incorrect");
      }
      const data = await r.json();
      const token = data.access_token || data.token;
      localStorage.setItem(TOKEN_KEY, token);
      // Fetch user profile
      const meR = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user: AuthUser = meR.ok ? await meR.json() : { id: "1", email, name: email.split("@")[0] };
      setState({ user, token, loading: false, error: null });
      return true;
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: e.message }));
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, token: null, loading: false, error: null });
  }, []);

  // Authenticated fetch helper
  const authFetch = useCallback((url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem(TOKEN_KEY);
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, []);

  return { ...state, login, logout, authFetch };
}
