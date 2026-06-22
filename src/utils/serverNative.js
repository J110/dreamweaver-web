import { headers } from 'next/headers';
import { NATIVE_UA } from './nativeUA';

/**
 * Server-side native detection — THE chokepoint every purchase-surface
 * render must consult so the surface is ABSENT from a native request's
 * HTML (not present-and-hidden). Reads the durable UA from request
 * headers + the ?source=app flag from searchParams. Both are available
 * on the very first cold-load request, before any render.
 *
 * Server Components only (uses next/headers). Client components receive
 * the result as a prop. NEVER consults localStorage.
 */
export function isNativeRequest(searchParams) {
  let ua = '';
  try {
    ua = headers().get('user-agent') || '';
  } catch {
    // headers() unavailable (shouldn't happen in a server component render)
  }
  if (NATIVE_UA.test(ua)) return true;
  const src = searchParams?.source;
  return src === 'app' || (Array.isArray(src) && src.includes('app'));
}
