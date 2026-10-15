import { registerSW } from 'virtual:pwa-register';

/**
 * Update the app when it loads, with no hard refresh and no background polling.
 *
 * The browser already checks for a new service worker on every load. Two things
 * are needed to make that actually land:
 *  - skipWaiting + clientsClaim (set in vite.config) so the new worker takes
 *    control of the page, which is what lets the plugin reload onto it;
 *  - one explicit registration.update() at load, which fetches the worker
 *    script fresh and bypasses the browser's HTTP cache - otherwise a deploy
 *    can be masked by a cached sw.js.
 *
 * A reload only happens when a new version actually exists, so ordinary loads
 * are untouched. Because it runs at startup, it never interrupts a session.
 */
export function setupPwaUpdates(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      registration?.update().catch(() => {
        /* offline or transient - the next load will check again */
      });
    },
  });
}
