import { apiFetch } from './api';

const API = import.meta.env.VITE_API_URL;

export interface Title {
  id: string | number;
  name: string;
  year?: string;
  image?: string;
  overview?: string;
  score?: number;
  averageRuntime?: number;
  status?: { name?: string };
}

export interface SearchResult {
  tvdb_id: string;
  name: string;
  year?: string;
  type: 'series' | 'movie';
  image_url?: string;
  thumbnail?: string;
  overview?: string;
}

export interface Genre {
  id: number;
  name: string;
}

export type MediaType = 'series' | 'movie';

/** The URL path segment TVDB uses, which is plural for movies only. */
export function apiType(type: MediaType): 'series' | 'movies' {
  return type === 'movie' ? 'movies' : 'series';
}

// --- Cache -----------------------------------------------------------------
// Browsing this app is a loop: home -> details -> back -> details. Refetching
// the same rails on every return is what makes that loop feel slow, so
// responses are kept and served immediately, with a background refresh when
// they're past their prime. The server caches upstream too; this one exists to
// keep the *navigation* instant, not to spare TVDB.

interface CacheEntry<T> {
  data: T;
  storedAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();
const subscribers = new Map<string, Set<() => void>>();

/** Past this, cached data is still shown but refreshed behind the reader. */
const STALE_AFTER_MS = 5 * 60 * 1000;

function notify(key: string) {
  subscribers.get(key)?.forEach((fn) => fn());
}

export function subscribe(key: string, fn: () => void) {
  let set = subscribers.get(key);
  if (!set) {
    set = new Set();
    subscribers.set(key, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) subscribers.delete(key);
  };
}

/**
 * The stored entry itself, identity intact.
 *
 * Returning the entry rather than a fresh wrapper is what lets `useResource`
 * read this cache through `useSyncExternalStore`: that hook compares snapshots
 * by identity, and a new object per call would re-render forever.
 */
export function getEntry<T>(key: string): CacheEntry<T> | null {
  return (cache.get(key) as CacheEntry<T> | undefined) ?? null;
}

export function isStale(entry: CacheEntry<unknown> | null): boolean {
  return !entry || Date.now() - entry.storedAt > STALE_AFTER_MS;
}

/**
 * Fetch through the cache, collapsing concurrent callers onto one request.
 *
 * Rails on the home page and the command palette both ask for popular series;
 * without the in-flight map that's two requests for one answer.
 */
export function load<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetcher()
    .then((data) => {
      cache.set(key, { data, storedAt: Date.now() });
      notify(key);
      return data;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}

/** Drop a cached entry so the next read refetches — used after a mutation. */
export function invalidate(prefix: string) {
  for (const key of [...cache.keys()]) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      notify(key);
    }
  }
}

// --- Endpoints -------------------------------------------------------------

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API}${path}`, { signal });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

export type SortId = 'trending' | 'score' | 'firstAired' | 'name';

export interface BrowseParams {
  type: MediaType;
  sort: SortId;
  genres: number[];
}

/** Stable cache key — genre order must not change the identity of a query. */
export function browseKey({ type, sort, genres }: BrowseParams) {
  return `browse:${type}:${sort}:${[...genres].sort((a, b) => a - b).join(',')}`;
}

export function fetchBrowse({ type, sort, genres }: BrowseParams): Promise<Title[]> {
  const buildUrl = (genre?: number) => {
    const params = new URLSearchParams();
    if (sort === 'trending') {
      params.set('trending', '1');
    } else {
      params.set('sort', sort);
      params.set('sortType', sort === 'name' ? 'asc' : 'desc');
    }
    if (genre != null) params.set('genre', String(genre));
    return `/tvdb/browse/${apiType(type)}?${params}`;
  };

  // Several genres means "all of these", not "any". Browse results carry no
  // genre field to filter on, so ask per genre and intersect on id, keeping the
  // first response's order so the chosen sort survives.
  const urls = genres.length > 0 ? genres.map(buildUrl) : [buildUrl()];

  return Promise.all(
    urls.map((url) => getJson<{ data?: Title[] }>(url).then((json) => json.data || [])),
  ).then(([first = [], ...rest]) =>
    rest.reduce((acc, list) => {
      const ids = new Set(list.map((item) => String(item.id)));
      return acc.filter((item) => ids.has(String(item.id)));
    }, first),
  );
}

export const popularKey = (type: MediaType) => `popular:${type}`;

export function fetchPopular(type: MediaType): Promise<Title[]> {
  return getJson<{ data?: Title[] }>(`/tvdb/popular/${apiType(type)}`).then(
    (json) => json.data || [],
  );
}

export const trendingKey = (type: MediaType) => `trending:${type}`;

export function fetchTrending(type: MediaType): Promise<Title[]> {
  return getJson<{ data?: Title[] }>(`/tvdb/browse/${apiType(type)}?trending=1`).then(
    (json) => json.data || [],
  );
}

export const genresKey = 'genres';

export function fetchGenres(): Promise<Genre[]> {
  return getJson<{ data?: Genre[] }>('/tvdb/genres').then((json) =>
    (json.data || []).sort((a, b) => a.name.localeCompare(b.name)),
  );
}

export const searchKey = (query: string) => `search:${query.toLowerCase()}`;

export function fetchSearch(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  return getJson<{ data?: SearchResult[] }>(
    `/tvdb/search?q=${encodeURIComponent(query)}`,
    signal,
  ).then((json) => json.data || []);
}

export interface Episode {
  id: number;
  name?: string;
  overview?: string;
  seasonNumber: number;
  number: number;
  aired?: string;
  runtime?: number;
  image?: string;
}

export interface Artwork {
  /** TVDB artwork type: 3 is a wide background, 23 a title logo. */
  type: number;
  image: string;
  /** Null for textless art. */
  language?: string | null;
  score?: number;
}

const ARTWORK_BACKGROUND = 3;
const ARTWORK_LOGO = 23;

function best(artworks: Artwork[] | undefined, type: number, prefer: (art: Artwork) => boolean) {
  const candidates = (artworks ?? []).filter((art) => art.type === type);
  return (
    [...candidates].sort(
      (a, b) => Number(prefer(b)) - Number(prefer(a)) || (b.score ?? 0) - (a.score ?? 0),
    )[0]?.image ?? null
  );
}

/**
 * The wide background to show behind a title. Textless art wins: a background
 * with the title burned in fights the logo laid over it.
 */
export function pickBackdrop(media: Pick<MediaDetails, 'artworks'> | null | undefined) {
  return best(media?.artworks, ARTWORK_BACKGROUND, (art) => !art.language);
}

/** The title's logo, English where there is one. */
export function pickLogo(media: Pick<MediaDetails, 'artworks'> | null | undefined) {
  return best(media?.artworks, ARTWORK_LOGO, (art) => art.language === 'eng');
}

export interface Character {
  id: number;
  /** The actor. */
  personName?: string;
  /** The role they play — TVDB puts it in `name`. */
  name?: string;
  image?: string;
  sort: number;
}

/**
 * The extended record behind a details page.
 *
 * TVDB returns a great deal more than this; only the fields the page actually
 * renders are declared, which is what keeps the page free of `any` without
 * pretending to mirror an upstream schema we don't control.
 */
export interface MediaDetails {
  id: number;
  name: string;
  year?: string;
  image?: string;
  overview?: string;
  averageRuntime?: number;
  runtime?: number;
  status?: { name?: string };
  genres?: Genre[];
  tags?: { name: string }[];
  artworks?: Artwork[];
  characters?: Character[];
  contentRatings?: { country: string; name: string }[];
  originalNetwork?: { name?: string };
  trailers?: { language: string; url: string }[];
  episodes?: Episode[];
}

export const detailsKey = (type: MediaType, id: string) => `details:${type}:${id}`;

export function fetchDetails(type: MediaType, id: string): Promise<MediaDetails> {
  return getJson<{ data?: MediaDetails }>(`/tvdb/details/${apiType(type)}/${id}`).then(
    (json) => json.data as MediaDetails,
  );
}

// --- Watchlist -------------------------------------------------------------

export type WatchStatus = 'watching' | 'planning' | 'completed' | 'dropped';

export interface WatchlistEntry {
  id: number;
  mediaId: string;
  type: string;
  status: WatchStatus;
  score: number;
  createdAt?: string;
  /** The title's extended record, trimmed to what the collection renders. */
  details?: {
    name?: string;
    image?: string;
    year?: string;
    overview?: string;
    genres?: Genre[];
    originalNetwork?: { name?: string };
  } | null;
}

export const WATCHLIST_KEY = 'watchlist';

export async function fetchWatchlist(): Promise<WatchlistEntry[]> {
  const res = await apiFetch('/api/watchlist-details');
  if (!res.ok) throw new Error('Could not load collection');
  return (await res.json()) as WatchlistEntry[];
}

export async function trackMedia(payload: {
  mediaId: string;
  type: string;
  status: string;
  score: number;
}): Promise<WatchlistEntry> {
  const res = await apiFetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Could not save');
  return (await res.json()) as WatchlistEntry;
}

export async function untrackMedia(mediaId: string): Promise<void> {
  const res = await apiFetch(`/api/track/${mediaId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Could not remove');
}

/** The `${type}-${id}` composite the API keys watchlist rows by. */
export function mediaKey(type: string, id: string | number) {
  return `${type}-${id}`;
}

/** The bare TVDB id back out of a stored `mediaId`. */
export function idFromMediaKey(mediaId: string) {
  const dash = mediaId.indexOf('-');
  return dash === -1 ? mediaId : mediaId.slice(dash + 1);
}
