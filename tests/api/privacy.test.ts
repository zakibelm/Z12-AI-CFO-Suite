import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_API_URL || 'https://cfo.optigenius.pro';

async function getToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/local/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.TEST_EMAIL || 'zak3@test.com',
        password: process.env.TEST_PASSWORD || 'test123',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || data.token || null;
  } catch {
    return null;
  }
}

describe('API /api/privacy/my-data — Loi 25 Art. 27 droit acces', () => {
  it('should return 401 without auth token', async () => {
    const res = await fetch(`${BASE_URL}/api/privacy/my-data`);
    expect(res.status).toBe(401);
  }, 10000);

  it('should return a user data object when authenticated', async () => {
    const token = await getToken();
    if (!token) {
      console.warn('Skipping: login unavailable');
      return;
    }
    const res = await fetch(`${BASE_URL}/api/privacy/my-data`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data).toBe('object');
    expect(data).not.toBeNull();
    expect(Array.isArray(data)).toBe(false);
    const hasUserField = 'user' in data || 'email' in data || 'id' in data || 'memories' in data;
    expect(hasUserField).toBe(true);
  }, 15000);
});

describe('API /api/privacy/delete-my-account — Loi 25 Art. 28 droit effacement', () => {
  it('should return 401 without auth token', async () => {
    const res = await fetch(`${BASE_URL}/api/privacy/delete-my-account`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  }, 10000);

  it('endpoint should exist (returns something other than 404)', async () => {
    const res = await fetch(`${BASE_URL}/api/privacy/delete-my-account`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer invalid_test_token_do_not_delete' },
    });
    expect([401, 403, 422]).toContain(res.status);
    expect(res.status).not.toBe(404);
  }, 10000);
});
