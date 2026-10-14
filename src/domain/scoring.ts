/**
 * Gamification scoring.
 *
 * Design rule from the product spec: changing the NUMBER OF OPTIONS must not
 * distort progress or scoring. Therefore XP is awarded per *correctly answered
 * item* and is deliberately INDEPENDENT of option count and of question mode.
 * A 2-option and a 4-option correct answer are worth the same.
 */

export const XP_PER_CORRECT = 10;

export function xpForAnswer(correct: boolean, _optionCount?: number): number {
  // _optionCount is intentionally unused - see the design rule above.
  return correct ? XP_PER_CORRECT : 0;
}

export interface StreakUpdate {
  streak: number;
  bestStreak: number;
  brokeBest: boolean;
}

/** Advance/reset the consecutive-correct streak. Never punished by elapsed time. */
export function updateStreak(
  current: number,
  best: number,
  correct: boolean,
): StreakUpdate {
  const next = correct ? current + 1 : 0;
  const nextBest = Math.max(best, next);
  return { streak: next, bestStreak: nextBest, brokeBest: nextBest > best };
}

/** Milestones are small, friendly celebrations - never punitive. */
export const MILESTONES = [5, 10, 25, 50, 100, 200];

export function milestoneReached(totalCorrect: number, previousTotalCorrect: number): number | null {
  // Returns the lowest not-yet-celebrated milestone, so jumping several at once
  // never silently skips one.
  for (const m of MILESTONES) {
    if (previousTotalCorrect < m && totalCorrect >= m) return m;
  }
  return null;
}

/** Accuracy as a 0..1 fraction; null when nothing answered yet. */
export function accuracy(correct: number, answered: number): number | null {
  if (answered <= 0) return null;
  return correct / answered;
}
