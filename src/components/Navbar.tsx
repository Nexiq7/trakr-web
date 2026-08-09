import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Library, Search, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/watchlist', label: 'Collection', icon: Library },
  { to: '/search', label: 'Search', icon: Search },
];

export const Navbar = () => {
  const { token, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initial = user?.username?.[0]?.toUpperCase() ?? '?';

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] px-4 md:px-8 py-4">
      <div className="w-1/5 min-w-fit mx-auto flex items-center justify-between gap-24 bg-surface/62 backdrop-blur-2xl [backdrop-filter:blur(28px)_saturate(180%)] border border-white/10 px-4 py-2.5 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.5)] whitespace-nowrap">

        <Link to="/" className="shrink-0">
          <span className="text-[18px] font-semibold tracking-tight text-white">trakr</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  title={link.label}
                  aria-label={link.label}
                  className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors duration-300 ease-apple ${
                    active ? 'bg-white/11 text-white' : 'text-white/55 hover:text-white'
                  }`}
                >
                  <link.icon size={17} />
                </Link>
              );
            })}
          </div>

          {token ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3a3a3e] to-[#232326] border border-white/14 flex items-center justify-center text-[13px] font-semibold text-white/85 hover:border-white/30 transition focus:outline-none"
              >
                {initial}
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-3 w-52 bg-surface/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] py-2 animate-fade-up">
                  <div className="px-4 py-2 mb-1">
                    <p className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">Account</p>
                    <p className="text-sm text-white/85 font-medium mt-0.5 truncate">{user?.username}</p>
                  </div>
                  <div className="h-px bg-white/8 mx-2 mb-1" />
                  <button
                    onClick={() => {
                      logout();
                      setIsDropdownOpen(false);
                      navigate('/');
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition"
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-accent-strong text-white text-[13px] font-semibold px-4 py-2 rounded-full hover:brightness-110 transition shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
