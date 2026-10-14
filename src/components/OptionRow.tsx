import type { Direction } from '../domain/types';
import { DIRECTION_LABEL, directionColor } from './directions';

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
  const accent = state === 'idle' || state === 'selected' ? directionColor(direction!) : STATE_BORDER[state];
  const pillBg =
    state === 'correct'
      ? 'var(--success)'
      : state === 'incorrect'
        ? 'var(--danger)'
        : state === 'missed'
          ? 'var(--warning)'
          : directionColor(direction!);

  const dirWord = direction ? DIRECTION_LABEL[direction].replace('Swipe ', '') : '';

  const dirHint = direction && showDirectionHint ? DIRECTION_LABEL[direction] : '';
  // Keep the accessible name aligned with the visible label text (the pill letter
  // and the accent bar are decorative) so screen readers and voice control agree.
  const accessibleName = dirHint ? `${text}. ${dirHint}` : text;

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
          fontSize: multi ? 18 : 20,
        }}
      >
        {multi ? (state === 'selected' ? '✓' : letter) : letter}
      </span>

      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 'var(--fs-md)' }}>{text}</span>
        {direction && showDirectionHint && (
          <span
            style={{
              display: 'block',
              fontSize: 'var(--fs-xs)',
              color: 'var(--text-dim)',
              marginTop: 2,
            }}
          >
            {DIRECTION_LABEL[direction]}
          </span>
        )}
        {direction && !showDirectionHint && state === 'idle' && (
          <span style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--text-dim)', marginTop: 2 }}>
            <span aria-hidden="true">{'{'} {dirWord} {'}'}</span>
          </span>
        )}
      </span>

      {/* Focusable tap target parity: the whole row is a button, this is decorative accent */}
      <span aria-hidden="true" style={{ width: 4, alignSelf: 'stretch', background: accent, borderRadius: 4, opacity: 0.5 }} />
    </button>
  );
}
