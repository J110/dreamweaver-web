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
        if (user?.username) {
          posthog.identify(user.username, {
            $set: { username: user.username },
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
