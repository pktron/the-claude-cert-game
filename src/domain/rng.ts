import { ALL_DIRECTIONS, type Direction } from './types';

/** Deterministic, fast PRNG (mulberry32). Seeded so a card's direction assignment is stable within a presentation. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a string to a 32-bit seed. */
export function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffled<T>(arr: readonly T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Choose `count` distinct directions out of the 4, using a seeded RNG.
 * For a 3-option question this picks 3 of {left,right,up,down} at random so the
 * correct answer is never tied to a direction or an array index.
 */
export function pickDirections(count: number, rng: () => number): Direction[] {
  if (count < 1 || count > ALL_DIRECTIONS.length) {
    throw new Error(`pickDirections: count must be 1..${ALL_DIRECTIONS.length}, got ${count}`);
  }
  return shuffled(ALL_DIRECTIONS, rng).slice(0, count);
}

/**
 * Build a direction->optionId assignment for a presentation.
 * Both the chosen directions AND the option order are randomized, so the
 * correct option can land in any direction and any visual slot.
 * The correct option is NOT given special treatment.
 */
export function buildDirectionAssignment(
  optionIds: string[],
  seedKey: string,
): Record<Direction, string> {
  const rng = mulberry32(hashSeed(seedKey));
  const shuffledOptions = shuffled(optionIds, rng);
  const dirs = pickDirections(shuffledOptions.length, rng);
  const assignment = {} as Record<Direction, string>;
  shuffledOptions.forEach((optionId, i) => {
    assignment[dirs[i]] = optionId;
  });
  return assignment;
}

/**
 * Order the assigned directions into display rows, shuffled with the same seed
 * so the visual row order is stable within a presentation but not fixed across
 * presentations. Unused directions simply do not appear.
 */
export function directionRows(
  assignment: Record<Direction, string>,
  seedKey: string,
): Array<{ direction: Direction; optionId: string }> {
  const used = ALL_DIRECTIONS.filter((d) => assignment[d] != null);
  const rng = mulberry32(hashSeed(seedKey + ':rows'));
  return shuffled(used, rng).map((direction) => ({
    direction,
    optionId: assignment[direction],
  }));
}

