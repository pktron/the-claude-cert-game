import { directionRows } from './rng';
import type { Direction } from './types';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export interface PresentationRow {
  direction?: Direction;
  optionId: string;
  /** Display letter, assigned by visual order (never by correctness). */
  letter: string;
}

/**
 * The visual order of a card's options, plus the letter shown next to each one.
 *
 * For swipe cards the order comes from the randomised direction assignment, so
 * the letters move around between presentations and never encode the answer.
 * For multiple-response cards the authored order is used and there is no
 * direction (there is nothing to swipe).
 */
export function presentationRows(
  optionIds: string[],
  assignment: Record<Direction, string>,
  seedKey: string,
  multi = false,
): PresentationRow[] {
  if (multi) {
    return optionIds.map((optionId, i) => ({ optionId, letter: LETTERS[i] ?? `${i + 1}` }));
  }
  return directionRows(assignment, seedKey).map((r, i) => ({
    direction: r.direction,
    optionId: r.optionId,
    letter: LETTERS[i] ?? `${i + 1}`,
  }));
}

/** optionId -> display letter, for labelling a card on the feedback screen. */
export function letterMap(rows: PresentationRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) out[r.optionId] = r.letter;
  return out;
}
