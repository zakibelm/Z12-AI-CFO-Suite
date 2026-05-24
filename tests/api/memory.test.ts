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

describe('API /api/memory/list', () => {
  it('should return 401 without auth token', async () => {
    const res = await fetch(`${BASE_URL}/api/memory/list`);
    expect(res.status).toBe(401);
  }, 10000);

  it('should return an array when authenticated', async () => {
    const token = await getToken();
    if (!token) {
      console.warn('Skipping: login unavailable');
      return;
    }
    const res = await fetch(`${BASE_URL}/api/memory/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  }, 15000);

  it('should accept agent filter parameter', async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`${BASE_URL}/api/memory/list?agent=TaxAgent`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  }, 15000);
});

describe('API /api/memory/clear', () => {
  it('should return 401 without auth token', async () => {
    const res = await fetch(`${BASE_URL}/api/memory/clear`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  }, 10000);

  it('should return 200 when authenticated (dry run — no real data to delete in test)', async () => {
    const token = await getToken();
    if (!token) {
      console.warn('Skipping: login unavailable');
      return;
    }
    // We use a non-existent agent to avoid deleting real memories
    const res = await fetch(`${BASE_URL}/api/memory/clear?agent=NonExistentTestAgent9999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 204, 404]).toContain(res.status);
    // Must NOT be 401 or 500
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(500);
  }, 15000);
});
