import { describe, it, expect } from 'vitest';

describe('workflow — DEFAULT_AGENT_MODEL', () => {
  it('DEFAULT_AGENT_MODEL should be importable from workflow module', async () => {
    const mod = await import('./workflow');
    expect(mod).toBeDefined();
  });

  it('DEFAULT_AGENT_MODEL constant should be a non-empty string', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./src/utils/workflow.ts', 'utf-8');
    const match = content.match(/const DEFAULT_AGENT_MODEL\s*=\s*["']([^"']+)["']/);
    expect(match).not.toBeNull();
    expect(match![1]).toBeTruthy();
    expect(match![1].length).toBeGreaterThan(0);
  });

  it('DEFAULT_AGENT_MODEL should follow model/name format (contains /)', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./src/utils/workflow.ts', 'utf-8');
    const match = content.match(/const DEFAULT_AGENT_MODEL\s*=\s*["']([^"']+)["']/);
    expect(match).not.toBeNull();
    expect(match![1]).toContain('/');
  });
});

describe('workflow — callOpenRouter function signature', () => {
  it('callOpenRouter should be exported from workflow', async () => {
    const mod = await import('./workflow');
    expect(typeof mod.callOpenRouter).toBe('function');
  });

  it('callAgent should be exported from workflow', async () => {
    const mod = await import('./workflow');
    expect(typeof mod.callAgent).toBe('function');
  });

  it('fastRoute should be exported from workflow', async () => {
    const mod = await import('./workflow');
    expect(typeof mod.fastRoute).toBe('function');
  });

  it('fastRoute should return a value (string or undefined) for a given message', async () => {
    const mod = await import('./workflow');
    const result = mod.fastRoute('Analyse mon cashflow');
    // fastRoute may return agent id or undefined for unknown queries
    expect(result === undefined || result === null || typeof result === 'string').toBe(true);
  });
});

describe('workflow — genTitle', () => {
  it('genTitle should be exported', async () => {
    const mod = await import('./workflow');
    expect(typeof mod.genTitle).toBe('function');
  });

  it('genTitle should truncate long messages to max 7 words + ellipsis', async () => {
    const mod = await import('./workflow');
    const longMsg = 'un deux trois quatre cinq six sept huit neuf dix onze douze';
    const title = mod.genTitle(longMsg);
    // genTitle takes first 7 words then adds "..." if more words exist
    expect(title).toContain('...');
    const wordCount = title.replace('...', '').trim().split(' ').filter(Boolean).length;
    expect(wordCount).toBeLessThanOrEqual(7);
  });

  it('genTitle should return a string for a normal message', async () => {
    const mod = await import('./workflow');
    const title = mod.genTitle('Analyse mon bilan financier');
    expect(typeof title).toBe('string');
    expect(title.length).toBeGreaterThan(0);
  });

  it('genTitle should not add ellipsis for short messages (7 words or fewer)', async () => {
    const mod = await import('./workflow');
    const shortMsg = 'Analyse le bilan';
    const title = mod.genTitle(shortMsg);
    expect(title).not.toContain('...');
  });
});
