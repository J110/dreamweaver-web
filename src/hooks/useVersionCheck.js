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
const RELOAD_ATTEMPT_KEY = 'dv_build_reload_attempt';

export function shouldReloadForBuild({ currentBuildId, serverBuildId, attemptedBuildId }) {
  return Boolean(
    serverBuildId
    && serverBuildId !== currentBuildId
    && serverBuildId !== attemptedBuildId
  );
}

export default function useVersionCheck() {
  const hasCheckedOnLoad = useRef(false);

  useEffect(() => {
    if (!CURRENT_BUILD_ID) return;

    async function checkVersion() {
      try {
        const res = await fetch(`/version.json?_t=${Date.now()}`);
        if (!res.ok) return;

        const data = await res.json();
        let attemptedBuildId = null;
        try {
          attemptedBuildId = window.sessionStorage.getItem(RELOAD_ATTEMPT_KEY);
          if (data.buildId === CURRENT_BUILD_ID) {
            window.sessionStorage.removeItem(RELOAD_ATTEMPT_KEY);
          }
        } catch {
          return;
        }
        if (shouldReloadForBuild({
          currentBuildId: CURRENT_BUILD_ID,
          serverBuildId: data.buildId,
          attemptedBuildId,
        })) {
          console.log(
            `[VersionCheck] New build detected: ${data.buildId} (current: ${CURRENT_BUILD_ID}). Reloading...`
          );
          window.sessionStorage.setItem(RELOAD_ATTEMPT_KEY, data.buildId);
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
