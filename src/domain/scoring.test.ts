import { describe, it, expect } from 'vitest';
import { xpForAnswer, updateStreak, milestoneReached, XP_PER_CORRECT, accuracy } from './scoring';
import { gradeAnswer, wrongSelections, missedCorrect } from './grade';
import type { Question } from './types';

function makeQ(over: Partial<Question> = {}): Question {
  return {
    id: 'q',
    domain: 'd1',
    taskStatement: '1.1',
    concept: 'c',
    mode: 'swipe',
    type: 'single',
    prompt: 'p',
    options: [
      { id: 'a', text: 'A', isCorrect: true },
      { id: 'b', text: 'B', isCorrect: false },
      { id: 'c', text: 'C', isCorrect: false },
    ],
    correctCount: 1,
    optionCountRationale: 'r',
    distractorRationale: {},
    explanation: { correct: '', whyWrong: {}, takeaway: '' },
    source: { document: 'd', section: 's' },
    reviewStatus: 'verified',
    ...over,
  };
}

describe('scoring - format fairness', () => {
  it('awards identical XP regardless of option count (no format distortion)', () => {
    for (const n of [2, 3, 4]) {
      expect(xpForAnswer(true, n)).toBe(XP_PER_CORRECT);
    }
    for (const n of [2, 3, 4]) {
      expect(xpForAnswer(false, n)).toBe(0);
    }
  });
});

describe('updateStreak', () => {
  it('increments on correct and resets on incorrect', () => {
    let r = updateStreak(0, 0, true);
    expect(r.streak).toBe(1);
    r = updateStreak(r.streak, r.bestStreak, true);
    expect(r.streak).toBe(2);
    r = updateStreak(r.streak, r.bestStreak, false);
    expect(r.streak).toBe(0);
    // best is retained (never punished)
    expect(r.bestStreak).toBe(2);
  });

  it('reports a new personal best', () => {
    const r = updateStreak(3, 3, true);
    expect(r.bestStreak).toBe(4);
    expect(r.brokeBest).toBe(true);
  });

  it('is not affected by elapsed time (no daily-streak guilt)', () => {
    const r1 = updateStreak(5, 5, true);
    const r2 = updateStreak(5, 5, true);
    expect(r1.streak).toBe(r2.streak);
  });
});

describe('milestoneReached', () => {
  it('fires when a milestone is crossed', () => {
    expect(milestoneReached(5, 4)).toBe(5);
    expect(milestoneReached(5, 5)).toBeNull();
    expect(milestoneReached(4, 3)).toBeNull();
  });

  it('returns the lowest not-yet-celebrated milestone when several are crossed at once', () => {
    // Jumping from 4 to 11 crosses 5 and 10; we celebrate the smallest first
    // so no milestone is ever skipped silently.
    expect(milestoneReached(11, 4)).toBe(5);
    expect(milestoneReached(60, 0)).toBe(5);
    expect(milestoneReached(60, 5)).toBe(10);
  });
});

describe('accuracy', () => {
  it('returns null when nothing answered', () => {
    expect(accuracy(0, 0)).toBeNull();
    expect(accuracy(5, 10)).toBe(0.5);
  });
});

describe('gradeAnswer', () => {
  it('single: correct iff exactly the correct option is selected', () => {
    const q = makeQ();
    expect(gradeAnswer(q, ['a'])).toBe(true);
    expect(gradeAnswer(q, ['b'])).toBe(false);
    expect(gradeAnswer(q, ['a', 'b'])).toBe(false); // extra selection is wrong for single
    expect(gradeAnswer(q, [])).toBe(false);
  });

  it('multiple: correct iff the selected set exactly equals the correct set', () => {
    const q = makeQ({
      type: 'multiple',
      correctCount: 2,
      options: [
        { id: 'a', text: 'A', isCorrect: true },
        { id: 'b', text: 'B', isCorrect: true },
        { id: 'c', text: 'C', isCorrect: false },
        { id: 'd', text: 'D', isCorrect: false },
      ],
    });
    expect(gradeAnswer(q, ['a', 'b'])).toBe(true);
    expect(gradeAnswer(q, ['a'])).toBe(false); // missed one
    expect(gradeAnswer(q, ['a', 'b', 'c'])).toBe(false); // extra
    expect(gradeAnswer(q, ['a', 'c'])).toBe(false); // wrong one
  });
});

describe('wrongSelections / missedCorrect', () => {
  it('identifies wrong picks and missed correct answers', () => {
    const q = makeQ();
    expect(wrongSelections(q, ['b'])).toEqual(['b']);
    expect(wrongSelections(q, ['a'])).toEqual([]);
    expect(missedCorrect(q, ['b'])).toEqual(['a']);
    expect(missedCorrect(q, ['a'])).toEqual([]);
  });
});
