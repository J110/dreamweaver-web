'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  EFFECTIVE_PREMIUM_KEY,
  THEME_CHANGE_EVENT,
  resolveTheme,
} from '@/utils/emberlightTheme';

export default function EmberlightThemeController() {
  const pathname = usePathname();

  useEffect(() => {
    const applyTheme = (effectivePremium = false) => {
      const theme = resolveTheme({ effectivePremium, pathname });
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.toggleAttribute(
        'data-battery-saver',
        navigator.connection?.saveData !== false,
      );
      try {
        window.DreamValleyTheme?.postMessage(theme);
      } catch {}
    };
    const onStorage = (event) => {
      if (event.key === EFFECTIVE_PREMIUM_KEY) {
        applyTheme(event.newValue === 'true');
      } else if (event.key === null || event.key === 'dreamweaver_user') {
        applyTheme(false);
      }
    };
    const onPremiumChange = (event) => {
      applyTheme(event?.detail?.current === true);
    };
    applyTheme(false);
    window.addEventListener('storage', onStorage);
    window.addEventListener(THEME_CHANGE_EVENT, onPremiumChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(THEME_CHANGE_EVENT, onPremiumChange);
    };
  }, [pathname]);

  return null;
}
