import { useCallback, useEffect, useState } from 'react';
import { deckList } from '../content/decks';
import type { ProgressState } from '../domain/types';
import { emptyProgress } from '../domain/progress';
import { loadProgress, saveProgress } from './persistence';

/**
 * Progress across every certification. Used by the certification picker and by
 * global settings, which are not scoped to a single deck.
 */
export function useAllProgress() {
  const [progressByDeck, setProgressByDeck] = useState<Record<string, ProgressState>>({});

  useEffect(() => {
    const next: Record<string, ProgressState> = {};
    for (const deck of deckList) {
      next[deck.deckId] = loadProgress(deck.deckId);
    }
    setProgressByDeck(next);
  }, []);

  // Keep the picker in sync with storage changes in another tab.
  useEffect(() => {
    const onStorage = () => {
      const next: Record<string, ProgressState> = {};
      for (const deck of deckList) next[deck.deckId] = loadProgress(deck.deckId);
      setProgressByDeck(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setDeckProgress = useCallback((deckId: string, p: ProgressState) => {
    saveProgress(deckId, p);
    setProgressByDeck((prev) => ({ ...prev, [deckId]: p }));
  }, []);

  const resetDeck = useCallback((deckId: string) => {
    setDeckProgress(deckId, emptyProgress());
  }, [setDeckProgress]);

  return { progressByDeck, setDeckProgress, resetDeck };
}
