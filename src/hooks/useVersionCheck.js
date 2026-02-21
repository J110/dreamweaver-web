'use client';

import { useEffect, useRef } from 'react';

/**
 * Checks /version.json on app startup to see if a new build is available.
 * If the server's build ID differs from the one baked into this bundle,
 * it means a new deployment happened — reload the page so the user
 * gets the latest code automatically.
 *
 * Only triggers on:
 * - Initial app load (after a short delay)
 * - Window focus after being backgrounded (e.g. iOS app foregrounded)
 *
 * Never triggers during active use — only on "app open" moments.
 * Skips if no NEXT_PUBLIC_BUILD_ID (dev mode).
 */
const CURRENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID;

export default function useVersionCheck() {
  const hasCheckedOnLoad = useRef(false);

  useEffect(() => {
    if (!CURRENT_BUILD_ID) return;

    async function checkVersion() {
      try {
        const res = await fetch(`/version.json?_t=${Date.now()}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.buildId && data.buildId !== CURRENT_BUILD_ID) {
          console.log(
            `[VersionCheck] New build detected: ${data.buildId} (current: ${CURRENT_BUILD_ID}). Reloading...`
          );
          window.location.reload();
        }
      } catch {
        // Network error — silently ignore
      }
    }

    // Check once on initial load (small delay to let the page render first)
    const initialTimeout = setTimeout(() => {
      if (!hasCheckedOnLoad.current) {
        hasCheckedOnLoad.current = true;
        checkVersion();
      }
    }, 3_000);

    // Check when user returns to the app (tab focus, iOS app foreground)
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimeout(initialTimeout);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);
}
