import { isDue } from './schedule';
import { buildDirectionAssignment, mulberry32, hashSeed, shuffled } from './rng';
import type {
  DomainId,
  ProgressState,
  Question,
  QuestionState,
  SessionCard,
  SessionConfig,
  SessionMode,
  SessionState,
} from './types';

export const SESSION_PRESETS: Record<SessionMode, { label: string; length: number }> = {
  discover: { label: 'Discover', length: 10 },
  challenge: { label: 'Challenge', length: 10 },
  recall: { label: 'Recall', length: 10 },
};

export function questionPool(
  questions: Question[],
  mode: SessionMode,
  domainFilter: DomainId[] | 'all' = 'all',
): Question[] {
  let pool = questions;
  if (domainFilter !== 'all') pool = pool.filter((q) => domainFilter.includes(q.domain));
  if (mode === 'discover') {
    // Discover = the swipe loop. Single-answer, swipe-mode items only.
    pool = pool.filter((q) => q.mode === 'swipe');
  } else if (mode === 'challenge') {
    // Challenge = certification-style, includes multiple-response.
    pool = pool.filter((q) => q.mode === 'challenge' || q.mode === 'swipe');
  } else {
    // Recall draws from everything (varied wording tests the same concepts).
    // No additional filtering required.
  }
  return pool;
}

/**
 * Prioritise the queue for a session.
 *
 * Recall mode surfaces, in priority order:
 *   1. items the learner got WRONG (come back sooner)
 *   2. items due for spaced repetition
 *   3. unseen items
 * Interleave domains lightly so a session does not feel monotonous.
 */
export function buildQueue(
  questions: Question[],
  progress: ProgressState,
  config: SessionConfig,
  now: number,
): string[] {
  const pool = questionPool(questions, config.mode, config.domainFilter);
  const rng = mulberry32(hashSeed(`${config.mode}:${now}:${config.targetLength}`));

  const stateOf = (id: string): QuestionState =>
    progress.questions[id] ?? {
      questionId: id,
      attempts: 0,
      correctCount: 0,
      incorrectCount: 0,
      lastAnsweredAt: null,
      lastCorrectAt: null,
      box: 0,
      dueAt: null,
      lastWasDelayedRecall: false,
      history: [],
    };

  const wrong: Question[] = [];
  const due: Question[] = [];
  const unseen: Question[] = [];
  const other: Question[] = [];

  for (const q of pool) {
    const s = stateOf(q.id);
    if (s.attempts === 0) unseen.push(q);
    else if (s.lastAnsweredAt != null && !s.history.at(-1)?.correct) wrong.push(q);
    else if (isDue(s, now)) due.push(q);
    else other.push(q);
  }

  // Within a priority bucket, least-recently-seen first (more overdue first).
  const byLeastRecent = (a: Question, b: Question) =>
    (stateOf(a.id).lastAnsweredAt ?? 0) - (stateOf(b.id).lastAnsweredAt ?? 0);

  wrong.sort(byLeastRecent);
  due.sort(byLeastRecent);

  // Interleave domains INSIDE each priority bucket. Interleaving the buckets
  // themselves would let a low-priority (unseen) card jump ahead of a missed
  // one, which would break the "wrong answers come back sooner" guarantee.
  const ordered = [
    ...interleaveDomains(shuffled(wrong, rng), rng),
    ...interleaveDomains(shuffled(due, rng), rng),
    ...interleaveDomains(shuffled(unseen, rng), rng),
    ...interleaveDomains(shuffled(other, rng), rng),
  ];

  const sliced = ordered.slice(0, config.targetLength);

  if (config.mode !== 'challenge') return sliced.map((q) => q.id);

  // Challenge mode must actually show off multi-response items. They are rare in
  // the deck (a handful out of ~100) and would otherwise almost never survive
  // the priority ordering into a 5-20 card session, so we reserve slots for them
  // while still taking them from the top of the priority order.
  const wantMulti = Math.max(
    1,
    Math.round(config.targetLength / 3),
  );
  const multiAvail = ordered.filter((q) => q.type === 'multiple');
  const multiPicked = multiAvail.slice(0, Math.min(wantMulti, multiAvail.length));
  const pickedIds = new Set(multiPicked.map((q) => q.id));
  const singles = ordered.filter((q) => !pickedIds.has(q.id));
  const room = Math.max(0, config.targetLength - multiPicked.length);
  const combined = spreadMultiResponse([...singles.slice(0, room), ...multiPicked]);
  return combined.slice(0, config.targetLength).map((q) => q.id);
}

/**
 * Evenly distribute multiple-response items through a Challenge session so the
 * learner meets them regularly instead of by luck.
 */
export function spreadMultiResponse<T extends { type: string }>(ordered: T[], ratio = 1 / 3): T[] {
  const multi = ordered.filter((q) => q.type === 'multiple');
  const single = ordered.filter((q) => q.type !== 'multiple');
  if (multi.length === 0) return ordered;

  const target = Math.min(multi.length, Math.max(1, Math.round(ordered.length * ratio)));
  if (target === 0) return ordered;

  const gap = Math.max(1, Math.ceil(single.length / target));
  const out: T[] = [];
  let mi = 0;
  for (let i = 0; i < single.length; i++) {
    out.push(single[i]);
    if (mi < target && (i + 1) % gap === 0) out.push(multi[mi++]);
  }
  while (mi < target) out.push(multi[mi++]);
  return out;
}

function interleaveDomains(ordered: Question[], rng: () => number): Question[] {
  const buckets = new Map<DomainId, Question[]>();
  for (const q of ordered) {
    if (!buckets.has(q.domain)) buckets.set(q.domain, []);
    buckets.get(q.domain)!.push(q);
  }
  const keys = shuffled([...buckets.keys()], rng);
  const out: Question[] = [];
  while (out.length < ordered.length) {
    let progressed = false;
    for (const k of keys) {
      const b = buckets.get(k)!;
      if (b.length) {
        out.push(b.shift()!);
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return out;
}

/** Fresh per-presentation direction assignment; re-randomized every time a card is shown. */
export function makeCard(question: Question, presentationSeed: string): SessionCard {
  return {
    questionId: question.id,
    directionAssignment: buildDirectionAssignment(
      question.options.map((o) => o.id),
      `${question.id}:${presentationSeed}`,
    ),
    committed: false,
    selectedOptionIds: [],
    correct: null,
  };
}

export function createSession(
  questions: Question[],
  progress: ProgressState,
  config: SessionConfig,
  now: number,
): SessionState {
  const queue = buildQueue(questions, progress, config, now);
  return {
    id: `s-${now.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    config,
    queue,
    cards: {},
    cursor: 0,
    startedAt: now,
    answered: 0,
    correctTotal: 0,
    streak: 0,
    bestStreak: 0,
    xp: 0,
  };
}

export function currentQuestionId(session: SessionState): string | null {
  return session.queue[session.cursor] ?? null;
}

export function isSessionComplete(session: SessionState): boolean {
  return session.cursor >= session.queue.length;
}
