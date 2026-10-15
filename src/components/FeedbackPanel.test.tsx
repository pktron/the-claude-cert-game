import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedbackPanel } from '../components/FeedbackPanel';
import type { Question } from '../domain/types';

function makeQ(over: Partial<Question> = {}): Question {
  return {
    id: 'q',
    domain: 'd1',
    taskStatement: '1.1',
    concept: 'c',
    mode: 'swipe',
    type: 'single',
    prompt: 'What is the primary purpose here?',
    options: [
      { id: 'a', text: 'Correct option', isCorrect: true },
      { id: 'b', text: 'Distractor B', isCorrect: false },
    ],
    correctCount: 1,
    optionCountRationale: 'r',
    distractorRationale: { b: 'because' },
    explanation: { correct: 'Correct.', whyWrong: { b: 'because' }, takeaway: 'Take it.' },
    source: { document: 'd', section: 'Task Statement 1.1' },
    reviewStatus: 'verified',
    ...over,
  };
}

function renderPanel(over: Partial<Question> = {}) {
  return render(
    <FeedbackPanel
      question={makeQ(over)}
      correct
      committedIds={['a']}
      reduceMotion
      soundOn={false}
      onContinue={() => {}}
      onFlag={() => {}}
      flagged={false}
    />,
  );
}

describe('FeedbackPanel grounding UI', () => {
  it('shows the verbatim guide quote when the item has one', () => {
    renderPanel({
      source: {
        document: 'd',
        section: 'Task Statement 1.1',
        quotes: ['Inspecting stop_reason to decide whether to continue the loop'],
      },
    });
    const quote = screen.getByTestId('source-quote');
    expect(quote).toBeInTheDocument();
    expect(quote).toHaveTextContent('Inspecting stop_reason to decide whether to continue the loop');
  });

  it('does not render a quote block when the item has no quotes', () => {
    renderPanel();
    expect(screen.queryByTestId('source-quote')).not.toBeInTheDocument();
  });

  it('flags a needs-review item to the learner', () => {
    renderPanel({ reviewStatus: 'needs-review' });
    expect(screen.getByTestId('review-flag')).toBeInTheDocument();
  });

  it('does not flag a verified item', () => {
    renderPanel({ reviewStatus: 'verified' });
    expect(screen.queryByTestId('review-flag')).not.toBeInTheDocument();
  });

  it('always states the source and that it is not an official item', () => {
    renderPanel();
    expect(screen.getByText(/practice question, not an official exam item/i)).toBeInTheDocument();
  });

  it('invokes onContinue when Continue is pressed', () => {
    const onContinue = vi.fn();
    render(
      <FeedbackPanel
        question={makeQ()}
        correct
        committedIds={['a']}
        reduceMotion
        soundOn={false}
        onContinue={onContinue}
        onFlag={() => {}}
        flagged={false}
      />,
    );
    screen.getByTestId('continue').click();
    expect(onContinue).toHaveBeenCalled();
  });
});
