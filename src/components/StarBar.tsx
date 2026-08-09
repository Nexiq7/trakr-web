import { Star } from 'lucide-react';
import { GithubIcon } from './GithubIcon';
import { Reveal } from './Reveal';
import { REPO_URL } from '../lib/constants';

/**
 * The GitHub ask on its own, for people already signed in — they're the likeliest
 * to star the repo, but they've no use for the feature pitch in <Bento />.
 */
export function StarBar() {
  return (
    <section className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 pb-16 md:pb-20">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-white/[0.035] px-6 md:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
          />

          <div className="flex items-center gap-3.5">
            <span
              aria-hidden
              className="w-10 h-10 shrink-0 rounded-full bg-accent/12 border border-accent/25 flex items-center justify-center text-accent"
            >
              <Star size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-[14.5px] font-semibold tracking-tight text-white">
                trakr is open source, MIT licensed
              </p>
              <p className="mt-0.5 text-[12.5px] text-white/40">A star helps more people find it.</p>
            </div>
          </div>

          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center justify-center gap-2.5 px-5 py-3 rounded-full bg-white text-black text-[13.5px] font-semibold hover:bg-white/90 transition-colors duration-300 ease-apple"
          >
            <GithubIcon size={16} />
            Star on GitHub
          </a>
        </div>
      </Reveal>
    </section>
  );
}
