import { describe, it, expect } from 'vitest';
import { presentationRows, letterMap } from './presentation';
import { buildDirectionAssignment } from './rng';
import type { Direction } from './types';

const optionIds = ['a', 'b', 'c', 'd'];

describe('presentationRows', () => {
  it('orders swipe rows by the randomised direction assignment', () => {
    const assignment = buildDirectionAssignment(optionIds, 'seed');
    const rows = presentationRows(optionIds, assignment, 'seed');
    expect(rows).toHaveLength(4);
    expect(new Set(rows.map((r) => r.optionId)).size).toBe(4);
    for (const r of rows) expect(assignment[r.direction!]).toBe(r.optionId);
  });

  it('assigns letters A, B, C, D by visual order', () => {
    const assignment = buildDirectionAssignment(optionIds, 'seed');
    const rows = presentationRows(optionIds, assignment, 'seed');
    expect(rows.map((r) => r.letter)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('is stable for a given seed and varies across seeds', () => {
    const a1 = buildDirectionAssignment(optionIds, 's1');
    expect(presentationRows(optionIds, a1, 's1')).toEqual(presentationRows(optionIds, a1, 's1'));
    const sigs = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const asg = buildDirectionAssignment(optionIds, `s${i}`);
      sigs.add(presentationRows(optionIds, asg, `s${i}`).map((r) => r.optionId).join(','));
    }
    expect(sigs.size).toBeGreaterThan(2);
  });

  it('never lets the letter reveal correctness: the correct option is not always A', () => {
    // Simulate the correct answer always being option 'a'.
    const lettersForCorrect = new Map<string, number>();
    for (let i = 0; i < 200; i++) {
      const asg = buildDirectionAssignment(optionIds, `t${i}`);
      const rows = presentationRows(optionIds, asg, `t${i}`);
      const row = rows.find((r) => r.optionId === 'a')!;
      lettersForCorrect.set(row.letter, (lettersForCorrect.get(row.letter) ?? 0) + 1);
    }
    // The correct option should spread across the letters, not pin to one.
    expect(lettersForCorrect.size).toBe(4);
  });

  it('multiple-response uses the authored order and has no directions', () => {
    const rows = presentationRows(['x', 'y', 'z'], {} as Record<Direction, string>, 'seed', true);
    expect(rows.map((r) => r.optionId)).toEqual(['x', 'y', 'z']);
    expect(rows.map((r) => r.letter)).toEqual(['A', 'B', 'C']);
    expect(rows.every((r) => r.direction === undefined)).toBe(true);
  });
});

describe('letterMap', () => {
  it('maps optionId to its display letter', () => {
    const rows = [
      { optionId: 'a', letter: 'A' },
      { optionId: 'b', letter: 'B' },
    ];
    expect(letterMap(rows)).toEqual({ a: 'A', b: 'B' });
  });
});
