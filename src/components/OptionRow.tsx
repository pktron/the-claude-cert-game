import type { Direction } from '../domain/types';
import { DIRECTION_ARROW, DIRECTION_LABEL, directionColor } from './directions';

export type OptionVisualState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'missed';

interface Props {
  optionId: string;
  letter: string;
  text: string;
  state: OptionVisualState;
  direction?: Direction;
  showDirectionHint: boolean;
  onSelect: (optionId: string) => void;
  disabled?: boolean;
  multi?: boolean;
}

const STATE_BORDER: Record<OptionVisualState, string> = {
  idle: 'var(--border)',
  selected: 'var(--blue)',
  correct: 'var(--success)',
  incorrect: 'var(--danger)',
  missed: 'var(--warning)',
};

export function OptionRow({
  optionId,
  letter,
  text,
  state,
  direction,
  showDirectionHint,
  onSelect,
  disabled = false,
  multi = false,
}: Props) {
  // Once the answer is committed the row takes the verdict colour; while it is
  // still live it carries its swipe direction's colour.
  const pillBg =
    state === 'correct'
      ? 'var(--success)'
      : state === 'incorrect'
        ? 'var(--danger)'
        : state === 'missed'
          ? 'var(--warning)'
          : direction
            ? directionColor(direction)
            : 'var(--surface-2)';

  const hint = direction && showDirectionHint ? DIRECTION_LABEL[direction] : '';
  const labelled = `${letter}. ${text}`;
  // The pill glyph is decorative, so the accessible name mirrors the visible
  // text exactly (letter, answer, and the direction hint). Avoid doubling up
  // sentence punctuation when the answer already ends in a full stop.
  const separator = /[.!?:]$/.test(text.trim()) ? ' ' : '. ';
  const accessibleName = hint ? `${labelled}${separator}${hint}` : labelled;

  return (
    <button
      type="button"
      className="option-row"
      data-option-id={optionId}
      data-state={state}
      disabled={disabled}
      onClick={() => onSelect(optionId)}
      aria-label={accessibleName}
      aria-pressed={multi ? state === 'selected' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-3)',
        width: '100%',
        textAlign: 'left',
        padding: 'var(--sp-3)',
        borderRadius: 'var(--radius)',
        background:
          state === 'correct'
            ? 'var(--success-dim)'
            : state === 'incorrect'
              ? 'var(--danger-dim)'
              : state === 'missed'
                ? 'rgba(245,158,11,0.12)'
                : 'var(--surface)',
        border: `1px solid ${STATE_BORDER[state]}`,
        opacity: disabled && state === 'idle' ? 0.75 : 1,
        cursor: disabled ? 'default' : 'pointer',
        minHeight: 64,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-pill)',
          background: pillBg,
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 22,
          lineHeight: 1,
        }}
      >
        {multi ? (state === 'selected' ? '✓' : letter) : direction ? DIRECTION_ARROW[direction] : letter}
      </span>

      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 'var(--fs-md)' }}>{labelled}</span>
        {hint && (
          <span
            style={{
              display: 'block',
              fontSize: 'var(--fs-xs)',
              color: 'var(--text-dim)',
              marginTop: 2,
            }}
          >
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}
