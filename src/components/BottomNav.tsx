import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Home, Library, LogOut, Search, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSlidingIndicator } from '../hooks/useSlidingIndicator';

const TABS = [
  { to: '/', label: 'Home', icon: Home, exact: true },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/watchlist', label: 'Collection', icon: Library },
];

/**
 * The phone tab bar.
 *
 * The active pill is one element that slides between tabs rather than four that
 * fade in and out, so switching tabs reads as moving a selection instead of
 * redrawing the bar.
 */
export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Tapping a tab leaves the popover behind otherwise, and so does the
  // browser's back button.
  useEffect(() => {
    const close = () => setAccountOpen(false);
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);

  const isActive = (tab: (typeof TABS)[number]) =>
    tab.exact ? location.pathname === tab.to : location.pathname.startsWith(tab.to);

  const activeIndex = TABS.findIndex(isActive);
  // Measured rather than computed: the tabs are sized by their labels, so
  // "Collection" and "Home" are not the same width.
  const { containerRef, box } = useSlidingIndicator(activeIndex, [location.pathname]);

  return (
    <nav
      ref={wrapRef}
      className="fixed bottom-0 inset-x-0 z-[150] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {accountOpen && (
        <div className="mx-auto mb-3 w-52 rounded-2xl glass-panel shadow-[0_14px_44px_rgba(0,0,0,0.65)] p-1.5 animate-scale-in origin-bottom">
          <p className="px-3 py-2 text-[12px] font-medium text-white/45 truncate">
            {user?.username ?? 'Account'}
          </p>
          <button
            onClick={() => {
              logout();
              setAccountOpen(false);
              navigate('/');
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13.5px] text-red-300 active:bg-red-500/12 transition-colors"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative flex items-stretch px-1.5 py-1.5 rounded-[24px] glass-panel shadow-[0_14px_44px_rgba(0,0,0,0.6)]"
      >
        {box && (
          <span
            aria-hidden
            className="absolute top-1.5 bottom-1.5 rounded-[18px] bg-white/10 border border-white/8 transition-all duration-[450ms] ease-spring"
            style={{ left: box.left, width: box.width }}
          />
        )}

        {TABS.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              data-index={TABS.indexOf(tab)}
              onClick={() => setAccountOpen(false)}
              aria-current={active ? 'page' : undefined}
              className="relative flex-1 flex flex-col items-center gap-1 py-1.5"
            >
              <tab.icon
                size={19}
                strokeWidth={active ? 2.4 : 2}
                className={`transition-colors duration-300 ${active ? 'text-white' : 'text-white/45'}`}
              />
              <span
                className={`text-[10px] font-medium transition-colors duration-300 ${
                  active ? 'text-white' : 'text-white/45'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        <button
          onClick={() => (token ? setAccountOpen((open) => !open) : navigate('/login'))}
          className="relative flex-1 flex flex-col items-center gap-1 py-1.5"
          aria-label={token ? 'Account' : 'Sign in'}
        >
          <User
            size={19}
            className={`transition-colors duration-300 ${accountOpen ? 'text-white' : 'text-white/45'}`}
          />
          <span
            className={`text-[10px] font-medium transition-colors duration-300 ${
              accountOpen ? 'text-white' : 'text-white/45'
            }`}
          >
            You
          </span>
        </button>
      </div>
    </nav>
  );
}
