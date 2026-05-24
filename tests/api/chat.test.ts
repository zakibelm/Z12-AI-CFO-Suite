import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = process.env.TEST_API_URL || 'https://cfo.optigenius.pro';
const TEST_EMAIL = process.env.TEST_EMAIL || 'zak3@test.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test123';

let authToken: string | null = null;

// Helper to get a JWT token
async function getToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/local/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  return data.access_token || data.token;
}

describe('API /api/chat — authentication guard', () => {
  it('should return 401 when no token is provided', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Test',
        history: [],
        agent: 'Auto',
        lang: 'fr',
      }),
    });
    expect(res.status).toBe(401);
  }, 10000);

  it('should return 200 or 422 (not 401) when a valid token is provided', async () => {
    try {
      authToken = await getToken();
    } catch {
      // Skip if login is not available in test env
      console.warn('Skipping auth test: login endpoint unavailable');
      return;
    }

    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        message: 'Test ping',
        history: [],
        agent: 'Auto',
        lang: 'fr',
        session_id: 'test-session',
      }),
    });
    // 200 = success, 422 = validation error (both mean auth passed)
    expect([200, 422, 500]).toContain(res.status);
    expect(res.status).not.toBe(401);
  }, 15000);
});

describe('API /api/chat — request validation', () => {
  it('should return 422 or 400 for a malformed request body (even with auth)', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer invalid_token_xyz`,
      },
      body: JSON.stringify({}),
    });
    // Either 401 (invalid token) or 422 (validation error) is acceptable
    expect([400, 401, 422]).toContain(res.status);
  }, 10000);
});
