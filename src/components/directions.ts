import type { Direction } from '../domain/types';

export const DIRECTION_LABEL: Record<Direction, string> = {
  left: 'Swipe left',
  right: 'Swipe right',
  up: 'Swipe up',
  down: 'Swipe down',
};

export const DIRECTION_ARROW: Record<Direction, string> = {
  left: '←',
  right: '→',
  up: '↑',
  down: '↓',
};

/** Colour token for each direction, matching the mock reference pills. */
export function directionColor(d: Direction): string {
  return `var(--dir-${d})`;
}
