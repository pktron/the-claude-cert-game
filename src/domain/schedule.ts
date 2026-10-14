import type { QuestionState } from './types';

/**
 * Leitner-style spaced repetition.
 * Intervals in days by box. Index = current box.
 * Wrong answer -> demote (come back sooner). Correct -> promote (extend interval).
 * Deliberately simple and forgiving: no punitive resets, never erases earned progress.
 */
export const INTERVALS_DAYS = [0, 1, 3, 7, 16, 35];
const DAY_MS = 24 * 60 * 60 * 1000;

export const MAX_BOX = INTERVALS_DAYS.length - 1;

export function emptyQuestionState(questionId: string): QuestionState {
  return {
    questionId,
    attempts: 0,
    correctCount: 0,
    incorrectCount: 0,
    lastAnsweredAt: null,
    lastCorrectAt: null,
    box: 0,
    dueAt: null, // null = new/unseen, due immediately
    lastWasDelayedRecall: false,
    lastWasGuess: false,
    history: [],
  };
}

/** Interval (ms) for a box. Box 0 = immediately due. */
export function intervalForBox(box: number): number {
  const b = Math.max(0, Math.min(MAX_BOX, box));
  return INTERVALS_DAYS[b] * DAY_MS;
}

/**
 * Record an answer against a question's state, returning the NEW state.
 * A correct answer promotes the box and schedules the next recall.
 * An incorrect answer demotes to box 1 (returns tomorrow) and schedules sooner.
 */
export function applyAnswer(
  prev: QuestionState,
  correct: boolean,
  now: number,
  meta: { wasGuess?: boolean; confidence?: 'confident' | 'unsure' } = {},
): QuestionState {
  const attempts = prev.attempts + 1;
  const correctCount = prev.correctCount + (correct ? 1 : 0);
  const incorrectCount = prev.incorrectCount + (correct ? 0 : 1);

  // Delayed recall = this correct came at/after its scheduled due time.
  const wasDelayed = correct && prev.dueAt != null && now >= prev.dueAt;

  let box: number;
  if (correct) {
    // Promote, but a guess-correct counts as a weaker signal (do not advance as far).
    const guessPenalty = meta.wasGuess ? 0 : 0;
    box = Math.min(MAX_BOX, prev.box + 1 + guessPenalty);
  } else {
    // Demote toward box 1 so it comes back soon, without erasing history.
    box = 1;
  }

  const dueAt = now + intervalForBox(box);

  const next: QuestionState = {
    ...prev,
    attempts,
    correctCount,
    incorrectCount,
    lastAnsweredAt: now,
    lastCorrectAt: correct ? now : prev.lastCorrectAt,
    box,
    dueAt,
    lastWasDelayedRecall: wasDelayed,
    lastWasGuess: meta.wasGuess ?? prev.lastWasGuess,
    lastConfidence: meta.confidence ?? prev.lastConfidence,
    history: [...prev.history, { at: now, correct, wasDelayed }],
  };
  return next;
}

/** Is this question due for recall at `now`? */
export function isDue(state: QuestionState, now: number): boolean {
  if (state.attempts === 0) return true; // never seen
  if (state.dueAt == null) return true;
  return now >= state.dueAt;
}
