import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { WatchlistProvider } from './context/WatchlistContext';
import { TrackSheetProvider } from './context/TrackSheetContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { CommandPalette } from './components/CommandPalette';
import { GithubIcon } from './components/GithubIcon';
import { REPO_URL } from './lib/constants';
import { Home } from './pages/Home';
import { Discover } from './pages/Discover';
import { Search } from './pages/Search';
import { Details } from './pages/Details';
import { Login } from './pages/Login';
import { Watchlist } from './pages/Watchlist';
import { NotFound } from './pages/NotFound';

/**
 * Reset the scroll position on navigation, except when the browser is restoring
 * a previous entry — going Back should return you to where you were reading,
 * not to the top of the page you already scrolled through.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === 'POP') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, navigationType]);

  return null;
}

/**
 * Wraps the routed page in a keyed element so React tears down the old page and
 * mounts the new one, replaying the entrance animation each time. Without the
 * key, a route change swaps children in place and nothing animates.
 */
function RoutedPages() {
  const location = useLocation();

  return (
    <div key={location.pathname} className="animate-page-enter">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/search" element={<Search />} />
        <Route path="/details/:type/:id" element={<Details />} />
        <Route path="/login" element={<Login />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function Shell() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘K / Ctrl-K from anywhere, except while typing somewhere else — the
  // shortcut shouldn't steal the key from a search field or a password box.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
      // A keystroke aimed at a field belongs to that field. The target isn't
      // always an element — a key pressed with nothing focused arrives on the
      // document — so check before treating it as one.
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, [contenteditable="true"]')) {
        return;
      }
      event.preventDefault();
      setPaletteOpen((open) => !open);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Every in-palette navigation closes it on the way out; this covers the one
  // case that doesn't go through the palette — the browser's own back button.
  useEffect(() => {
    const close = () => setPaletteOpen(false);
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);

  return (
    <div className="bg-black text-white min-h-screen selection:bg-accent/30">
      <ScrollToTop />
      <Navbar onOpenSearch={() => setPaletteOpen(true)} />

      <main className="min-h-screen">
        <RoutedPages />
      </main>

      <BottomNav />

      <footer className="flex flex-col items-center gap-3 pt-16 pb-32 md:pb-16 px-6 md:px-12 text-center border-t border-white/5">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="View source on GitHub"
          aria-label="View source on GitHub"
          className="text-white/25 hover:text-white/70 transition-colors duration-300 ease-apple"
        >
          <GithubIcon size={18} />
        </a>
        <p className="text-white/25 text-xs">© 2026 trakr</p>
        {/* TMDB's terms ask for this notice wherever its data is shown. */}
        <p className="max-w-md text-white/25 text-[11px] leading-relaxed">
          Trending and popular lists use data from{' '}
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-white/15 underline-offset-2 hover:text-white/60 transition-colors duration-300"
          >
            TMDB
          </a>
          . This product uses the TMDB API but is not endorsed or certified by TMDB. Title
          details come from TheTVDB.
        </p>
      </footer>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <WatchlistProvider>
            <TrackSheetProvider>
              <Shell />
            </TrackSheetProvider>
          </WatchlistProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
