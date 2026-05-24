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

function getInitialView() {
  if (typeof window === 'undefined') return 'landing';
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'landing') return 'landing';
    if (params.get('source') === 'app') return 'app';
    try { if (localStorage.getItem('dreamvalley_native_app') === '1') return 'app'; } catch {}
    return hasCompletedOnboarding() ? 'app' : 'landing';
  } catch {
    return 'landing';
  }
}

export default function Home() {
  const [view, setView] = useState(getInitialView);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'landing') {
      setView('landing');
      return;
    }
    if (isNativeApp()) {
      setView('app');
      return;
    }
    setView(hasCompletedOnboarding() ? 'app' : 'landing');
  }, []);

  if (view === 'app') {
    return <HomeApp />;
  }

  return <LandingPage />;
}
