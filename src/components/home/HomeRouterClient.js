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
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/utils/auth';
import { hasCompletedOnboarding } from '@/utils/i18n';
import { isNativeApp as isNativeClient } from '@/utils/platformDetect';
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

// Native = the reliable WKWebView UA token (works on a fresh launch with no
// ?source=app) OR the legacy source=app / persisted-flag path. Browser visitors
// match NEITHER, so their routing is unchanged.
function isNative() {
  return isNativeClient() || isNativeApp();
}

function getInitialView() {
  if (typeof window === 'undefined') return 'landing';
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'landing') return 'landing';
    if (isNative()) return 'app';
    return hasCompletedOnboarding() ? 'app' : 'landing';
  } catch {
    return 'landing';
  }
}

export default function HomeRouterClient() {
  const router = useRouter();
  const [view, setView] = useState(getInitialView);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'landing') {
      setView('landing');
      return;
    }
    if (isNative()) {
      // Native clients never see the marketing page.
      // - native + onboarded   → app home (unchanged for existing users)
      // - native + NOT onboarded → onboarding (the fix; new App Store users)
      if (hasCompletedOnboarding()) {
        setView('app');
      } else {
        router.replace('/onboarding');
      }
      return;
    }
    // Non-native browser visitor — unchanged (onboarded → app, else marketing).
    setView(hasCompletedOnboarding() ? 'app' : 'landing');
  }, [router]);

  if (view === 'app') {
    return <HomeApp />;
  }

  return <LandingPage />;
}
