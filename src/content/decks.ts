import manifest from '../../content/decks/manifest.json';
import type { Deck, Domain, Question } from '../domain/types';

/**
 * Deck registry.
 *
 * `import.meta.glob` picks up whichever deck JSON files exist at build time, so a
 * deck that has not been authored yet is simply absent rather than breaking the
 * build. The manifest supplies titles, weights, and per-domain objectives.
 */
const deckModules = import.meta.glob('../../content/decks/*.json', { eager: true }) as Record<
  string,
  { default: Deck }
>;

export interface DeckObjective {
  id: string;
  title: string;
}

export interface DeckDomain {
  id: string;
  name: string;
  weight: number;
  objectives: DeckObjective[];
}

export interface DeckMeta {
  deckId: string;
  title: string;
  shortName: string;
  examCode: string;
  items: number;
  timeLimitMinutes: number;
  passingScore: number;
  source: string;
  /** True once the deck has questions shipped. */
  available: boolean;
  questionCount: number;
  objectiveCount: number;
  domains: DeckDomain[];
}

interface ManifestShape {
  decks: Array<{
    deckId: string;
    title: string;
    shortName: string;
    examCode: string;
    items: number;
    timeLimitMinutes: number;
    passingScore: number;
    source: string;
    domains: Array<{ id: string; name: string; weight: number; objectives: DeckObjective[] }>;
  }>;
}

const manifestDecks = (manifest as ManifestShape).decks ?? [];

function questionsFor(deckId: string): Question[] {
  for (const [path, mod] of Object.entries(deckModules)) {
    if (!path.endsWith(`/${deckId}.json`)) continue;
    const deck = mod.default;
    if (deck && Array.isArray(deck.questions)) return deck.questions;
  }
  return [];
}

/** All known certifications, in study-order. */
export const deckList: DeckMeta[] = manifestDecks.map((d) => {
  const questions = questionsFor(d.deckId);
  const objectiveCount = d.domains.reduce((n, dom) => n + dom.objectives.length, 0);
  return {
    deckId: d.deckId,
    title: d.title,
    shortName: d.shortName,
    examCode: d.examCode,
    items: d.items,
    timeLimitMinutes: d.timeLimitMinutes,
    passingScore: d.passingScore,
    source: d.source,
    available: questions.length > 0,
    questionCount: questions.length,
    objectiveCount,
    domains: d.domains,
  };
});

const byId = new Map(deckList.map((d) => [d.deckId, d]));

export function getDeckMeta(deckId: string): DeckMeta | undefined {
  return byId.get(deckId);
}

export function getDeckQuestions(deckId: string): Question[] {
  return questionsFor(deckId);
}

/** Domain list for a deck, in blueprint order. */
export function getDeckDomains(deckId: string): Domain[] {
  const meta = byId.get(deckId);
  if (!meta) return [];
  return meta.domains.map((d) => ({ id: d.id as Domain['id'], name: d.name, weight: d.weight }));
}

export function getQuestion(deckId: string, questionId: string): Question | undefined {
  return questionsFor(deckId).find((q) => q.id === questionId);
}

export function domainName(deckId: string, domainId: string): string {
  const meta = byId.get(deckId);
  return meta?.domains.find((d) => d.id === domainId)?.name ?? domainId;
}

/** The default landing deck: the first one that actually has content. */
export function defaultDeckId(): string | undefined {
  return deckList.find((d) => d.available)?.deckId;
}
