// Durable native-ness gates. The DreamValleyApp UA is the ONLY native signal
// that survives WKWebView clearing localStorage or a client nav dropping
// ?source=app, so any "is this an app user" decision trusts the UA first and
// treats the dreamvalley_native_app flag / source=app param as best-effort.
// Used by AppShell (showNav home-gate + anon-mint gate) and InstallPrompt.

export function isAppUser({ isNative = false, sourceApp = false, nativeFlag = false, onboarded = false } = {}) {
  // isNative (UA) is durable; the rest are volatile-but-acceptable extras.
  return Boolean(isNative || sourceApp || nativeFlag || onboarded);
}

// Home is the marketing landing page ONLY for a fresh web visitor with no app
// signal. A native app user (UA) is NEVER the landing page.
export function isLandingHome({ pathname, isNative = false, forceLanding = false, sourceApp = false, nativeFlag = false, onboarded = false }) {
  if (pathname !== '/') return false;
  if (isNative) return false;          // native UA → always the app, never landing (durable)
  if (forceLanding) return true;       // web-only explicit ?view=landing
  return !isAppUser({ isNative, sourceApp, nativeFlag, onboarded });
}
