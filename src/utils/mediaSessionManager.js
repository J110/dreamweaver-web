/**
 * Media Session Manager — Lock screen / Now Playing integration
 * via the Web Media Session API.
 *
 * Handles:
 * - Setting metadata (title, artist, artwork) for the lock screen
 * - Registering action handlers (play, pause, seek) for lock screen controls
 * - Updating playback state and position
 * - Converting SVG cover art to PNG data URLs (Android needs self-contained URLs;
 *   blob URLs are page-scoped and can't be fetched by the OS notification system)
 */

// Cache rasterized cover data URLs to avoid re-rendering
const _artworkCache = new Map();

// Fallback app icon for lock screen when cover art fails to load
const FALLBACK_ICON = '/icon-512x512.png';

/**
 * Rasterize an SVG (or any image) URL to a PNG data URL using an offscreen canvas.
 * Uses data URLs instead of blob URLs because Android's notification system
 * renders lock screen artwork out-of-process and can't access blob: URLs.
 *
 * @param {string} imgUrl - URL like "/covers/sleepy-cloud.svg" or "/icon-512x512.png"
 * @param {number} size - Target square size in pixels (default 512)
 * @returns {Promise<string|null>} Data URL of rasterized PNG, or null
 */
async function rasterizeCover(imgUrl, size = 512) {
  if (!imgUrl || imgUrl.includes('default.svg')) return null;

  const cacheKey = `${imgUrl}_${size}`;
  if (_artworkCache.has(cacheKey)) return _artworkCache.get(cacheKey);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);

        // Use toDataURL instead of toBlob — produces a self-contained
        // data:image/png;base64,... string that works across processes
        const dataUrl = canvas.toDataURL('image/png');
        if (dataUrl && dataUrl !== 'data:,') {
          _artworkCache.set(cacheKey, dataUrl);
          resolve(dataUrl);
        } else {
          resolve(null);
        }
      } catch (err) {
        console.warn('[MediaSession] Cover rasterization failed:', err.message);
        resolve(null);
      }
    };

    img.onerror = () => {
      console.warn('[MediaSession] Could not load cover:', imgUrl);
      resolve(null);
    };

    // Convert relative paths to absolute URLs
    img.src = imgUrl.startsWith('http') ? imgUrl : `${window.location.origin}${imgUrl}`;
  });
}

/**
 * Update Media Session metadata for the lock screen / Now Playing widget.
 *
 * @param {Object} params
 * @param {string} params.title - Story title
 * @param {string} params.artist - "Dream Valley"
 * @param {string} params.album - Content type label e.g. "Bedtime Story"
 * @param {string|null} params.coverUrl - SVG or raster cover URL
 */
export async function updateMediaSessionMetadata({ title, artist, album, coverUrl }) {
  if (!('mediaSession' in navigator)) return;

  let artwork = [];

  if (coverUrl && !coverUrl.includes('default.svg')) {
    // Rasterize cover at multiple sizes for best lock screen display
    const sizes = [512, 256, 128];
    const results = await Promise.all(sizes.map(s => rasterizeCover(coverUrl, s)));

    results.forEach((url, i) => {
      if (url) {
        artwork.push({ src: url, sizes: `${sizes[i]}x${sizes[i]}`, type: 'image/png' });
      }
    });
  }

  // Fallback: if no cover art available or rasterization failed, use the app icon.
  // This ensures Android always shows *something* instead of "a website is playing".
  if (artwork.length === 0) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    artwork = [
      { src: `${origin}${FALLBACK_ICON}`, sizes: '512x512', type: 'image/png' },
    ];
  }

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || 'Dream Valley Story',
      artist: artist || 'Dream Valley',
      album: album || 'Bedtime Stories',
      artwork,
    });
  } catch (err) {
    console.warn('[MediaSession] Failed to set metadata:', err.message);
  }
}

/**
 * Register Media Session action handlers.
 * Maps lock screen button presses to app callbacks.
 *
 * @param {Object} handlers
 * @param {Function} handlers.onPlay
 * @param {Function} handlers.onPause
 * @param {Function} [handlers.onSeekBackward]
 * @param {Function} [handlers.onSeekForward]
 */
export function registerMediaSessionHandlers({ onPlay, onPause, onSeekBackward, onSeekForward }) {
  if (!('mediaSession' in navigator)) return;

  const trySet = (action, handler) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch (err) {
      console.warn(`[MediaSession] Handler '${action}' not supported`);
    }
  };

  trySet('play', onPlay);
  trySet('pause', onPause);
  if (onSeekBackward) trySet('seekbackward', onSeekBackward);
  if (onSeekForward) trySet('seekforward', onSeekForward);

  // Disable next/previous track (not applicable for stories)
  trySet('previoustrack', null);
  trySet('nexttrack', null);
}

/**
 * Update the playback state shown on the lock screen.
 * @param {'playing'|'paused'|'none'} state
 */
export function updatePlaybackState(state) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = state;
  } catch {}
}

/**
 * Update the position state (progress bar on lock screen).
 * @param {number} position - Current position in seconds
 * @param {number} duration - Total duration in seconds
 * @param {number} [playbackRate=1.0]
 */
export function updatePositionState(position, duration, playbackRate = 1.0) {
  if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
  if (!duration || isNaN(duration) || duration <= 0) return;

  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate,
      position: Math.min(Math.max(0, position), duration),
    });
  } catch (err) {
    // Some browsers throw if position > duration due to timing
  }
}

/**
 * Clean up: remove handlers and metadata.
 */
export function clearMediaSession() {
  if (!('mediaSession' in navigator)) return;

  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
  } catch {}

  const actions = ['play', 'pause', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack'];
  for (const action of actions) {
    try { navigator.mediaSession.setActionHandler(action, null); } catch {}
  }
}
