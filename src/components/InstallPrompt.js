'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './InstallPrompt.module.css';

const DISMISSED_KEY = 'appBannerDismissed';
const SHOW_DELAY_MS = 3000;

const APP_STORE_URL = 'https://apps.apple.com/sg/app/dream-valley-stories/id6759262548';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.vervetogether.dreamvalley';

/**
 * App download banner for mobile web users.
 *
 * - Detects iOS or Android from user agent.
 * - Shows App Store or Play Store link on all pages.
 * - Hidden when: inside native app (Flutter WebView), standalone PWA, or dismissed.
 * - Dismissable with X — persists in localStorage.
 */
export default function InstallPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState(null); // 'ios' | 'android' | null

  useEffect(() => {
    // Don't show during onboarding or login
    if (pathname === '/onboarding' || pathname === '/login' || pathname === '/signup') return;

    // Already dismissed?
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // Already in standalone PWA?
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Inside native app (Flutter WebView)?
    const ua = navigator.userAgent || '';
    if (ua.includes('DreamValleyApp')) return;
    try {
      if (localStorage.getItem('dreamvalley_native_app') === '1') return;
    } catch {}

    // Detect platform
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);

    if (isIOS) {
      setPlatform('ios');
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      // Desktop — don't show app banner
      return;
    }

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pathname]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  if (!visible || !platform) return null;

  const storeUrl = platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
  const storeName = platform === 'ios' ? 'App Store' : 'Google Play';

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <div className={styles.icon}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-new.png" alt="Dream Valley" className={styles.appIcon} />
        </div>
        <div className={styles.text}>
          <span className={styles.title}>Get the Dream Valley app</span>
          <span className={styles.subtitle}>
            A better experience on the {storeName}
          </span>
        </div>
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.installBtn}
          onClick={() => {
            try {
              const { dvAnalytics } = require('@/utils/analytics');
              dvAnalytics.track('app_banner_click', { platform, page: pathname });
            } catch {}
          }}
        >
          Get
        </a>
      </div>
      <button className={styles.closeBtn} onClick={handleDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
