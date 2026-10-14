import { useEffect, useState } from 'react';
import type { Settings } from '../storage/persistence';

/** Honour the OS-level reduced-motion preference as the default. */
export function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefers(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefers;
}

/** True when motion should be suppressed (either the OS asks or the user turned it off). */
export function useReducedMotion(settings: Settings): boolean {
  const prefers = usePrefersReducedMotion();
  return settings.reduceMotion || prefers;
}

/** Light haptic tick if supported and enabled. */
export function haptic(pattern: number | number[] = 12, enabled = true) {
  if (!enabled) return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore - vibration is best-effort and must never break interaction */
    }
  }
}
