import { describe, it, expect } from 'vitest';
import { applyAnswer, emptyQuestionState, intervalForBox, isDue, MAX_BOX } from './schedule';

const DAY = 24 * 60 * 60 * 1000;

describe('applyAnswer', () => {
  it('promotes the box and extends the interval on a correct answer', () => {
    let s = emptyQuestionState('q1');
    const now = 1_000_000;
    s = applyAnswer(s, true, now);
    expect(s.attempts).toBe(1);
    expect(s.correctCount).toBe(1);
    expect(s.box).toBe(1);
    // interval from box 1 = 1 day
    expect(s.dueAt).toBe(now + 1 * DAY);

    const later = now + 1 * DAY;
    s = applyAnswer(s, true, later);
    expect(s.box).toBe(2);
    expect(s.dueAt).toBe(later + 3 * DAY);
  });

  it('demotes to box 1 on an incorrect answer so it returns sooner', () => {
    let s = emptyQuestionState('q1');
    s = applyAnswer(s, true, 0); // -> box1
    s = applyAnswer(s, true, DAY); // -> box2
    expect(s.box).toBe(2);
    const now = DAY + DAY;
    s = applyAnswer(s, false, now);
    expect(s.box).toBe(1);
    expect(s.dueAt).toBe(now + 1 * DAY);
    expect(s.incorrectCount).toBe(1);
  });

  it('does not erase history on an incorrect answer', () => {
    let s = emptyQuestionState('q1');
    s = applyAnswer(s, true, 0);
    s = applyAnswer(s, false, 1);
    expect(s.attempts).toBe(2);
    expect(s.correctCount).toBe(1);
    expect(s.history).toHaveLength(2);
  });

  it('flags delayed recall when a correct answer happens at/after the due date', () => {
    let s = emptyQuestionState('q1');
    s = applyAnswer(s, true, 0); // box1 due at +1day
    // Answer late (after due)
    const late = 5 * DAY;
    s = applyAnswer(s, true, late);
    expect(s.lastWasDelayedRecall).toBe(true);

    // Answer early (before due) -> not delayed
    let s2 = emptyQuestionState('q2');
    s2 = applyAnswer(s2, true, 0);
    s2 = applyAnswer(s2, true, 1); // 1ms, way before due (+1day)
    expect(s2.lastWasDelayedRecall).toBe(false);
  });

  it('caps the box at MAX_BOX so the interval does not run away', () => {
    let s = emptyQuestionState('q1');
    let now = 0;
    for (let i = 0; i < 20; i++) {
      s = applyAnswer(s, true, now);
      now = s.dueAt!;
    }
    expect(s.box).toBe(MAX_BOX);
  });

  it('records an optional guess flag', () => {
    let s = emptyQuestionState('q1');
    s = applyAnswer(s, true, 0, { wasGuess: true });
    expect(s.lastWasGuess).toBe(true);
    expect(s.lastConfidence).toBeUndefined();
    s = applyAnswer(s, true, 1, { confidence: 'confident' });
    expect(s.lastConfidence).toBe('confident');
  });
});

describe('intervalForBox', () => {
  it('returns 0 for box 0 and grows with the box', () => {
    expect(intervalForBox(0)).toBe(0);
    expect(intervalForBox(1)).toBe(1 * DAY);
    expect(intervalForBox(2)).toBe(3 * DAY);
    expect(intervalForBox(MAX_BOX)).toBe(35 * DAY);
  });
});

describe('isDue', () => {
  it('treats unseen and box-0 items as due', () => {
    expect(isDue(emptyQuestionState('new'), 0)).toBe(true);
  });

  it('is not due before the due date, due after', () => {
    const s = { ...emptyQuestionState('q'), attempts: 1, dueAt: 1000 };
    expect(isDue(s, 999)).toBe(false);
    expect(isDue(s, 1000)).toBe(true);
    expect(isDue(s, 5000)).toBe(true);
  });
});
