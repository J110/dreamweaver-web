'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { I18nProvider, hasCompletedOnboarding } from '@/utils/i18n';
import { VoicePreferencesProvider } from '@/utils/voicePreferences';
import { isLoggedIn } from '@/utils/auth';
import BottomNav from './BottomNav';

const NO_NAV_ROUTES = ['/onboarding', '/login', '/signup', '/support', '/privacy'];
const PUBLIC_ROUTES = ['/onboarding', '/login', '/signup', '/support', '/privacy'];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Check onboarding completion — skip for public/static pages
    if (!hasCompletedOnboarding() && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace('/onboarding');
      return;
    }

    // Check login for protected routes
    if (!PUBLIC_ROUTES.includes(pathname) && !isLoggedIn()) {
      router.replace('/login');
      return;
    }

    setChecked(true);
  }, [pathname, router]);

  const showNav = !NO_NAV_ROUTES.includes(pathname) && checked;

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
