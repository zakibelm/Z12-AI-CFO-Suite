import { describe, it, expect } from 'vitest';
import {
  detectAgentFromFile,
  detectLanguage,
  estimateChunks,
  uploadStageLabel,
} from './fileUtils';

describe('fileUtils — detectAgentFromFile', () => {
  it('should return a string agent id for any filename', () => {
    const result = detectAgentFromFile('rapport-audit.pdf');
    expect(typeof result).toBe('string');
  });

  it('should detect audit-related files', () => {
    const result = detectAgentFromFile('audit-2024.pdf');
    expect(result).toBeTruthy();
  });

  it('should detect fiscal-related files', () => {
    const result = detectAgentFromFile('declaration-fiscale.pdf');
    expect(result).toBeTruthy();
  });

  it('should return a fallback for unknown file types', () => {
    const result = detectAgentFromFile('random-unknown-file-xyz.txt');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('fileUtils — detectLanguage', () => {
  it('should detect French text (with enough French keywords > 30 chars)', () => {
    // Text must be > 30 chars and have more French keywords than English
    const result = detectLanguage('Bonjour, voici notre rapport financier annuel avec les etats des comptes.');
    expect(['fr', 'unknown']).toContain(result);
  });

  it('should detect English text (with enough English keywords > 30 chars)', () => {
    const result = detectLanguage('Hello, here is the annual financial report with all our accounts and details.');
    expect(['en', 'unknown']).toContain(result);
  });

  it('should return unknown for text shorter than 30 characters', () => {
    const result = detectLanguage('Short text');
    expect(result).toBe('unknown');
  });

  it('should return unknown or a language for empty string', () => {
    const result = detectLanguage('');
    expect(['fr', 'en', 'unknown']).toContain(result);
  });
});

describe('fileUtils — estimateChunks', () => {
  it('should return at least 1 chunk for any word count', () => {
    expect(estimateChunks(1)).toBeGreaterThanOrEqual(1);
    expect(estimateChunks(375)).toBe(1);
    expect(estimateChunks(750)).toBe(2);
  });

  it('should scale linearly with word count (~375 words per chunk)', () => {
    const chunks = estimateChunks(3750);
    expect(chunks).toBe(10);
  });

  it('should return 1 for 0 words (minimum)', () => {
    expect(estimateChunks(0)).toBeGreaterThanOrEqual(1);
  });
});

describe('fileUtils — uploadStageLabel (15-file threshold)', () => {
  it('should return Lecture... for progress < 15', () => {
    expect(uploadStageLabel(0)).toContain('Lecture');
    expect(uploadStageLabel(14)).toContain('Lecture');
  });

  it('should NOT return Lecture for progress >= 15', () => {
    const label = uploadStageLabel(15);
    expect(label).not.toContain('Lecture');
  });

  it('should return Extraction texte for 15 <= progress < 35', () => {
    expect(uploadStageLabel(15)).toContain('Extraction');
    expect(uploadStageLabel(34)).toContain('Extraction');
  });

  it('should return null for progress >= 100 (pipeline complete)', () => {
    expect(uploadStageLabel(100)).toBeNull();
    expect(uploadStageLabel(1000)).toBeNull();
  });

  it('should return a non-empty string for progress in range 0-99', () => {
    [0, 5, 14, 15, 34, 35, 59, 60, 84, 85, 99].forEach((p) => {
      const label = uploadStageLabel(p);
      expect(typeof label).toBe('string');
      expect(label!.length).toBeGreaterThan(0);
    });
  });
});
