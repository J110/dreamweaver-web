'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { I18nProvider, hasCompletedOnboarding } from '@/utils/i18n';
import { VoicePreferencesProvider } from '@/utils/voicePreferences';
import { isLoggedIn, setToken, setUser, tryAdoptNativeToken } from '@/utils/auth';
import useVersionCheck from '@/hooks/useVersionCheck';
import BottomNav from './BottomNav';
import InstallPrompt from './InstallPrompt';
import { isNativeApp } from '@/utils/platformDetect';
import BedtimePopup from './BedtimePopup';
import { dvAnalytics } from '@/utils/analytics';

const NO_NAV_ROUTES = ['/onboarding', '/login', '/restore', '/support', '/privacy', '/how-it-works', '/about', '/blog', '/analytics', '/lullabies', '/pricing', '/upgrade', '/upgrade/success', '/upgrade/cancelled', '/auth/verify', '/auth/claim', '/welcome'];
const PUBLIC_ROUTES = ['/onboarding', '/login', '/restore', '/support', '/privacy', '/how-it-works', '/about', '/blog', '/analytics', '/lullabies', '/pricing', '/upgrade', '/upgrade/success', '/upgrade/cancelled', '/auth/verify', '/auth/claim', '/welcome'];

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

  const anonMintTried = useRef(false);
  useEffect(() => {
    if (anonMintTried.current) return;
    anonMintTried.current = true;
    if (typeof window === 'undefined') return;
    if (isLoggedIn()) return; // already holds a token
    // Don't mint on identity-handling routes — onboarding/auth/login own it.
    const path = window.location.pathname;
    if (path.startsWith('/onboarding') || path.startsWith('/auth/') || path.startsWith('/login') || path.startsWith('/restore')) return;

    (async () => {
      // Native cold-start: adopt a Keychain-stored token (the READ half of the
      // native auth bridge) BEFORE minting. A returning native user whose
      // localStorage was wiped but whose Keychain survived logs into their REAL
      // family instead of a fresh anon account. readToken()→null (no stored
      // token) falls through to the device-mint below (the new-user path).
      let adopted = false;
      try { adopted = await tryAdoptNativeToken(); } catch { adopted = false; }
      if (adopted) {
        // setToken/setUser write localStorage but don't re-render React, so
        // components mounted during the async wait keep their anon fetches.
        // Reload ONCE (guarded) so everything re-fetches with the token; post-
        // reload isLoggedIn() is true → this effect returns early → no loop.
        try {
          if (!sessionStorage.getItem('dv_native_adopted')) {
            sessionStorage.setItem('dv_native_adopted', '1');
            window.location.reload();
          }
        } catch { /* ignore */ }
        return;
      }

      // Re-mint ONLY users viewing the app, never brand-new marketing visitors.
      // Mirror the app-vs-landing decision (app/page.js): completed onboarding,
      // the installed-app flag, or an explicit app entry. hasCompletedOnboarding()
      // alone is insufficient — a native user whose cached profile was wiped by
      // logout() falls to the anon branch (needs lang+username+age) and would
      // strand; the native flag survives logout, so it catches that case.
      let nativeApp = false;
      try { nativeApp = localStorage.getItem('dreamvalley_native_app') === '1'; } catch {}
      const sourceApp = new URLSearchParams(window.location.search).get('source') === 'app';
      if (!hasCompletedOnboarding() && !nativeApp && !sourceApp) return;
      // Username is cosmetic: chosen anon name → cached user → friendly fallback.
      let username = '';
      try { username = localStorage.getItem('dreamvalley_anon_username') || ''; } catch {}
      if (!username) {
        try { username = (JSON.parse(localStorage.getItem('dreamweaver_user') || 'null') || {}).username || ''; } catch {}
      }
      if (!username) username = 'friend';
      let age = null;
      try { age = parseInt(localStorage.getItem('dreamvalley_child_age') || '', 10) || null; } catch {}
      try {
        const { authApi } = await import('@/utils/api');
        const res = await authApi.deviceAccount(username, { child_age: age });
        if (res && res.token) {
          setToken(res.token);
          setUser({ ...(res.user || {}), onboarding_complete: true });
        }
      } catch { /* offline — retry next load */ }
    })();
  }, []);

  // Register service worker for PWA support (required for beforeinstallprompt on Chrome)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // In the native WKWebView, Flutter re-composites the web layer every frame
  // the page isn't static, so continuous CSS animation (StarField, etc.) taxes
  // the in-app UI thread far more than Safari (which draws WebKit directly).
  // Mark native → CSS freezes animations (globals.css html[data-native]).
  // Web / Android / mobile-Safari are unaffected.
  useEffect(() => {
    if (isNativeApp()) {
      try { document.documentElement.setAttribute('data-native', ''); } catch { /* ignore */ }
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

    // Onboarding gate applies to every user (anon and logged-in) and
    // fires UNIVERSALLY including on /. Anon profiles live in
    // localStorage; logged-in users mirror them on submit so
    // hasCompletedOnboarding() works uniformly. Hoisted above the
    // isHome branch so fresh anon visitors don't land on HomeApp
    // without a profile.
    if (!hasCompletedOnboarding() && !isPublic && !isHome) {
      router.replace('/onboarding');
      return;
    }

    // Home page handles its own routing (landing vs app grid) — don't redirect
    if (isHome) {
      setChecked(true);
      // Still validate token if logged in
      if (isLoggedIn() && !tokenValidated.current) {
        tokenValidated.current = true;
        // Validate through fetchApi so a lapsed-but-renewable token RENEWS
        // (365d sliding) instead of being logged out. Only a 410-dormant
        // verdict logs out + redirects (handled inside fetchApi); transient
        // 401s / network errors keep the session. _retried caps retries at 1.
        import('@/utils/api').then(({ authApi }) => authApi.getCurrentUser().catch(() => {}));
      }
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

    // Validate token against backend once per session — through fetchApi so a
    // lapsed-but-renewable token RENEWS (365d sliding) instead of being logged
    // out. Only a 410-dormant verdict clears the session + redirects to /login
    // (handled inside fetchApi); transient 401s / network errors keep it.
    if (!isPublic && isLoggedIn() && !tokenValidated.current) {
      tokenValidated.current = true;
      import('@/utils/api').then(({ authApi }) => authApi.getCurrentUser().catch(() => {}));
    }

    setChecked(true);
  }, [pathname, router]);

  // Hide nav on public routes, player pages, SEO pages, and while checking auth
  // On home page (/), show nav for logged-in app users (story grid), hide for anonymous (landing page)
  const isSEOPage = pathname.startsWith('/stories/')
    || pathname.startsWith('/category/') || pathname.startsWith('/ages/')
    || pathname.startsWith('/blog/') || pathname === '/blog'
    || /^\/before-bed\/(silly-songs|poems)\//.test(pathname);
  // Home renders the marketing landing (→ no app bottom-nav) unless the
  // visitor is an app user. Mirrors app/page.js getInitialView(): app view
  // when ?source=app, the persisted native flag, or completed onboarding;
  // ?view=landing always forces landing. These client-only checks are safe —
  // the `checked` gate keeps nav from rendering until after hydration, so a
  // fresh marketing visitor never sees a flash of bottom-nav.
  const _sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const _forceLanding = _sp?.get('view') === 'landing';
  const _sourceApp = _sp?.get('source') === 'app';
  let _nativeFlag = false;
  try { _nativeFlag = typeof window !== 'undefined' && localStorage.getItem('dreamvalley_native_app') === '1'; } catch {}
  const isLandingPage = pathname === '/'
    && (_forceLanding || (!_sourceApp && !_nativeFlag && !hasCompletedOnboarding()));
  const showNav = !NO_NAV_ROUTES.includes(pathname) && !pathname.startsWith('/player/')
    && !pathname.startsWith('/nap-playlist') && !isSEOPage && !isLandingPage && checked;

  return (
    <I18nProvider>
      <VoicePreferencesProvider>
        <div style={{ paddingBottom: showNav ? '72px' : '0' }}>
          {children}
        </div>
        {showNav && <BottomNav />}
        <InstallPrompt />
        {checked && !pathname.startsWith('/player/') && !pathname.startsWith('/playlist') && !NO_NAV_ROUTES.includes(pathname) && <BedtimePopup />}
      </VoicePreferencesProvider>
    </I18nProvider>
  );
}
