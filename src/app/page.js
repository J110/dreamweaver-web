'use client';

/**
 * Home Page — Routes between Landing Page (anonymous) and App (authenticated).
 *
 * Routing logic:
 *  1. Native app (WebView) — `?source=app` flag → always show app grid
 *  2. Logged-in user — auth token present → show app grid
 *  3. Returning user (completed onboarding but not logged in) → show landing with login CTA
 *  4. New browser visitor — no auth, no cookies → show landing page
 *
 * SSR: Both LandingPage and HomeApp are 'use client' components, but Next.js
 * still server-renders them. The default render (before hydration) shows the
 * landing page, so Google's crawler sees the marketing content.
 */

import { useState, useEffect } from 'react';
import { isLoggedIn } from '@/utils/auth';
import { hasCompletedOnboarding } from '@/utils/i18n';
import LandingPage from '@/components/landing/LandingPage';
import HomeApp from '@/components/HomeApp';

function isNativeApp() {
  if (typeof window === 'undefined') return false;
  // Check URL param (set by Flutter WebView wrapper)
  const params = new URLSearchParams(window.location.search);
  if (params.get('source') === 'app') {
    // Persist the flag so subsequent navigations skip the landing page
    try { localStorage.setItem('dreamvalley_native_app', '1'); } catch {}
    return true;
  }
  // Check persisted flag
  try { return localStorage.getItem('dreamvalley_native_app') === '1'; } catch {}
  return false;
}

export default function Home() {
  // Default to 'app' — marketing landing lives at /welcome now. Anonymous
  // visitors are routed to /onboarding by AppShell before this renders if
  // they haven't picked a language yet.
  const [view, setView] = useState('app');

  useEffect(() => {
    // Override: ?view=landing forces the landing page for anyone
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'landing') {
      setView('landing');
      return;
    }
    // Default: anyone visiting / sees the content grid. Marketing landing
    // lives at /welcome for ad campaigns. AnonLanguagePicker handles the
    // first-visit language gate for anonymous users.
    setView('app');
  }, []);

  if (view === 'app') {
    return <HomeApp />;
  }

  return <LandingPage />;
}
