'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { I18nProvider, hasCompletedOnboarding } from '@/utils/i18n';
import { VoicePreferencesProvider } from '@/utils/voicePreferences';
import { isLoggedIn, getToken, logout } from '@/utils/auth';
import useVersionCheck from '@/hooks/useVersionCheck';
import BottomNav from './BottomNav';
import InstallPrompt from './InstallPrompt';
import { dvAnalytics } from '@/utils/analytics';

const NO_NAV_ROUTES = ['/onboarding', '/login', '/support', '/privacy', '/how-it-works', '/about', '/blog', '/analytics', '/lullabies', '/pricing', '/upgrade/success', '/upgrade/cancelled', '/auth/verify', '/auth/claim'];
const PUBLIC_ROUTES = ['/onboarding', '/login', '/support', '/privacy', '/how-it-works', '/about', '/blog', '/analytics', '/lullabies', '/pricing', '/upgrade/success', '/upgrade/cancelled', '/auth/verify', '/auth/claim'];
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function isPublicRoute(pathname) {
  // Static public routes + shared story links + SEO pages
  return PUBLIC_ROUTES.includes(pathname)
    || pathname.startsWith('/player/')
    || pathname.startsWith('/stories/')
    || pathname.startsWith('/category/')
    || pathname.startsWith('/ages/')
    || pathname.startsWith('/blog/')
    || pathname === '/blog'
    || pathname.startsWith('/before-bed/');
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const tokenValidated = useRef(false);

  // Auto-reload on app open/foreground when a new deployment is detected.
  // Only checks on startup and visibility change — never mid-session.
  useVersionCheck();

  // Register service worker for PWA support (required for beforeinstallprompt on Chrome)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Analytics: track app open + session lifecycle
  useEffect(() => {
    dvAnalytics.track('app_open', {
      source: dvAnalytics.parseReferrer(),
      referrer: document.referrer || 'direct',
      isNewUser: dvAnalytics._isNewUser,
    });
    dvAnalytics.track('session_start', {
      sessionId: dvAnalytics.sessionId,
      isNewUser: dvAnalytics._isNewUser,
    });
    const handleUnload = () => dvAnalytics.endSession();
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  useEffect(() => {
    const isPublic = isPublicRoute(pathname);
    const isHome = pathname === '/';

    // Phase 0 step 1.5e — auth-flow gates fire UNIVERSALLY (including on
    // home), guarded only by pathname-exclusion against their own redirect
    // target so they don't infinite-loop. Hoisted above the isHome early
    // return because home was previously bypassing these gates entirely
    // (fresh signups landed on / instead of being routed to /onboarding).
    //
    // Tolerant of legacy users via strict-equality `=== false`:
    //   undefined falls through (legacy pre-backfill records)
    //   false redirects (post-fix new-signup state)
    //   true falls through (completed)
    //
    // The downstream `!isPublic && isLoggedIn()` block stays as defense
    // in depth — different shape (route-level access control) but
    // overlapping intent. Removing it would expose other PUBLIC_ROUTES
    // edge cases.
    if (isLoggedIn()) {
      let cachedUser = null;
      try { cachedUser = JSON.parse(localStorage.getItem('dreamweaver_user') || 'null'); } catch {}
      if (cachedUser && cachedUser.email_verified === false && pathname !== '/auth/claim') {
        router.replace('/auth/claim');
        return;
      }
      if (cachedUser && cachedUser.onboarding_complete === false && pathname !== '/onboarding') {
        router.replace('/onboarding');
        return;
      }
    }

    // Home page handles its own routing (landing vs app grid) — don't redirect
    if (isHome) {
      setChecked(true);
      // Still validate token if logged in
      if (isLoggedIn() && !tokenValidated.current) {
        tokenValidated.current = true;
        const token = getToken();
        fetch(`${API_URL}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => {
            if (res.status === 401) {
              logout();
            }
          })
          .catch(() => {});
      }
      return;
    }

    // Check onboarding completion — skip for public/static pages and shared story links
    if (!hasCompletedOnboarding() && !isPublic) {
      router.replace('/onboarding');
      return;
    }

    // Check login for protected routes — shared story links are accessible without login
    if (!isPublic && !isLoggedIn()) {
      router.replace('/login');
      return;
    }

    // Phase 0 step 1.5 — email_verified gate. Tolerant of legacy users:
    //   email_verified === false      → redirect to /auth/claim
    //   email_verified === undefined  → fall through (legacy pre-migration token)
    //   email_verified === true       → fall through (claimed)
    // The undefined branch is what makes the rolling deploy safe: legacy
    // users with valid old tokens enter the app normally; the migration
    // script's revocation later turns those tokens into 401s, which the
    // backend-level handler converts to logout → /login (NOT /auth/claim).
    //
    // Phase 0 onboarding gate (separate workstream, layered after the
    // email_verified gate). Tolerant of legacy users:
    //   onboarding_complete === false      → redirect to /onboarding
    //   onboarding_complete === undefined  → fall through (pre-backfill)
    //   onboarding_complete === true       → fall through (legacy + new completed)
    if (!isPublic && isLoggedIn()) {
      let cachedUser = null;
      try { cachedUser = JSON.parse(localStorage.getItem('dreamweaver_user') || 'null'); } catch {}
      if (cachedUser && cachedUser.email_verified === false) {
        router.replace('/auth/claim');
        return;
      }
      if (cachedUser && cachedUser.onboarding_complete === false) {
        router.replace('/onboarding');
        return;
      }
    }

    // Validate token against backend once per session.
    // If the token is stale (e.g. after a Docker restart that wiped tokens),
    // clear it and redirect to login so the user gets a fresh valid token.
    if (!isPublic && isLoggedIn() && !tokenValidated.current) {
      tokenValidated.current = true;
      const token = getToken();
      fetch(`${API_URL}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.status === 401) {
            console.warn('[AppShell] Token invalid — redirecting to login');
            logout();
            // Surface the reason on /login via banner so users understand
            // why they were bounced (vs silent logout-on-navigation UX).
            router.replace('/login?reason=session_expired');
          }
        })
        .catch(() => {
          // Network error — don't logout, just proceed offline
        });
    }

    setChecked(true);
  }, [pathname, router]);

  // Hide nav on public routes, player pages, SEO pages, and while checking auth
  // On home page (/), show nav for logged-in app users (story grid), hide for anonymous (landing page)
  const isSEOPage = pathname.startsWith('/stories/')
    || pathname.startsWith('/category/') || pathname.startsWith('/ages/')
    || pathname.startsWith('/blog/') || pathname === '/blog'
    || /^\/before-bed\/(silly-songs|poems)\//.test(pathname);
  const hasLandingParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'landing';
  const isLandingPage = pathname === '/' && (!isLoggedIn() || hasLandingParam);
  const showNav = !NO_NAV_ROUTES.includes(pathname) && !pathname.startsWith('/player/')
    && !isSEOPage && !isLandingPage && checked;

  return (
    <I18nProvider>
      <VoicePreferencesProvider>
        <div style={{ paddingBottom: showNav ? '72px' : '0' }}>
          {children}
        </div>
        {showNav && <BottomNav />}
        <InstallPrompt />
      </VoicePreferencesProvider>
    </I18nProvider>
  );
}
