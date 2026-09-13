/**
 * Artwork URLs.
 *
 * TVDB stores every image at full size *and* at a `_t` thumbnail — the same
 * path with `_t` inserted before the extension. The difference is not small: a
 * poster is typically 680x1000 at ~480KB, its thumbnail 340x500 at ~45KB. A
 * 24-card grid that loads full posters pulls ~11MB for artwork that renders at
 * 170px wide; the same grid on thumbnails pulls ~1MB and looks identical.
 *
 * So: ask for the thumbnail everywhere the image renders small, and let
 * `srcSet` promote to the full file only where a wide viewport actually has the
 * pixels to show it.
 */

const ARTWORK_HOST = 'https://artworks.thetvdb.com';

/** Absolute artwork URL, or null when there's no artwork to show. */
export function resolveImage(image?: string | null): string | null {
  if (!image) return null;
  const trimmed = image.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('http') ? trimmed : `${ARTWORK_HOST}${trimmed}`;
}

/**
 * The `_t` variant of an artwork URL.
 *
 * Only rewrites TVDB artwork with a recognised image extension — anything else
 * (a foreign host, an extensionless URL) is returned untouched, because the
 * thumbnail convention is TVDB's and guessing elsewhere produces 404s.
 */
export function thumbnailUrl(url: string | null): string | null {
  if (!url) return null;
  if (!url.startsWith(ARTWORK_HOST)) return url;
  if (url.includes('_t.')) return url;
  return url.replace(/\.(jpg|jpeg|png|webp)(\?.*)?$/i, '_t.$1$2');
}

export interface ArtworkSources {
  src: string;
  /** Omitted when there's no distinct thumbnail — a srcSet of one entry is noise. */
  srcSet?: string;
  sizes?: string;
}

/**
 * The widths TVDB stores each kind of artwork at. Posters are 680x1000 with a
 * 340x500 thumbnail; wide backgrounds are 1920x1080 with a 640x360 one. The
 * `w` descriptors in a srcSet have to be right for the browser to pick well.
 */
export type ArtworkKind = 'poster' | 'backdrop';

const WIDTHS: Record<ArtworkKind, { thumb: number; full: number }> = {
  poster: { thumb: 340, full: 680 },
  backdrop: { thumb: 640, full: 1920 },
};

/**
 * Sources for artwork that renders at `displayWidth` CSS pixels.
 *
 * The thumbnail covers a 170px poster card at 2x, or a 320px backdrop card. Above
 * that the browser picks the full file on its own — `srcSet` describes both and
 * lets the device's pixel ratio and the `sizes` hint decide.
 */
export function artworkSources(
  image: string | null | undefined,
  displayWidth: number,
  kind: ArtworkKind = 'poster',
): ArtworkSources | null {
  const full = resolveImage(image);
  if (!full) return null;

  const thumb = thumbnailUrl(full);
  if (!thumb || thumb === full) return { src: full };

  const widths = WIDTHS[kind];
  return {
    src: thumb,
    srcSet: `${thumb} ${widths.thumb}w, ${full} ${widths.full}w`,
    sizes: `${displayWidth}px`,
  };
}

/**
 * Warm the browser cache for artwork we're about to show.
 *
 * Used for the hero's next slide and for details pages on hover: by the time
 * the transition runs the bytes are already there, so the image doesn't fade in
 * from grey while everything else is moving.
 */
const prefetched = new Set<string>();

export function prefetchImage(url: string | null | undefined) {
  if (!url || prefetched.has(url)) return;
  prefetched.add(url);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
}
