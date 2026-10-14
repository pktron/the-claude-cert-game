import type { DomainId, ProgressState, Question, QuestionState } from './types';
import { applyAnswer, emptyQuestionState, isDue } from './schedule';

export const PROGRESS_VERSION = 1;

export function emptyProgress(): ProgressState {
  return {
    version: PROGRESS_VERSION,
    xpTotal: 0,
    personalBestStreak: 0,
    currentStreak: 0,
    cardsCompleted: 0,
    sessionsCompleted: 0,
    lastStudiedAt: null,
    questions: {},
    flagged: {},
  };
}

export function getQuestionState(
  progress: ProgressState,
  questionId: string,
): QuestionState {
  return progress.questions[questionId] ?? emptyQuestionState(questionId);
}

/** Fold one graded answer into progress. Returns a NEW progress object. */
export function recordAnswer(
  progress: ProgressState,
  question: Question,
  correct: boolean,
  meta: { wasGuess?: boolean; confidence?: 'confident' | 'unsure' } = {},
  now: number,
  xpGained: number,
  newStreak: number,
  newBestStreak: number,
): ProgressState {
  const prev = getQuestionState(progress, question.id);
  const nextQState = applyAnswer(prev, correct, now, meta);

  return {
    ...progress,
    xpTotal: progress.xpTotal + xpGained,
    currentStreak: newStreak,
    personalBestStreak: Math.max(progress.personalBestStreak, newBestStreak),
    cardsCompleted: progress.cardsCompleted + 1,
    lastStudiedAt: now,
    questions: { ...progress.questions, [question.id]: nextQState },
  };
}

export function markSessionComplete(progress: ProgressState, now: number): ProgressState {
  return { ...progress, sessionsCompleted: progress.sessionsCompleted + 1, lastStudiedAt: now };
}

export function flagQuestion(
  progress: ProgressState,
  questionId: string,
  now: number,
  note?: string,
): ProgressState {
  return {
    ...progress,
    flagged: { ...progress.flagged, [questionId]: { at: now, note } },
  };
}

// ---------- Derived analytics ----------

export interface DomainStat {
  domain: DomainId;
  answered: number;
  correct: number;
  accuracy: number | null;
  due: number;
  total: number;
}

export function domainStats(
  questions: Question[],
  progress: ProgressState,
  now: number,
): DomainStat[] {
  const byDomain = new Map<DomainId, DomainStat>();
  for (const q of questions) {
    if (!byDomain.has(q.domain)) {
      byDomain.set(q.domain, { domain: q.domain, answered: 0, correct: 0, accuracy: null, due: 0, total: 0 });
    }
    const s = byDomain.get(q.domain)!;
    s.total += 1;
    const qs = progress.questions[q.id];
    if (qs) {
      s.answered += qs.attempts;
      s.correct += qs.correctCount;
      if (isDue(qs, now)) s.due += 1;
    }
  }
  for (const s of byDomain.values()) {
    s.accuracy = s.answered > 0 ? s.correct / s.answered : null;
  }
  return [...byDomain.values()];
}

/** Concepts with the weakest accuracy that have been attempted (need more practice). */
export interface WeakConcept {
  concept: string;
  domain: DomainId;
  answered: number;
  correct: number;
  accuracy: number;
}

export function weakConcepts(
  questions: Question[],
  progress: ProgressState,
  minAttempts = 2,
  limit = 8,
): WeakConcept[] {
  const map = new Map<string, WeakConcept>();
  for (const q of questions) {
    const qs = progress.questions[q.id];
    if (!qs || qs.attempts < minAttempts) continue;
    const entry = map.get(q.concept) ?? {
      concept: q.concept,
      domain: q.domain,
      answered: 0,
      correct: 0,
      accuracy: 0,
    };
    entry.answered += qs.attempts;
    entry.correct += qs.correctCount;
    map.set(q.concept, entry);
  }
  const list = [...map.values()].map((c) => ({
    ...c,
    accuracy: c.answered > 0 ? c.correct / c.answered : 0,
  }));
  list.sort((a, b) => a.accuracy - b.accuracy || b.answered - a.answered);
  return list.slice(0, limit);
}

/** Count of correct answers that came after their due date (true delayed recall). */
export function delayedRecallStats(progress: ProgressState): {
  delayedCorrect: number;
  totalCorrect: number;
} {
  let delayedCorrect = 0;
  let totalCorrect = 0;
  for (const qs of Object.values(progress.questions)) {
    for (const h of qs.history) {
      if (h.correct) {
        totalCorrect += 1;
        if (h.wasDelayed) delayedCorrect += 1;
      }
    }
  }
  return { delayedCorrect, totalCorrect };
}

/** Overall deck completion: distinct questions seen at least once / total. */
export function deckCompletion(questions: Question[], progress: ProgressState): {
  seen: number;
  total: number;
  ratio: number;
} {
  const seen = questions.filter((q) => (progress.questions[q.id]?.attempts ?? 0) > 0).length;
  const total = questions.length;
  return { seen, total, ratio: total > 0 ? seen / total : 0 };
}
