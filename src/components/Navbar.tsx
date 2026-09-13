import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Library, LogOut, Search, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/watchlist', label: 'Collection', icon: Library },
];

interface NavbarProps {
  onOpenSearch: () => void;
}

export function Navbar({ onOpenSearch }: NavbarProps) {
  const { token, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Over the hero the bar is nearly invisible; once the page scrolls under it,
  // it takes on its full material so the content passing behind stays readable.
  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Following a link inside the menu closes it below; this is for the browser's
  // own back and forward buttons, which never touch the menu.
  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);

  const initial = user?.username?.[0]?.toUpperCase() ?? '?';
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="fixed top-0 inset-x-0 z-[150] flex justify-center px-4 pt-3 md:pt-4 pointer-events-none">
      <nav
        className={`pointer-events-auto flex items-center gap-2 rounded-full transition-all duration-500 ease-apple ${
          condensed
            ? 'glass-panel shadow-[0_12px_40px_rgba(0,0,0,0.55)] px-3 py-2'
            : 'bg-transparent border border-transparent px-3 py-2.5'
        }`}
      >
        <Link
          to="/"
          className="px-2 text-[17px] font-semibold tracking-tight text-white hover:opacity-80 transition-opacity duration-300"
        >
          trakr
        </Link>

        <span aria-hidden className="hidden md:block w-px h-4 bg-white/12 mx-1" />

        <div className="hidden md:flex items-center gap-2">
          {NAV_LINKS.map((link) => {
            const active = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                // Icon-only, so the name has to come from somewhere: the label is
                // announced to screen readers and shown as a tooltip on hover.
                aria-label={link.label}
                title={link.label}
                className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-colors duration-300 ease-apple ${
                  active ? 'text-white' : 'text-white/50 hover:text-white/85'
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-white/10 border border-white/8"
                  />
                )}
                <link.icon size={17} className="relative" />
              </Link>
            );
          })}
        </div>

        <button
          onClick={onOpenSearch}
          aria-label="Search"
          aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
          title={`Search (${isMac ? '⌘K' : 'Ctrl K'})`}
          className="w-9 h-9 flex items-center justify-center rounded-full text-white/50 hover:text-white  transition-colors duration-300 ease-apple"
        >
          <Search size={17} />
        </button>

        {token ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account"
              className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent-deep border border-white/15 flex items-center justify-center text-[11.5px] font-semibold text-white transition-transform duration-300 ease-apple hover:scale-105 active:scale-95"
            >
              {initial}
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-3 w-56 rounded-2xl glass-panel shadow-[0_20px_50px_rgba(0,0,0,0.65)] p-1.5 animate-scale-in origin-top-right"
              >
                <div className="px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/30 font-semibold">
                    Signed in as
                  </p>
                  <p className="text-[14px] text-white font-medium mt-1 truncate">
                    {user?.username}
                  </p>
                </div>
                <div aria-hidden className="h-px bg-white/8 my-1" />
                <Link
                  to="/watchlist"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13.5px] text-white/80 hover:bg-white/8 hover:text-white transition-colors duration-200"
                >
                  <Library size={15} /> My collection
                </Link>
                <button
                  role="menuitem"
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                    navigate('/');
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13.5px] text-red-300 hover:bg-red-500/12 transition-colors duration-200"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-1.5 bg-white text-black text-[13px] font-semibold pl-3 pr-3.5 py-2 rounded-full hover:bg-white/90 transition-all duration-300 ease-apple active:scale-95"
          >
            <User size={14} />
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
