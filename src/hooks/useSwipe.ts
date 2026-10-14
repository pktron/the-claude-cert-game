import { useCallback, useEffect, useRef, useState } from 'react';
import type { Direction } from '../domain/types';

const SWIPE_DISTANCE = 92; // px before a drag counts as a committed swipe
const DRAG_START = 8; // px of movement before we treat the gesture as a drag, not a tap
const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

export interface SwipeState {
  dx: number;
  dy: number;
  /** The direction the current drag would commit to, if any. */
  active: Direction | null;
}

export interface UseSwipeResult extends SwipeState {
  onPointerDown: (e: React.PointerEvent) => void;
  reset: () => void;
}

/**
 * Pointer-event swipe detection with a dominant-axis decision.
 *
 * Deliberately avoids `setPointerCapture` on the card: capturing the pointer on
 * an ancestor would steal the click event from the option buttons inside it and
 * break tap-to-answer. Instead we track the drag with window-level listeners and
 * only suppress the default action once the gesture is clearly a drag.
 *
 * Only the `enabledDirections` can be committed, so a 3-option question simply
 * will not fire on the unused fourth direction.
 */
export function useSwipe(options: {
  enabledDirections: Direction[];
  onSwipe: (direction: Direction) => void;
  disabled?: boolean;
}): UseSwipeResult {
  const { enabledDirections, onSwipe, disabled = false } = options;
  const [state, setState] = useState<SwipeState>({ dx: 0, dy: 0, active: null });

  const origin = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);

  // Keep the latest values in refs so the window listeners never go stale.
  const enabledRef = useRef(enabledDirections);
  enabledRef.current = enabledDirections;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  const computeActive = useCallback((dx: number, dy: number): Direction | null => {
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    let dir: Direction;
    // Require a clear dominant axis so diagonal drags do not feel random.
    if (ax > ay) dir = dx < 0 ? 'left' : 'right';
    else dir = dy < 0 ? 'up' : 'down';
    if (Math.max(ax, ay) < SWIPE_DISTANCE) return null;
    return enabledRef.current.includes(dir) ? dir : null;
  }, []);

  // Listener teardown. Declared before the handlers so the unmount effect can
  // reference a stable function.
  const listeners = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent) => void; cancel: () => void } | null>(null);

  const cleanup = useCallback(() => {
    const l = listeners.current;
    if (l) {
      window.removeEventListener('pointermove', l.move);
      window.removeEventListener('pointerup', l.up);
      window.removeEventListener('pointercancel', l.cancel);
    }
    listeners.current = null;
    origin.current = null;
    dragging.current = false;
  }, []);

  const handleMove = useCallback(
    (e: PointerEvent) => {
      if (!origin.current) return;
      const dx = e.clientX - origin.current.x;
      const dy = e.clientY - origin.current.y;
      if (!dragging.current) {
        if (Math.abs(dx) < DRAG_START && Math.abs(dy) < DRAG_START) return;
        dragging.current = true;
      }
      // Stop the page scrolling underneath while the card is being dragged.
      if (e.cancelable) e.preventDefault();
      setState({ dx, dy, active: computeActive(dx, dy) });
    },
    [computeActive],
  );

  const handleUp = useCallback(
    (e: PointerEvent) => {
      if (!origin.current) return;
      const dx = e.clientX - origin.current.x;
      const dy = e.clientY - origin.current.y;
      const wasDrag = dragging.current;
      cleanup();
      if (wasDrag) {
        const active = computeActive(dx, dy);
        if (active) {
          onSwipeRef.current(active);
          // Keep the offset briefly so the card animates away in that direction.
          setState({ dx, dy, active });
          return;
        }
      }
      setState({ dx: 0, dy: 0, active: null });
    },
    [cleanup, computeActive],
  );

  const handleCancel = useCallback(() => {
    cleanup();
    setState({ dx: 0, dy: 0, active: null });
  }, [cleanup]);

  useEffect(() => cleanup, [cleanup]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabledRef.current) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // Clear any stale listeners first, then record the new origin.
      cleanup();
      origin.current = { x: e.clientX, y: e.clientY };
      dragging.current = false;
      listeners.current = { move: handleMove, up: handleUp, cancel: handleCancel };
      window.addEventListener('pointermove', handleMove, { passive: false });
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleCancel);
    },
    [handleMove, handleUp, handleCancel, cleanup],
  );

  const reset = useCallback(() => {
    cleanup();
    setState({ dx: 0, dy: 0, active: null });
  }, [cleanup]);

  return { dx: state.dx, dy: state.dy, active: state.active, onPointerDown, reset };
}

/** Visual offset for the card while dragging (damped so it feels connected but not 1:1). */
export function swipeTransform(dx: number, dy: number): string {
  if (dx === 0 && dy === 0) return 'translate(0px, 0px)';
  const angle = (dx / 900) * 14; // degrees
  const max = 120;
  const cx = Math.max(-max, Math.min(max, dx * 0.35));
  const cy = Math.max(-max, Math.min(max, dy * 0.35));
  return `translate(${cx}px, ${cy}px) rotate(${angle}deg)`;
}

export { SWIPE_DISTANCE, DIRECTION_VECTORS };
