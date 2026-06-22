/**
 * Single source of truth for "is this request from the native app?".
 * Pure (no next/headers) so it's safe to import from BOTH middleware
 * (edge runtime) and server components. The native shell always sends a
 * DreamValleyApp/<version> User-Agent — we trust the durable UA, never
 * localStorage (the fragility class we removed).
 *
 * This module is the compliance chokepoint for hiding the web purchase
 * surface from native. It is intentionally independent of the
 * download-badge code, which is NOT gated (app-store links are not a
 * purchase pathway and render for everyone).
 */
export const NATIVE_UA = /DreamValleyApp\/[\d.]+/i;

export function isNativeUA(ua) {
  return NATIVE_UA.test(ua || '');
}
