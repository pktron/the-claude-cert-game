import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SwipeCard } from '../components/SwipeCard';
import { buildDirectionAssignment } from '../domain/rng';
import type { Question, Direction } from '../domain/types';

function makeQ(over: Partial<Question> = {}): Question {
  return {
    id: 'q', domain: 'd1', taskStatement: '1.1', concept: 'c', mode: 'swipe', type: 'single',
    prompt: 'What is the primary purpose here?',
    options: [
      { id: 'a', text: 'Correct option', isCorrect: true },
      { id: 'b', text: 'Distractor B', isCorrect: false },
      { id: 'c', text: 'Distractor C', isCorrect: false },
    ],
    correctCount: 1, optionCountRationale: 'r', distractorRationale: {},
    explanation: { correct: '', whyWrong: {}, takeaway: '' },
    source: { document: 'd', section: 's' }, reviewStatus: 'verified', ...over,
  };
}

function pointer(type: string, x: number, y: number): Event {
  const Ctor = (window as unknown as { PointerEvent?: new (t: string, p: PointerEventInit) => Event })
    .PointerEvent;
  if (Ctor) {
    return new Ctor(type, {
      bubbles: true,
      clientX: x,
      clientY: y,
      pointerId: 1,
      pointerType: 'touch',
    });
  }
  const MouseEventCtor = window.MouseEvent;
  return new MouseEventCtor(type, { bubbles: true, clientX: x, clientY: y });
}

function drag(fromX: number, fromY: number, toX: number, toY: number) {
  const target = document.querySelector('[data-testid="swipe-card"]')!;
  act(() => {
    target.dispatchEvent(pointer('pointerdown', fromX, fromY));
    target.dispatchEvent(pointer('pointermove', toX, toY));
    target.dispatchEvent(pointer('pointerup', toX, toY));
  });
}

describe('SwipeCard regression: taps must not be swallowed', () => {
  function setup(onSwipe = vi.fn(), onTapSelect = vi.fn()) {
    const q = makeQ();
    const assignment = buildDirectionAssignment(q.options.map((o) => o.id), 'seed');
    render(
      <SwipeCard
        question={q}
        presentationSeed="seed"
        directionAssignment={assignment}
        selectedOptionIds={[]}
        revealed={false}
        committedIds={[]}
        reduceMotion
        showDirectionHints
        onSwipe={onSwipe}
        onTapSelect={onTapSelect}
      />,
    );
    return { q, assignment };
  }

  it('does NOT call setPointerCapture on the card (it would steal taps from the option buttons)', () => {
    setup();
    const card = document.querySelector('[data-testid="swipe-card"]') as HTMLElement & {
      setPointerCapture?: (id: number) => void;
    };
    // jsdom does not implement setPointerCapture, so install a recorder.
    const captured: number[] = [];
    card.setPointerCapture = (id: number) => {
      captured.push(id);
    };
    act(() => {
      card.dispatchEvent(pointer('pointerdown', 200, 300));
    });
    expect(captured).toHaveLength(0);
  });

  it('a tap (pointerdown + pointerup, no movement) on a card does not commit a swipe', () => {
    const onSwipe = vi.fn();
    const { q } = setup(onSwipe);
    const card = document.querySelector('[data-testid="swipe-card"]') as HTMLElement;
    act(() => {
      card.dispatchEvent(pointer('pointerdown', 200, 300));
      card.dispatchEvent(pointer('pointerup', 200, 300));
    });
    expect(onSwipe).not.toHaveBeenCalled();
    void q;
  });

  it('a real click on an option row still selects it after a pointerdown on the card', () => {
    const onTapSelect = vi.fn();
    const { assignment } = setup(vi.fn(), onTapSelect);
    const card = document.querySelector('[data-testid="swipe-card"]') as HTMLElement;
    const targetId = assignment.right;
    const row = document.querySelector(`[data-option-id="${targetId}"]`) as HTMLElement;
    // A touch interaction produces pointerdown on the card, then click on the row.
    act(() => {
      card.dispatchEvent(pointer('pointerdown', 200, 300));
      row.dispatchEvent(pointer('pointerup', 200, 300));
    });
    act(() => {
      row.click();
    });
    expect(onTapSelect).toHaveBeenCalledWith(targetId);
  });
});

describe('SwipeCard gestures', () => {
  it('swiping right selects the option assigned to the right direction', () => {
    const q = makeQ();
    const assignment = buildDirectionAssignment(q.options.map((o) => o.id), 'seed');
    const onSwipe = vi.fn();
    render(
      <SwipeCard
        question={q}
        presentationSeed="seed"
        directionAssignment={assignment}
        selectedOptionIds={[]}
        revealed={false}
        committedIds={[]}
        reduceMotion
        showDirectionHints
        onSwipe={onSwipe}
        onTapSelect={() => {}}
      />,
    );
    drag(200, 300, 320, 300); // right
    expect(onSwipe).toHaveBeenCalledWith('right');
    expect(onSwipe.mock.calls[0][0]).toBe('right');
  });

  it('each of the four directions fires its own direction for a 4-option question', () => {
    const q = makeQ({
      options: [
        { id: 'a', text: 'A', isCorrect: true },
        { id: 'b', text: 'B', isCorrect: false },
        { id: 'c', text: 'C', isCorrect: false },
        { id: 'd', text: 'D', isCorrect: false },
      ],
    });
    const seen: string[] = [];
    const assignment = buildDirectionAssignment(q.options.map((o) => o.id), 'seed4');
    const onSwipe = vi.fn((d: string) => seen.push(d));

    for (const [dx, dy] of [[130, 0], [-130, 0], [0, -130], [0, 130]] as const) {
      const { unmount } = render(
        <SwipeCard
          question={q}
          presentationSeed="seed4"
          directionAssignment={assignment}
          selectedOptionIds={[]}
          revealed={false}
          committedIds={[]}
          reduceMotion
          showDirectionHints
          onSwipe={onSwipe}
          onTapSelect={() => {}}
        />,
      );
      drag(200, 300, 200 + dx, 300 + dy);
      unmount();
    }
    expect(seen.sort()).toEqual(['down', 'left', 'right', 'up']);
  });

  it('an UNUSED direction does not submit (3-option question ignores the 4th direction)', () => {
    const q = makeQ(); // 3 options
    const assignment = buildDirectionAssignment(q.options.map((o) => o.id), 'seed3');
    const unused = (['left', 'right', 'up', 'down'] as const).find((d) => !assignment[d])!;
    const onSwipe = vi.fn();
    render(
      <SwipeCard
        question={q}
        presentationSeed="seed3"
        directionAssignment={assignment}
        selectedOptionIds={[]}
        revealed={false}
        committedIds={[]}
        reduceMotion
        showDirectionHints
        onSwipe={onSwipe}
        onTapSelect={() => {}}
      />,
    );
    // Drag toward the unused direction
    const delta: Record<string, [number, number]> = {
      left: [-140, 0], right: [140, 0], up: [0, -140], down: [0, 140],
    };
    const [dx, dy] = delta[unused];
    drag(200, 300, 200 + dx, 300 + dy);
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('a short drag below the threshold does not commit', () => {
    const q = makeQ();
    const assignment = buildDirectionAssignment(q.options.map((o) => o.id), 'seed');
    const onSwipe = vi.fn();
    render(
      <SwipeCard
        question={q}
        presentationSeed="seed"
        directionAssignment={assignment}
        selectedOptionIds={[]}
        revealed={false}
        committedIds={[]}
        reduceMotion
        showDirectionHints
        onSwipe={onSwipe}
        onTapSelect={() => {}}
      />,
    );
    drag(200, 300, 230, 300); // only 30px
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('tap selects the same option that the corresponding direction maps to (tap/gesture parity)', () => {
    const q = makeQ();
    const assignment = buildDirectionAssignment(q.options.map((o) => o.id), 'seed');
    const optionInRight = assignment.right;
    const onTap = vi.fn();
    render(
      <SwipeCard
        question={q}
        presentationSeed="seed"
        directionAssignment={assignment}
        selectedOptionIds={[]}
        revealed={false}
        committedIds={[]}
        reduceMotion
        showDirectionHints
        onSwipe={() => {}}
        onTapSelect={onTap}
      />,
    );
    const row = document.querySelector(`[data-option-id="${optionInRight}"]`) as HTMLElement;
    act(() => {
      row.click();
    });
    expect(onTap).toHaveBeenCalledWith(optionInRight);
  });

  it('does not fire gestures once the card is revealed', () => {
    const q = makeQ();
    const assignment = buildDirectionAssignment(q.options.map((o) => o.id), 'seed');
    const onSwipe = vi.fn();
    render(
      <SwipeCard
        question={q}
        presentationSeed="seed"
        directionAssignment={assignment}
        selectedOptionIds={['a']}
        revealed
        committedIds={['a']}
        reduceMotion
        showDirectionHints={false}
        onSwipe={onSwipe}
        onTapSelect={() => {}}
      />,
    );
    drag(200, 300, 340, 300);
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('renders every option and a direction hint for a 3-option question', () => {
    const q = makeQ();
    const assignment = buildDirectionAssignment(q.options.map((o) => o.id), 'seed');
    render(
      <SwipeCard
        question={q}
        presentationSeed="seed"
        directionAssignment={assignment}
        selectedOptionIds={[]}
        revealed={false}
        committedIds={[]}
        reduceMotion
        showDirectionHints
        onSwipe={() => {}}
        onTapSelect={() => {}}
      />,
    );
    for (const o of q.options) {
      expect(document.querySelector(`[data-option-id="${o.id}"]`)).toBeInTheDocument();
    }
    expect(screen.getByText(/Swipe toward your answer/)).toBeInTheDocument();
  });

  it('multiple-response mode toggles selections and does not swipe', () => {    const q = makeQ({
      type: 'multiple',
      correctCount: 2,
      options: [
        { id: 'a', text: 'A', isCorrect: true },
        { id: 'b', text: 'B', isCorrect: true },
        { id: 'c', text: 'C', isCorrect: false },
      ],
    });
    const onTap = vi.fn();
    const onSwipe = vi.fn();
    render(
      <SwipeCard
        question={q}
        presentationSeed="seed"
        directionAssignment={{} as Record<Direction, string>}
        selectedOptionIds={['a']}
        revealed={false}
        committedIds={[]}
        reduceMotion
        showDirectionHints={false}
        onSwipe={onSwipe}
        onTapSelect={onTap}
        multi
      />,
    );
    const rowB = document.querySelector('[data-option-id="b"]') as HTMLElement;
    act(() => rowB.click());
    expect(onTap).toHaveBeenCalledWith('b');
    // In multi mode no direction gestures are bound
    drag(200, 300, 340, 300);
    expect(onSwipe).not.toHaveBeenCalled();
    expect(screen.getByText(/more than one/i)).toBeInTheDocument();
  });
});
