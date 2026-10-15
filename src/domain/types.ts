/**
 * Core domain types for The Claude Cert Game.
 * These mirror content/schema/README.md and are shared by UI, storage, and tests.
 */

export type DomainId = 'd1' | 'd2' | 'd3' | 'd4' | 'd5';
export type QuestionMode = 'swipe' | 'challenge';
export type QuestionType = 'single' | 'multiple';
export type Direction = 'left' | 'right' | 'up' | 'down';
export type ReviewStatus = 'verified' | 'needs-review';

export const ALL_DIRECTIONS: Direction[] = ['left', 'right', 'up', 'down'];

export interface Domain {
  id: DomainId;
  name: string;
  weight: number; // exam weight percent
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Explanation {
  correct: string;
  whyWrong: Record<string, string>;
  analogy?: string;
  takeaway: string;
  deepDive?: string;
}

export interface Source {
  document: string;
  section: string;
  page?: number;
  /** Verbatim sentence(s) from the official guide that ground this question. */
  quotes?: string[];
}

export interface Question {
  id: string;
  domain: DomainId;
  taskStatement: string;
  scenario?: string | null;
  concept: string;
  mode: QuestionMode;
  type: QuestionType;
  prompt: string;
  options: QuestionOption[];
  correctCount: number;
  optionCountRationale: string;
  distractorRationale: Record<string, string>;
  explanation: Explanation;
  source: Source;
  reviewStatus: ReviewStatus;
}

export interface Deck {
  deckId: string;
  title: string;
  examCode: string;
  domains: Domain[];
  questions: Question[];
}

// ---------- Per-question learning state (spaced repetition + analytics) ----------

export interface QuestionState {
  questionId: string;
  attempts: number;
  correctCount: number;
  incorrectCount: number;
  lastAnsweredAt: number | null;
  lastCorrectAt: number | null;
  /** Leitner box index; higher = longer interval. */
  box: number;
  /** Epoch ms when this question is next due for recall. */
  dueAt: number | null;
  /** True if the last correct came with a delay (recalled after forgetting window). */
  lastWasDelayedRecall: boolean;
  /** Optional learner self-report. */
  lastWasGuess?: boolean;
  lastConfidence?: 'confident' | 'unsure';
  /** rolling history of {at, correct, wasDelayed} */
  history: Array<{ at: number; correct: boolean; wasDelayed: boolean }>;
}

// ---------- Session (a study run) ----------

export type SessionMode = 'discover' | 'challenge' | 'recall';

export interface SessionCard {
  questionId: string;
  /** Randomly assigned directions for this presentation (answer->direction is re-randomized). */
  directionAssignment: Record<Direction, string>; // direction -> optionId
  committed: boolean;
  selectedOptionIds: string[]; // empty until committed (single) or current selection (multiple)
  correct: boolean | null;
}

export interface SessionConfig {
  mode: SessionMode;
  targetLength: number;
  domainFilter?: DomainId[] | 'all';
}

export interface SessionState {
  id: string;
  config: SessionConfig;
  queue: string[]; // question ids, in order
  cards: Record<string, SessionCard>;
  cursor: number;
  startedAt: number;
  endedAt?: number;
  // scoring
  answered: number;
  correctTotal: number;
  streak: number; // consecutive correct within this session
  bestStreak: number;
  xp: number;
}

// ---------- Global progress ----------

export interface DomainProgress {
  domain: DomainId;
  answered: number;
  correct: number;
}

export interface ProgressState {
  version: number;
  xpTotal: number;
  personalBestStreak: number;
  /** last session's ending streak (soft, never punished by time) */
  currentStreak: number;
  cardsCompleted: number;
  sessionsCompleted: number;
  lastStudiedAt: number | null;
  questions: Record<string, QuestionState>;
  /** questionId -> learner-reported problem flag */
  flagged: Record<string, { at: number; note?: string }>;
}
