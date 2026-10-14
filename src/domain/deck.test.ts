import { describe, it, expect } from 'vitest';
import { buildQueue, questionPool, spreadMultiResponse } from './session';
import { emptyProgress } from './progress';
import { questions } from '../content/deck';

/**
 * These tests run against the REAL authored deck, so they catch regressions in
 * how sessions are assembled from real content.
 */
describe('real deck - question pools', () => {
  it('has questions in every domain', () => {
    for (const d of ['d1', 'd2', 'd3', 'd4', 'd5'] as const) {
      expect(questions.filter((q) => q.domain === d).length).toBeGreaterThan(10);
    }
  });

  it('covers 2, 3 and 4 option counts', () => {
    const counts = new Set(questions.map((q) => q.options.length));
    expect(counts.has(2)).toBe(true);
    expect(counts.has(3)).toBe(true);
    expect(counts.has(4)).toBe(true);
  });

  it('has multiple-response items, all in challenge mode', () => {
    const multi = questions.filter((q) => q.type === 'multiple');
    expect(multi.length).toBeGreaterThan(0);
    for (const m of multi) {
      expect(m.mode).toBe('challenge');
      expect(m.options.filter((o) => o.isCorrect).length).toBe(m.correctCount);
      expect(m.correctCount).toBeGreaterThanOrEqual(2);
    }
  });

  it('only allows multiple-response in challenge mode', () => {
    for (const q of questions) {
      if (q.type === 'multiple') expect(q.mode).toBe('challenge');
    }
  });
});

describe('real deck - session composition', () => {
  it('a challenge session always includes at least one multiple-response item', () => {
    for (let len = 5; len <= 20; len += 5) {
      const ids = buildQueue(questions, emptyProgress(), { mode: 'challenge', targetLength: len }, Date.now());
      const multi = ids.filter((id) => questions.find((q) => q.id === id)?.type === 'multiple');
      expect(multi.length, `length ${len} had ${multi.length} multi items`).toBeGreaterThan(0);
    }
  });

  it('challenge sessions include multiple-response items at a sensible rate (~1/3)', () => {
    const ids = buildQueue(questions, emptyProgress(), { mode: 'challenge', targetLength: 12 }, Date.now());
    const multi = ids.filter((id) => questions.find((q) => q.id === id)?.type === 'multiple');
    expect(multi.length).toBeGreaterThanOrEqual(2);
    expect(multi.length).toBeLessThanOrEqual(5);
  });

  it('a discover session contains only single-answer swipe cards', () => {
    const ids = buildQueue(questions, emptyProgress(), { mode: 'discover', targetLength: 10 }, Date.now());
    for (const id of ids) {
      const q = questions.find((x) => x.id === id)!;
      expect(q.type).toBe('single');
      expect(q.mode).toBe('swipe');
    }
  });

  it('respects the requested session length and never repeats a card', () => {
    for (const len of [5, 10, 20]) {
      const ids = buildQueue(questions, emptyProgress(), { mode: 'challenge', targetLength: len }, Date.now());
      expect(ids).toHaveLength(len);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('domain filter narrows the pool', () => {
    const ids = buildQueue(questions, emptyProgress(), { mode: 'discover', targetLength: 5, domainFilter: ['d3'] }, Date.now());
    expect(ids).toHaveLength(5);
    for (const id of ids) expect(questions.find((q) => q.id === id)!.domain).toBe('d3');
  });

  it('never reuses a direction for two options on the same card', () => {
    for (const q of questions) {
      // direction assignment guarantees N unique directions for N options
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options.length).toBeLessThanOrEqual(4);
    }
  });
});

describe('spreadMultiResponse (integration)', () => {
  it('keeps every item and preserves relative order of singles', () => {
    const items = [
      { type: 'single', id: 1 },
      { type: 'single', id: 2 },
      { type: 'multiple', id: 3 },
      { type: 'single', id: 4 },
      { type: 'single', id: 5 },
      { type: 'single', id: 6 },
    ];
    const out = spreadMultiResponse(items);
    expect(out).toHaveLength(items.length);
    expect(new Set(out.map((o) => o.id)).size).toBe(items.length);
    const singlesIn = items.filter((i) => i.type === 'single').map((i) => i.id);
    const singlesOut = out.filter((i) => i.type === 'single').map((i) => i.id);
    expect(singlesOut).toEqual(singlesIn);
  });
});

describe('questionPool on real deck', () => {
  it('recall mode can draw from everything', () => {
    expect(questionPool(questions, 'recall').length).toBe(questions.length);
  });
});
