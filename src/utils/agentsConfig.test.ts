import { describe, it, expect } from 'vitest';
import { AGENTS_DEF, AGENTS_STUDIO, A_STUDIO } from './agentsConfig';

describe('agentsConfig — AGENTS_DEF', () => {
  it('should have exactly 9 agents', () => {
    expect(AGENTS_DEF).toHaveLength(9);
  });

  it('every agent should have a non-empty id', () => {
    AGENTS_DEF.forEach((agent) => {
      expect(agent.id).toBeTruthy();
      expect(typeof agent.id).toBe('string');
    });
  });

  it('every agent should have a non-empty name', () => {
    AGENTS_DEF.forEach((agent) => {
      expect(agent.name).toBeTruthy();
    });
  });

  it('every agent should have a color (hex format)', () => {
    AGENTS_DEF.forEach((agent) => {
      expect(agent.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('every agent should have a short abbreviation', () => {
    AGENTS_DEF.forEach((agent) => {
      expect(agent.short).toBeTruthy();
      expect(agent.short.length).toBeLessThanOrEqual(4);
    });
  });

  it('every agent should have bilingual personName (fr and en)', () => {
    AGENTS_DEF.forEach((agent) => {
      expect(agent.personName).toBeDefined();
      expect(agent.personName?.fr).toBeTruthy();
      expect(agent.personName?.en).toBeTruthy();
    });
  });

  it('every agent should have bilingual personTitle (fr and en)', () => {
    AGENTS_DEF.forEach((agent) => {
      expect(agent.personTitle).toBeDefined();
      expect(agent.personTitle?.fr).toBeTruthy();
      expect(agent.personTitle?.en).toBeTruthy();
    });
  });

  it('every agent should have bilingual domain (fr and en)', () => {
    AGENTS_DEF.forEach((agent) => {
      expect(agent.domain).toBeDefined();
      expect(agent.domain?.fr).toBeTruthy();
      expect(agent.domain?.en).toBeTruthy();
    });
  });

  it('every agent should have a defined webSearch field (boolean)', () => {
    AGENTS_DEF.forEach((agent) => {
      expect(typeof agent.webSearch).toBe('boolean');
    });
  });

  it('every agent should have a systemPrompt if defined', () => {
    AGENTS_DEF.forEach((agent) => {
      if (agent.systemPrompt !== undefined) {
        expect(typeof agent.systemPrompt).toBe('string');
        expect(agent.systemPrompt.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('agentsConfig — AGENTS_STUDIO (sidebar format)', () => {
  it('AGENTS_STUDIO should contain 9 entries', () => {
    expect(AGENTS_STUDIO).toHaveLength(9);
  });

  it('each AGENTS_STUDIO entry should have id, name, color, short', () => {
    AGENTS_STUDIO.forEach((agent) => {
      expect(agent.id).toBeTruthy();
      expect(agent.name).toBeTruthy();
      expect(agent.color).toBeTruthy();
      expect(agent.short).toBeTruthy();
    });
  });
});

describe('agentsConfig — A_STUDIO (Record map)', () => {
  it('A_STUDIO should be a Record with 9 keys', () => {
    expect(Object.keys(A_STUDIO)).toHaveLength(9);
  });

  it('A_STUDIO keys should match AGENTS_DEF ids', () => {
    const ids = AGENTS_DEF.map((a) => a.id);
    Object.keys(A_STUDIO).forEach((key) => {
      expect(ids).toContain(key);
    });
  });
});
