import { describe, it, expect } from 'vitest';
import { buildQueue, questionPool, spreadMultiResponse } from './session';
import { emptyProgress } from './progress';
import { deckList, getDeckMeta, getDeckQuestions, defaultDeckId, getQuestion, domainName } from '../content/decks';
import type { DomainId } from './types';
import manifestJson from '../../content/decks/manifest.json';
const manifest = manifestJson as unknown as { decks: Array<{ deckId: string; title: string; examCode: string; domains: Array<{ id: string; name: string; weight: number }> }> };

/**
 * These tests run against the REAL authored deck, so they catch regressions in
 * how sessions are assembled from real content.
 */

describe('deck registry', () => {
  it('knows all three certifications', () => {
    const ids = deckList.map((d) => d.deckId).sort();
    expect(ids).toEqual(['architect-foundations', 'architect-professional', 'developer-foundations']);
  });

  it('marks only decks that have a shipped question bank as available', () => {
    for (const d of deckList) {
      const expected = getDeckQuestions(d.deckId).length > 0;
      expect(d.available, `${d.deckId} availability`).toBe(expected);
    }
  });

  it('exposes a working default deck', () => {
    const id = defaultDeckId();
    expect(id).toBeTruthy();
    expect(getDeckMeta(id!)?.available).toBe(true);
  });

  it('returns undefined for an unknown deck', () => {
    expect(getDeckMeta('nope')).toBeUndefined();
    expect(getDeckQuestions('nope')).toEqual([]);
    expect(domainName('nope', 'd1')).toBe('d1');
  });

  it('matches the manifest for every deck', () => {
    expect(manifest.decks).toHaveLength(deckList.length);
    for (const d of deckList) {
      const m = manifest.decks.find((x) => x.deckId === d.deckId)!;
      expect(d.title).toBe(m.title);
      expect(d.examCode).toBe(m.examCode);
      expect(d.domains).toHaveLength(m.domains.length);
      // Weights should total 100% of the exam.
      const total = d.domains.reduce((n: number, x) => n + x.weight, 0);
      expect(Math.round(total), `${d.examCode} weight total`).toBe(100);
    }
  });

  it('gives every domain at least one objective and unique objective ids', () => {
    for (const d of deckList) {
      for (const dom of d.domains) {
        expect(dom.objectives.length, `${d.examCode}/${dom.id}`).toBeGreaterThan(0);
        expect(new Set(dom.objectives.map((o) => o.id)).size).toBe(dom.objectives.length);
      }
    }
  });
});

describe('real deck - question pools', () => {
  const deckId = defaultDeckId()!;
  const questions = getDeckQuestions(deckId);

  it('has questions in every domain of the deck', () => {
    const meta = getDeckMeta(deckId)!;
    for (const d of meta.domains) {
      expect(questions.filter((q) => q.domain === d.id).length, d.id).toBeGreaterThan(0);
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

  it('uses the same source document for every question', () => {
    const docs = new Set(questions.map((q) => q.source.document));
    expect(docs.size).toBe(1);
  });

  it('resolves questions and domain names by id', () => {
    const first = questions[0];
    expect(getQuestion(deckId, first.id)?.id).toBe(first.id);
    expect(domainName(deckId, first.domain)).toBe(getDeckMeta(deckId)!.domains.find((d) => d.id === first.domain)!.name);
  });
});

describe('real deck - session composition', () => {
  const deckId = defaultDeckId()!;
  const questions = getDeckQuestions(deckId);

  it('a challenge session always includes at least one multiple-response item', () => {
    for (let len = 5; len <= 20; len += 5) {
      const ids = buildQueue(questions, emptyProgress(), { mode: 'challenge', targetLength: len }, Date.now());
      const multi = ids.filter((id) => questions.find((q) => q.id === id)?.type === 'multiple');
      expect(multi.length, `length ${len} had ${multi.length} multi items`).toBeGreaterThan(0);
    }
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
    const meta = getDeckMeta(deckId)!;
    const d = meta.domains[1].id as DomainId;
    const ids = buildQueue(questions, emptyProgress(), { mode: 'discover', targetLength: 5, domainFilter: [d] }, Date.now());
    expect(ids).toHaveLength(5);
    for (const id of ids) expect(questions.find((q) => q.id === id)!.domain).toBe(d);
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
    const deckId = defaultDeckId()!;
    const questions = getDeckQuestions(deckId);
    expect(questionPool(questions, 'recall').length).toBe(questions.length);
  });
});
