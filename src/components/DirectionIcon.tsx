import type { Direction } from '../domain/types';
import { DIRECTION_ARROW } from './directions';

interface Props {
  direction: Direction;
  className?: string;
  size?: number;
}

export function DirectionIcon({ direction, className, size = 22 }: Props) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        fontSize: size * 0.62,
        lineHeight: 1,
        fontWeight: 800,
      }}
    >
      {DIRECTION_ARROW[direction]}
    </span>
  );
}
