import type { Question } from './types';

/**
 * Grade a committed answer.
 * - single: correct iff exactly the correct option was selected
 * - multiple: correct iff the selected set EQUALS the correct set (no extras, no misses)
 */
export function gradeAnswer(question: Question, selectedOptionIds: string[]): boolean {
  const correctIds = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id));
  const selected = new Set(selectedOptionIds);

  if (question.type === 'single') {
    return selected.size === 1 && correctIds.has([...selected][0]);
  }
  // multiple: exact set match
  if (selected.size !== correctIds.size) return false;
  for (const id of selected) if (!correctIds.has(id)) return false;
  return true;
}

/** Options the learner selected that are wrong - used to explain the misconception. */
export function wrongSelections(question: Question, selectedOptionIds: string[]): string[] {
  return selectedOptionIds.filter((id) => !question.options.find((o) => o.id === id)?.isCorrect);
}

/** Correct options the learner missed (challenge multiple-response). */
export function missedCorrect(question: Question, selectedOptionIds: string[]): string[] {
  const selected = new Set(selectedOptionIds);
  return question.options.filter((o) => o.isCorrect && !selected.has(o.id)).map((o) => o.id);
}
