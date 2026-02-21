'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { I18nProvider, hasCompletedOnboarding } from '@/utils/i18n';
import { VoicePreferencesProvider } from '@/utils/voicePreferences';
import { isLoggedIn, getToken, logout } from '@/utils/auth';
import useVersionCheck from '@/hooks/useVersionCheck';
import BottomNav from './BottomNav';

const NO_NAV_ROUTES = ['/onboarding', '/login', '/signup', '/support', '/privacy'];
const PUBLIC_ROUTES = ['/onboarding', '/login', '/signup', '/support', '/privacy'];
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function isPublicRoute(pathname) {
  // Static public routes + shared story links (/player/*)
  return PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/player/');
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const tokenValidated = useRef(false);

  // Auto-reload on app open/foreground when a new deployment is detected.
  // Only checks on startup and visibility change — never mid-session.
  useVersionCheck();

  useEffect(() => {
    const isPublic = isPublicRoute(pathname);

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
            router.replace('/login');
          }
        })
        .catch(() => {
          // Network error — don't logout, just proceed offline
        });
    }

    setChecked(true);
  }, [pathname, router]);

  // Hide nav on public routes, player pages, and while checking auth
  const showNav = !NO_NAV_ROUTES.includes(pathname) && !pathname.startsWith('/player/') && checked;

  return (
    <I18nProvider>
      <VoicePreferencesProvider>
        <div style={{ paddingBottom: showNav ? '72px' : '0' }}>
          {children}
        </div>
        {showNav && <BottomNav />}
      </VoicePreferencesProvider>
    </I18nProvider>
  );
}
