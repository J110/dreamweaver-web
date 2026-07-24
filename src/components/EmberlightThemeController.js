'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  EFFECTIVE_PREMIUM_KEY,
  THEME_CHANGE_EVENT,
  readEffectivePremium,
  resolveTheme,
} from '@/utils/emberlightTheme';

export default function EmberlightThemeController() {
  const pathname = usePathname();

  useEffect(() => {
    const applyTheme = () => {
      const effectivePremium = readEffectivePremium(window.localStorage);
      const theme = resolveTheme({ effectivePremium, pathname });
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.toggleAttribute(
        'data-battery-saver',
        navigator.connection?.saveData === true,
      );
      try {
        window.DreamValleyTheme?.postMessage(theme);
      } catch {}
    };
    const onStorage = (event) => {
      if (event.key === null || event.key === EFFECTIVE_PREMIUM_KEY) applyTheme();
    };
    applyTheme();
    window.addEventListener('storage', onStorage);
    window.addEventListener(THEME_CHANGE_EVENT, applyTheme);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(THEME_CHANGE_EVENT, applyTheme);
    };
  }, [pathname]);

  return null;
}
