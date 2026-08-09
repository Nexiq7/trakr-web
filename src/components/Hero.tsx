import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SearchBar } from './SearchBar';
import { GithubIcon } from './GithubIcon';
import { useAuth } from '../context/AuthContext';
import { REPO_URL } from '../lib/constants';

export const Hero = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  return (
    <section className="relative w-full overflow-hidden flex items-center justify-center px-6 pt-28 pb-16 min-h-[560px] md:h-[76vh] md:min-h-[600px]">
      {/* A single soft wash of brand colour, rather than any artwork to compete with. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -top-[22%] -translate-x-1/2 w-[860px] max-w-[150vw] aspect-square rounded-full bg-accent/14 blur-[150px]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative z-10 w-full max-w-xl flex flex-col items-center text-center gap-6 animate-fade-up">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="-mb-2 inline-flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-full bg-white/6 border border-white/10 text-[12.5px] font-medium text-white/50 hover:text-white hover:border-white/25 transition-colors duration-300 ease-apple"
        >
          <GithubIcon size={13} />
          Open source
          <span aria-hidden className="w-px h-3 bg-white/15" />
          MIT
        </a>

        <h1 className="text-[64px] md:text-[80px] leading-none font-semibold tracking-tight text-white">
          trakr
        </h1>

        <p className="text-[16px] md:text-[19px] leading-relaxed text-white/55 max-w-md">
          Everything you watch, in one place.
        </p>

        <SearchBar
          className="mt-1"
          value={query}
          onChange={setQuery}
          onSubmit={(term) => navigate(`/search?q=${encodeURIComponent(term)}`)}
        />

        <div className="flex items-center gap-3 text-[13.5px] text-white/40">
          <Link to="/discover" className="hover:text-white/80 transition-colors duration-300 ease-apple">
            Discover
          </Link>
          <span aria-hidden className="w-px h-3 bg-white/15" />
          <Link
            to={token ? '/watchlist' : '/login'}
            className="hover:text-white/80 transition-colors duration-300 ease-apple"
          >
            {token ? 'My collection' : 'Start tracking'}
          </Link>
        </div>
      </div>
    </section>
  );
};
