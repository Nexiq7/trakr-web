import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { GithubIcon } from './components/GithubIcon';
import { REPO_URL } from './lib/constants';
import { Home } from './pages/Home';
import { Discover } from './pages/Discover';
import { Search } from './pages/Search';
import { Details } from './pages/Details';
import { Login } from './pages/Login';
import { Watchlist } from './pages/Watchlist';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="bg-black text-white min-h-screen selection:bg-accent/30">
          <ScrollToTop />
          <Navbar />

          <main className="min-h-screen pb-28 md:pb-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/search" element={<Search />} />
              <Route path="/details/:type/:id" element={<Details />} />
              <Route path="/login" element={<Login />} />
              <Route path="/watchlist" element={<Watchlist />} />
            </Routes>
          </main>

          <BottomNav />

          <footer className="hidden md:flex flex-col items-center gap-3 py-16 px-12 text-center border-t border-white/5">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="View source on GitHub"
              aria-label="View source on GitHub"
              className="text-white/30 hover:text-white/70 transition-colors duration-300"
            >
              <GithubIcon size={18} />
            </a>
            <p className="text-white/30 text-xs">© 2026 trakr</p>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
