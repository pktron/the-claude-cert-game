import { useMemo } from 'react';
import type { Direction, Question } from '../domain/types';
import { directionRows } from '../domain/rng';
import { useSwipe, swipeTransform } from '../hooks/useSwipe';
import { OptionRow, type OptionVisualState } from './OptionRow';
import { DIRECTION_LABEL, directionColor } from './directions';

interface Props {
  question: Question;
  presentationSeed: string;
  directionAssignment: Record<Direction, string>;
  selectedOptionIds: string[];
  revealed: boolean;
  committedIds: string[];
  reduceMotion: boolean;
  showDirectionHints: boolean;
  onSwipe: (direction: Direction) => void;
  onTapSelect: (optionId: string) => void;
  /** Renders tap-to-toggle + submit instead of swipe (multiple-response). */
  multi?: boolean;
}

export function SwipeCard({
  question,
  presentationSeed,
  directionAssignment,
  selectedOptionIds,
  revealed,
  committedIds,
  reduceMotion,
  showDirectionHints,
  onSwipe,
  onTapSelect,
  multi = false,
}: Props) {
  const enabledDirections = useMemo(
    () => (Object.keys(directionAssignment) as Direction[]),
    [directionAssignment],
  );
  const rows = useMemo(
    () => (multi ? [] : directionRows(directionAssignment, presentationSeed)),
    [multi, directionAssignment, presentationSeed],
  );

  const handleSwipe = (dir: Direction) => onSwipe(dir);
  const swipe = useSwipe({
    enabledDirections: multi ? [] : enabledDirections,
    onSwipe: handleSwipe,
    disabled: multi || revealed,
  });

  const letters = ['A', 'B', 'C', 'D'];

  function visualState(optionId: string): OptionVisualState {
    const opt = question.options.find((o) => o.id === optionId);
    if (revealed) {
      if (opt?.isCorrect) return 'correct';
      if (committedIds.includes(optionId)) return 'incorrect';
      return 'idle';
    }
    if (multi && selectedOptionIds.includes(optionId)) return 'selected';
    return 'idle';
  }

  // For multiple-response we need every option row, not just assigned directions.
  const multiRows = multi
    ? question.options.map((o) => ({ direction: undefined as Direction | undefined, optionId: o.id }))
    : [];

  const transform = reduceMotion ? undefined : swipeTransform(swipe.dx, swipe.dy);
  const isDragging = !multi && !revealed && (swipe.dx !== 0 || swipe.dy !== 0);

  // Highlight the direction the drag is currently aiming at.
  const aim = !reduceMotion && isDragging ? dragAim(swipe.dx, swipe.dy) : null;

  return (
    <div
      className="swipe-card"
      data-testid="swipe-card"
      data-revealed={revealed}
      onPointerDown={multi ? undefined : swipe.onPointerDown}
      style={{
        transform,
        transition: swipe.active ? 'none' : undefined,
        touchAction: multi ? 'auto' : 'none',
        userSelect: 'none',
      }}
    >
      {/* Aim hints while dragging */}
      {aim && enabledDirections.includes(aim) && (
        <>
          <span className="aim-hint" data-side={aim} style={{ color: directionColor(aim) }} aria-hidden="true">
            {DIRECTION_LABEL[aim]}
          </span>
        </>
      )}

      <div className="q-emoji" aria-hidden="true">
        {question.scenario ? SCENARIO_EMOJI[question.scenario] ?? '🧠' : '🧠'}
      </div>

      <h2 className="q-prompt">{question.prompt}</h2>

      {!multi && (
        <p className="q-sub" style={{ marginTop: 'var(--sp-2)' }}>
          {revealed ? 'Answer locked in' : 'Swipe toward your answer'}
        </p>
      )}
      {multi && (
        <p className="q-sub" style={{ marginTop: 'var(--sp-2)' }}>
          Select {question.correctCount} answer{question.correctCount > 1 ? 's' : ''} — more than one
          may be correct
        </p>
      )}

      <div
        className="options-list"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', marginTop: 'var(--sp-5)' }}
        role="group"
        aria-label="Answer options"
      >
        {multi
          ? multiRows.map((r, i) => (
              <OptionRow
                key={r.optionId}
                optionId={r.optionId}
                letter={letters[i]}
                text={question.options.find((o) => o.id === r.optionId)!.text}
                state={visualState(r.optionId)}
                showDirectionHint={false}
                onSelect={onTapSelect}
                disabled={revealed}
                multi
              />
            ))
          : rows.map((r, i) => (
              <OptionRow
                key={`${r.direction}-${r.optionId}`}
                optionId={r.optionId}
                letter={letters[i]}
                text={question.options.find((o) => o.id === r.optionId)!.text}
                state={visualState(r.optionId)}
                direction={r.direction}
                showDirectionHint={showDirectionHints && !revealed}
                onSelect={onTapSelect}
                disabled={revealed}
              />
            ))}
      </div>

      {!multi && !revealed && (
        <p className="random-note" style={{ marginTop: 'var(--sp-5)', textAlign: 'center', fontSize: 'var(--fs-xs)', color: 'var(--text-dim)' }}>
          Answer positions are randomized · tap an option also works
        </p>
      )}
    </div>
  );
}

function dragAim(dx: number, dy: number): Direction {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax > ay) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

const SCENARIO_EMOJI: Record<string, string> = {
  'customer-support': '🎧',
  'code-gen': '💻',
  'multi-agent-research': '🔍',
  'dev-productivity': '🛠️',
  cicd: '⚙️',
  'data-extraction': '📄',
};
