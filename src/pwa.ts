import { registerSW } from 'virtual:pwa-register';

/**
 * Keep the app current without asking the learner to hard-refresh.
 *
 * The generated service worker uses skipWaiting + clientsClaim, and the plugin
 * reloads the page when a new worker takes control. What is missing by default
 * is *when* the browser looks for a new worker: it only checks on navigation,
 * and an installed PWA can sit open for days. So we ask the registration to
 * check on a timer and whenever the app regains focus.
 *
 * Updates are infrequent (only on deploy) and per-question progress is already
 * persisted, so a mid-session reload costs at most the current card's position.
 */
export function setupPwaUpdates(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  const CHECK_INTERVAL_MS = 60_000;

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const check = () => {
        // Forces a fresh fetch of the service worker script, bypassing the
        // browser's HTTP cache, so a new deploy is noticed promptly.
        registration.update().catch(() => {
          /* offline or transient - try again on the next tick */
        });
      };
      check();
      setInterval(check, CHECK_INTERVAL_MS);
      window.addEventListener('focus', check);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });
}
