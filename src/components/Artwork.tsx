import { useCallback, useState } from 'react';
import { Film } from 'lucide-react';
import { artworkSources, type ArtworkKind } from '../lib/images';

interface ArtworkProps {
  image?: string | null;
  alt: string;
  /** Rendered width in CSS pixels — decides which source the browser picks. */
  displayWidth: number;
  /** Posters and wide backgrounds are stored at different sizes. */
  kind?: ArtworkKind;
  /** Above-the-fold artwork skips lazy loading and asks for high priority. */
  priority?: boolean;
  className?: string;
  /** Applied to the <img> itself, e.g. a hover scale from the parent card. */
  imgClassName?: string;
}

type LoadState = 'loading' | 'loaded' | 'failed';

/**
 * A single piece of artwork, with the loading state it needs to not look broken.
 *
 * Three things happen here that a bare `<img>` doesn't do:
 *
 * - The shimmer underneath stays until the bytes decode, so a slow image is a
 *   lit placeholder rather than a hole in the grid.
 * - The image fades in instead of popping, and only once — an image already in
 *   the browser cache is complete before it can fire a load event, so it
 *   renders opaque immediately rather than flashing through a fade.
 * - A failed load falls back to the hatch rather than a broken-image glyph.
 */
export function Artwork({
  image,
  alt,
  displayWidth,
  kind = 'poster',
  priority = false,
  className = '',
  imgClassName = '',
}: ArtworkProps) {
  const sources = artworkSources(image, displayWidth, kind);
  const src = sources?.src ?? null;

  const [state, setState] = useState<LoadState>('loading');
  // Whether this particular image was already decoded when it mounted. A
  // cached image should not animate; a fresh one should.
  const [instant, setInstant] = useState(false);

  // Pointing at a different image restarts the cycle. Adjusting during render
  // rather than in an effect means the new image never paints for a frame in
  // the old one's "loaded" state.
  const [renderedSrc, setRenderedSrc] = useState(src);
  if (renderedSrc !== src) {
    setRenderedSrc(src);
    setState('loading');
    setInstant(false);
  }

  // A cached image can be complete before React attaches a load handler, which
  // would leave it stuck behind the shimmer. The element is keyed by its source
  // so this runs afresh for each one.
  const attach = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) {
      setInstant(true);
      setState('loaded');
    }
  }, []);

  const showPlaceholder = !sources || state !== 'loaded';

  // Callers often position the frame themselves (`absolute inset-0` for a
  // backdrop). The default `relative` must stand aside then: both classes on one
  // element and `relative` wins in the stylesheet, dropping the frame into
  // normal flow where it pushes everything after it out of view.
  const positioned = /(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className);

  return (
    <div
      className={`${positioned ? '' : 'relative'} overflow-hidden bg-surface ${className}`}
    >
      {showPlaceholder && (
        <div
          aria-hidden
          className={`absolute inset-0 art-placeholder ${
            state === 'loading' && sources ? 'art-loading' : ''
          }`}
        >
          {(!sources || state === 'failed') && (
            <div className="absolute inset-0 flex items-center justify-center text-white/15">
              <Film size={Math.max(16, Math.min(30, displayWidth / 6))} />
            </div>
          )}
        </div>
      )}

      {sources && state !== 'failed' && (
        <img
          key={sources.src}
          ref={attach}
          src={sources.src}
          srcSet={sources.srcSet}
          sizes={sources.sizes}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setState('loaded')}
          onError={() => setState('failed')}
          // Pinned to the frame, so artwork whose file isn't exactly the frame's
          // ratio is cropped to fit instead of leaving a strip uncovered.
          className={`absolute inset-0 w-full h-full object-cover ${
            instant ? '' : 'transition-opacity duration-500 ease-apple'
          } ${state === 'loaded' ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        />
      )}
    </div>
  );
}
