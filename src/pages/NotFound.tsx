import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

/**
 * Anything that isn't a route. Previously these fell through to a blank shell,
 * which looks like the app broke rather than like a wrong address.
 */
export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[64px] font-semibold tracking-tight text-white/12 leading-none">404</p>
      <h1 className="text-[22px] font-semibold tracking-tight">This page doesn't exist</h1>
      <p className="text-white/45 text-[14px] max-w-sm">
        The link may be out of date, or the title may have moved.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3">
        <Link
          to="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-[13.5px] font-semibold hover:bg-white/90 transition-colors duration-300 ease-apple"
        >
          <Home size={15} /> Home
        </Link>
        <Link
          to="/discover"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/8 border border-white/12 text-[13.5px] font-semibold text-white/80 hover:text-white hover:bg-white/14 transition-colors duration-300 ease-apple"
        >
          <Compass size={15} /> Discover
        </Link>
      </div>
    </div>
  );
}
