import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Search, Library, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/watchlist', label: 'Collection', icon: Library },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleAccountTap = () => {
    if (!token) {
      navigate('/login');
      return;
    }
    setAccountOpen((v) => !v);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 md:hidden" ref={wrapRef}>
      {accountOpen && (
        <div className="mx-auto mb-3 w-48 rounded-2xl bg-surface/95 backdrop-blur-2xl border border-white/10 shadow-[0_14px_40px_rgba(0,0,0,0.6)] py-2 animate-fade-up">
          <p className="px-4 py-1.5 text-[11px] font-medium text-white/40 truncate">
            {user?.username ?? 'Account'}
          </p>
          <button
            onClick={() => {
              logout();
              setAccountOpen(false);
              navigate('/');
            }}
            className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-400 active:bg-red-500/10 transition"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}

      <div className="flex items-center justify-around px-2 py-2 rounded-[26px] bg-surface/72 backdrop-blur-2xl border border-white/10 shadow-[0_14px_40px_rgba(0,0,0,0.6)]">
        {TABS.map((tab) => {
          const active = location.pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex flex-col items-center gap-1.5 px-3 py-1"
            >
              <tab.icon size={19} strokeWidth={2} className={active ? 'text-accent' : 'text-white/45'} />
              <span className={`text-[10.5px] font-medium ${active ? 'text-accent' : 'text-white/45'}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}

        <button onClick={handleAccountTap} className="flex flex-col items-center gap-1.5 px-3 py-1">
          <User size={19} strokeWidth={2} className={accountOpen ? 'text-accent' : 'text-white/45'} />
          <span className={`text-[10.5px] font-medium ${accountOpen ? 'text-accent' : 'text-white/45'}`}>
            You
          </span>
        </button>
      </div>
    </nav>
  );
};
