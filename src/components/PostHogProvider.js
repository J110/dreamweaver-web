'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

export default function PostHogProvider({ children }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    if (!posthog.__loaded) {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        ui_host: 'https://us.posthog.com',
        person_profiles: 'identified_only',
        autocapture: true,
        capture_pageview: false,
        capture_pageleave: true,
        disable_session_recording: true,
        loaded: (ph) => {
          if (process.env.NODE_ENV === 'development') ph.debug();
        },
      });
    }
    try {
      const raw = localStorage.getItem('dreamweaver_user');
      if (raw) {
        const user = JSON.parse(raw);
        const username = user?.username;
        const familyId = user?.family_id;
        if (familyId) {
          posthog.identify(familyId, {
            $set: { username },
            $set_once: { first_seen_at: new Date().toISOString() },
          });
        } else if (username) {
          // Pre-1.2 cached user record without family_id — keep commit 1.1
          // behavior. The next login response will include family_id and
          // setUser() will alias + re-identify.
          posthog.identify(username, {
            $set: { username },
            $set_once: { first_seen_at: new Date().toISOString() },
          });
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
