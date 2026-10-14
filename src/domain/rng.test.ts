import { describe, it, expect } from 'vitest';
import { buildDirectionAssignment, pickDirections, directionRows, mulberry32, hashSeed } from './rng';
import { ALL_DIRECTIONS, type Direction } from './types';

describe('pickDirections', () => {
  it('returns exactly the requested count of distinct directions', () => {
    for (const n of [2, 3, 4]) {
      const dirs = pickDirections(n, mulberry32(123));
      expect(dirs).toHaveLength(n);
      expect(new Set(dirs).size).toBe(n);
      for (const d of dirs) expect(ALL_DIRECTIONS).toContain(d);
    }
  });

  it('never returns more than 4', () => {
    expect(() => pickDirections(5, mulberry32(1))).toThrow();
  });

  it('actually varies the chosen directions across seeds (not always the same set)', () => {
    const sets = new Set<string>();
    for (let s = 0; s < 40; s++) {
      sets.add(pickDirections(3, mulberry32(s)).slice().sort().join(','));
    }
    // There are 4 possible 3-of-4 sets; we should hit several, not just one.
    expect(sets.size).toBeGreaterThan(2);
  });
});

describe('buildDirectionAssignment', () => {
  const optionIds = ['a', 'b', 'c', 'd'];

  it('assigns every option to exactly one direction, and leaves one direction unused for 3 options', () => {
    const assignment = buildDirectionAssignment(['a', 'b', 'c'], 'seed-1');
    const values = Object.values(assignment);
    expect(values).toHaveLength(3);
    expect(new Set(values).size).toBe(3);
    expect(values.sort()).toEqual(['a', 'b', 'c']);
  });

  it('uses all four directions for a 4-option question', () => {
    const assignment = buildDirectionAssignment(optionIds, 'seed-2');
    expect(Object.keys(assignment)).toHaveLength(4);
  });

  it('is deterministic for the same seed (stable within a presentation)', () => {
    const a = buildDirectionAssignment(optionIds, 'stable');
    const b = buildDirectionAssignment(optionIds, 'stable');
    expect(a).toEqual(b);
  });

  it('varies the mapping across different seeds', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 30; s++) {
      seen.add(JSON.stringify(buildDirectionAssignment(optionIds, `seed-${s}`)));
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it('does not systematically place the correct option in one direction (correct id is NOT correlated with a fixed direction)', () => {
    // Simulate: "correct" is always option 'a'. Across seeds, 'a' should land in varied directions.
    const counts: Record<Direction, number> = { left: 0, right: 0, up: 0, down: 0 };
    const N = 200;
    for (let s = 0; s < N; s++) {
      const assignment = buildDirectionAssignment(optionIds, `bias-${s}`);
      for (const dir of ALL_DIRECTIONS) {
        if (assignment[dir] === 'a') counts[dir] += 1;
      }
    }
    const expected = N / 4;
    // Each direction should get roughly a quarter. Assert none is wildly over-represented.
    for (const dir of ALL_DIRECTIONS) {
      expect(counts[dir]).toBeGreaterThan(expected * 0.5);
      expect(counts[dir]).toBeLessThan(expected * 1.6);
    }
  });
});

describe('directionRows', () => {
  it('returns only assigned directions, in a shuffled (but seed-stable) order', () => {
    const assignment = buildDirectionAssignment(['a', 'b', 'c'], 'x');
    const rows = directionRows(assignment, 'x');
    expect(rows).toHaveLength(3);
    for (const r of rows) expect(assignment[r.direction]).toBe(r.optionId);
    // stable
    expect(directionRows(assignment, 'x')).toEqual(rows);
  });
});

describe('hashSeed', () => {
  it('is deterministic and in uint32 range', () => {
    const h = hashSeed('hello');
    expect(h).toBe(hashSeed('hello'));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    expect(h).not.toBe(hashSeed('hello!'));
  });
});
