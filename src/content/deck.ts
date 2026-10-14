import deckJson from '../../content/decks/architect-foundations.json';
import type { Deck, Domain, DomainId, Question } from '../domain/types';

export const deck = deckJson as unknown as Deck;

export const domains: Domain[] = deck.domains;
export const questions: Question[] = deck.questions;

const byId = new Map(questions.map((q) => [q.id, q]));

export function getQuestion(id: string): Question | undefined {
  return byId.get(id);
}

export function domainName(id: DomainId): string {
  return domains.find((d) => d.id === id)?.name ?? id;
}

export function questionsByDomain(id: DomainId): Question[] {
  return questions.filter((q) => q.domain === id);
}
