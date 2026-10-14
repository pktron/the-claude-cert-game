import { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useAppState } from './storage/useAppState';
import { useReducedMotion } from './hooks/useReducedMotion';
import { BottomNav } from './components/BottomNav';
import { Home } from './screens/Home';
import { SessionScreen } from './screens/SessionScreen';
import { Summary } from './screens/Summary';
import { Stats } from './screens/Stats';
import { Review } from './screens/Review';
import { Settings } from './screens/Settings';
import { ComingSoon } from './screens/ComingSoon';

import './styles/global.css';
import './styles/components.css';
import './styles/screens.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** During a session or its summary we want the full card, not the tab bar. */

export default function App() {
  const app = useAppState();
  const reduceMotion = useReducedMotion(app.settings);

  useEffect(() => {
    const cls = document.body.classList;
    cls.toggle('reduce-motion', reduceMotion);
    cls.toggle('high-contrast', app.settings.highContrast);
  }, [reduceMotion, app.settings.highContrast]);

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <Shell app={app} />
    </HashRouter>
  );
}

/** During a session or its summary we want the full card, not the tab bar. */
function Shell({ app }: { app: ReturnType<typeof useAppState> }) {
  const { pathname } = useLocation();
  const hideNav = pathname.startsWith('/session') || pathname.startsWith('/summary');

  return (
    <div className="app-shell">
      <main className={`app-main ${hideNav ? 'no-nav' : ''}`}>
        <Routes>
          <Route path="/" element={<Home app={app} />} />
          <Route path="/session/:mode" element={<SessionScreen app={app} />} />
          <Route path="/summary/:mode" element={<Summary app={app} />} />
          <Route path="/review" element={<Review app={app} />} />
          <Route path="/stats" element={<Stats app={app} />} />
          <Route path="/settings" element={<Settings app={app} />} />
          <Route path="/soon" element={<ComingSoon />} />
          <Route path="*" element={<Home app={app} />} />
        </Routes>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
