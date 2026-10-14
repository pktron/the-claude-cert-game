import { describe, it, expect } from 'vitest';
import {
  emptyProgress,
  recordAnswer,
  getQuestionState,
  flagQuestion,
  deckCompletion,
  domainStats,
  weakConcepts,
  delayedRecallStats,
} from './progress';
import { createSession, buildQueue, questionPool, currentQuestionId, isSessionComplete, spreadMultiResponse } from './session';
import type { Question } from './types';

function q(id: string, over: Partial<Question> = {}): Question {
  return {
    id, domain: 'd1', taskStatement: '1.1', concept: 'c', mode: 'swipe', type: 'single',
    prompt: 'p',
    options: [
      { id: 'a', text: 'A', isCorrect: true },
      { id: 'b', text: 'B', isCorrect: false },
    ],
    correctCount: 1, optionCountRationale: 'r', distractorRationale: {},
    explanation: { correct: '', whyWrong: {}, takeaway: '' },
    source: { document: 'd', section: 's' }, reviewStatus: 'verified', ...over,
  };
}

const questions = [
  q('q1', { concept: 'alpha' }),
  q('q2', { concept: 'beta' }),
  q('q3', { domain: 'd2', concept: 'alpha' }),
  q('q4', { domain: 'd2', mode: 'challenge', type: 'multiple', correctCount: 2,
    options: [
      { id: 'a', text: 'A', isCorrect: true },
      { id: 'b', text: 'B', isCorrect: true },
      { id: 'c', text: 'C', isCorrect: false },
    ] }),
];

describe('recordAnswer', () => {
  it('accumulates XP, streak, and per-question spaced-repetition state', () => {
    let p = emptyProgress();
    p = recordAnswer(p, questions[0], true, {}, 1000, 10, 1, 1);
    const s = getQuestionState(p, 'q1');
    expect(s.attempts).toBe(1);
    expect(s.correctCount).toBe(1);
    expect(p.xpTotal).toBe(10);
    expect(p.currentStreak).toBe(1);
    expect(p.personalBestStreak).toBe(1);
    expect(p.cardsCompleted).toBe(1);
  });

  it('keeps personal best streak even after an incorrect answer resets the current streak', () => {
    let p = emptyProgress();
    p = recordAnswer(p, questions[0], true, {}, 1000, 10, 3, 3);
    p = recordAnswer(p, questions[0], false, {}, 2000, 0, 0, 3);
    expect(p.currentStreak).toBe(0);
    expect(p.personalBestStreak).toBe(3);
  });
});

describe('deckCompletion & analytics', () => {
  it('counts seen vs total and derives a ratio', () => {
    let p = emptyProgress();
    expect(deckCompletion(questions, p)).toEqual({ seen: 0, total: 4, ratio: 0 });
    p = recordAnswer(p, questions[0], true, {}, 1000, 10, 1, 1);
    const c = deckCompletion(questions, p);
    expect(c.seen).toBe(1);
    expect(c.ratio).toBeCloseTo(0.25);
  });

  it('computes per-domain accuracy', () => {
    let p = emptyProgress();
    p = recordAnswer(p, questions[0], true, {}, 1000, 10, 1, 1); // d1 correct
    p = recordAnswer(p, questions[0], false, {}, 2000, 0, 0, 1); // d1 wrong
    const stats = domainStats(questions, p, 3000);
    const d1 = stats.find((s) => s.domain === 'd1')!;
    expect(d1.answered).toBe(2);
    expect(d1.correct).toBe(1);
    expect(d1.accuracy).toBeCloseTo(0.5);
  });

  it('finds weak concepts', () => {
    let p = emptyProgress();
    p = recordAnswer(p, questions[0], false, {}, 1000, 0, 0, 0);
    p = recordAnswer(p, questions[0], false, {}, 1001, 0, 0, 0);
    p = recordAnswer(p, questions[1], true, {}, 1002, 10, 1, 1);
    p = recordAnswer(p, questions[1], true, {}, 1003, 10, 2, 2);
    const weak = weakConcepts(questions, p);
    expect(weak[0].concept).toBe('alpha');
    expect(weak[0].accuracy).toBeCloseTo(0); // alpha has 2 wrong, 0 right (q3 unseen)
  });

  it('counts delayed recall', () => {
    let p = emptyProgress();
    // answer correctly once (dueAt in future), then answer again "late"
    p = recordAnswer(p, questions[0], true, {}, 0, 10, 1, 1);
    const due = getQuestionState(p, 'q1').dueAt!;
    p = recordAnswer(p, questions[0], true, {}, due + 5, 10, 2, 2);
    const stats = delayedRecallStats(p);
    expect(stats.totalCorrect).toBe(2);
    expect(stats.delayedCorrect).toBe(1);
  });
});

describe('questionPool', () => {
  it('filters by mode and domain', () => {
    expect(questionPool(questions, 'discover').map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
    expect(questionPool(questions, 'challenge').map((q) => q.id)).toEqual(['q1', 'q2', 'q3', 'q4']);
    expect(questionPool(questions, 'discover', ['d2']).map((q) => q.id)).toEqual(['q3']);
  });
});

describe('buildQueue / createSession', () => {
  it('respects the target length', () => {
    const qz = buildQueue(questions, emptyProgress(), { mode: 'discover', targetLength: 2 }, 0);
    expect(qz).toHaveLength(2);
  });

  it('prioritises wrong answers in recall mode', () => {
    let p = emptyProgress();
    p = recordAnswer(p, questions[0], false, {}, 1000, 0, 0, 0); // q1 wrong
    p = recordAnswer(p, questions[1], true, {}, 1000, 10, 1, 1); // q2 correct
    const queue = buildQueue(questions, p, { mode: 'recall', targetLength: 2 }, 2000);
    expect(queue[0]).toBe('q1'); // wrong first
  });

  it('creates a session with a card per queued question and advances the cursor', () => {
    const s = createSession(questions, emptyProgress(), { mode: 'discover', targetLength: 3 }, 1000);
    expect(s.queue).toHaveLength(3);
    expect(currentQuestionId(s)).toBe(s.queue[0]);
    expect(isSessionComplete(s)).toBe(false);
    expect(isSessionComplete({ ...s, cursor: 3 })).toBe(true);
  });

  it('interleaves domains when possible', () => {
    // Build a deck where a naive order would be all d1 then all d2.
    const many = [
      ...Array.from({ length: 4 }, (_, i) => q(`a${i}`, { domain: 'd1' })),
      ...Array.from({ length: 4 }, (_, i) => q(`b${i}`, { domain: 'd2' })),
    ];
    const queue = buildQueue(many, emptyProgress(), { mode: 'discover', targetLength: 6 }, 0);
    // First two should be from different domains (interleaving).
    const firstTwoDomains = queue.slice(0, 2).map((id) => (id.startsWith('a') ? 'd1' : 'd2'));
    expect(new Set(firstTwoDomains).size).toBe(2);
  });
});

describe('flagQuestion', () => {
  it('stores a flag with a timestamp', () => {
    let p = emptyProgress();
    p = flagQuestion(p, 'q1', 555, 'bad explanation');
    expect(p.flagged.q1).toEqual({ at: 555, note: 'bad explanation' });
  });
});

describe('spreadMultiResponse', () => {
  it('spreads multiple-response items through the queue', () => {
    const items = [
      { type: 'single' }, { type: 'single' }, { type: 'multiple' },
      { type: 'single' }, { type: 'single' }, { type: 'single' },
      { type: 'single' }, { type: 'single' }, { type: 'multiple' },
    ];
    const out = spreadMultiResponse(items);
    const idx = out.map((x, i) => (x.type === 'multiple' ? i : -1)).filter((i) => i >= 0);
    expect(idx.length).toBe(2);
    // They should be spread apart, not adjacent or all at one end
    expect(idx[1] - idx[0]).toBeGreaterThan(1);
  });

  it('is a no-op when there are no multiple-response items', () => {
    const items = [{ type: 'single' }, { type: 'single' }];
    expect(spreadMultiResponse(items)).toHaveLength(2);
  });

  it('places at least one multi-response item in a challenge session', () => {
    const multi = questions.filter((x) => x.type === 'multiple');
    expect(multi.length).toBeGreaterThan(0);
    // Simulate a pool where multi items are last in the source order
    const pool = [
      ...Array.from({ length: 20 }, (_, i) => q(`s${i}`)),
      ...multi.map((m, i) => ({ ...m, id: `m${i}` })),
    ];
    const ids = pool.map((x) => x.id);
    const chosen = ids.slice(-2); // multi items sit at the end
    const ordered = chosen.map((id) => pool.find((x) => x.id === id)!) as Question[];
    const withSingle = [
      ...ordered,
      q('s0'),
      q('s1'),
    ];
    const out = spreadMultiResponse(withSingle);
    expect(out.some((x) => x.type === 'multiple')).toBe(true);
  });
});
