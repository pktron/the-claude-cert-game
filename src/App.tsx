import { createContext, useContext, useEffect } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Outlet,
  Navigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import type { ComponentType } from 'react';
import { useAppState, type AppState } from './storage/useAppState';
import { useSettings } from './storage/useSettings';
import { useReducedMotion } from './hooks/useReducedMotion';
import { BottomNav } from './components/BottomNav';
import { DeckProvider } from './content/DeckContext';
import { getDeckMeta } from './content/decks';
import { Certifications } from './screens/Certifications';
import { CertHome } from './screens/CertHome';
import { SessionScreen } from './screens/SessionScreen';
import { Summary } from './screens/Summary';
import { Stats } from './screens/Stats';
import { Review } from './screens/Review';
import { Settings } from './screens/Settings';
import { ComingSoon } from './screens/ComingSoon';

import './styles/global.css';
import './styles/components.css';
import './styles/screens.css';

/** App state for the certification currently open, provided by CertLayout. */
const CertAppContext = createContext<AppState | null>(null);

function useCertApp(): AppState {
  const ctx = useContext(CertAppContext);
  if (!ctx) throw new Error('useCertApp must be used inside a certification route');
  return ctx;
}

/** Injects the active certification's app state into a screen that expects `app`. */
function withApp<P extends object>(Comp: ComponentType<P & { app: AppState }>) {
  return function WithApp(props: P) {
    const app = useCertApp();
    return <Comp {...(props as P)} app={app} />;
  };
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Certification layout: resolve :deckId, provide the deck, host its screens. */
function CertLayout() {
  const { deckId = '' } = useParams();
  const meta = getDeckMeta(deckId);
  const app = useAppState(deckId);
  const { pathname } = useLocation();
  // The card needs the full height, so the tab bar steps aside in a session.
  const hideNav = pathname.includes('/session/') || pathname.includes('/summary/');

  if (!meta) return <Navigate to="/" replace />;
  if (!meta.available) return <ComingSoon deckId={deckId} />;

  return (
    <CertAppContext.Provider value={app}>
      <DeckProvider deckId={deckId}>
        <div className="app-shell">
          <main className={`app-main ${hideNav ? 'no-nav' : ''}`}>
            <Outlet />
          </main>
          {!hideNav && <BottomNav />}
        </div>
      </DeckProvider>
    </CertAppContext.Provider>
  );
}

/** Landing screen and global settings are not scoped to a certification. */
function GlobalShell({ children }: { children: React.ReactNode }) {
  return <div className="app-shell plain">{children}</div>;
}

function Landing() {
  return (
    <GlobalShell>
      <main className="app-main plain-main">
        <Certifications />
      </main>
    </GlobalShell>
  );
}

function SettingsPage() {
  return (
    <GlobalShell>
      <main className="app-main plain-main">
        <Settings />
      </main>
    </GlobalShell>
  );
}

const CertHomeRoute = withApp(CertHome);
const SessionRoute = withApp(SessionScreen);
const SummaryRoute = withApp(Summary);
const ReviewRoute = withApp(Review);
const StatsRoute = withApp(Stats);

/** Applies accessibility preferences to the document for every screen. */
function GlobalEffects() {
  const { settings } = useSettings();
  const reduceMotion = useReducedMotion(settings);
  useEffect(() => {
    const cls = document.body.classList;
    cls.toggle('reduce-motion', reduceMotion);
    cls.toggle('high-contrast', settings.highContrast);
  }, [reduceMotion, settings.highContrast]);
  return null;
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <GlobalEffects />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/c" element={<Landing />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/soon" element={<ComingSoon />} />
        <Route path="/c/:deckId" element={<CertLayout />}>
          <Route index element={<CertHomeRoute />} />
          <Route path="session/:mode" element={<SessionRoute />} />
          <Route path="summary/:mode" element={<SummaryRoute />} />
          <Route path="review" element={<ReviewRoute />} />
          <Route path="stats" element={<StatsRoute />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
