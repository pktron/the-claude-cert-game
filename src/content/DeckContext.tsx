import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getDeckMeta, getDeckQuestions, type DeckMeta } from './decks';
import type { Question } from '../domain/types';

export interface ActiveDeck {
  meta: DeckMeta;
  questions: Question[];
}

const DeckContext = createContext<ActiveDeck | null>(null);

export function DeckProvider({ deckId, children }: { deckId: string; children: ReactNode }) {
  const value = useMemo<ActiveDeck | null>(() => {
    const meta = getDeckMeta(deckId);
    if (!meta) return null;
    return { meta, questions: getDeckQuestions(deckId) };
  }, [deckId]);

  if (!value) return null;
  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>;
}

export function useDeck(): ActiveDeck {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error('useDeck must be used inside a <DeckProvider>');
  return ctx;
}
