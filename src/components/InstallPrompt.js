'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import styles from './InstallPrompt.module.css';

const DISMISSED_KEY = 'installPromptDismissed';
const SHOW_DELAY_MS = 3000;

/**
 * Cross-platform PWA install prompt.
 *
 * - Only shows on the home page ('/') — not during onboarding, login, or player.
 * - Android / Desktop Chrome: captures `beforeinstallprompt`, shows "Add" button
 *   that triggers the native install dialog (adds to home screen as PWA).
 * - iOS Safari: shows step-by-step instructions (Share → Add to Home Screen).
 *   iOS has no API to trigger this — user must do it manually.
 * - Already installed (standalone mode): hidden.
 * - Dismissable with ✕ — persists in localStorage so it only shows once.
 */
export default function InstallPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState(null); // 'chrome' | 'ios' | null
  const deferredPromptRef = useRef(null);
  const listenerSetup = useRef(false);

  // Always listen for beforeinstallprompt (it fires once on page load,
  // we need to capture it even before we're on the home page)
  useEffect(() => {
    if (listenerSetup.current) return;
    listenerSetup.current = true;

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setPlatform('chrome');
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detect iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS/.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setPlatform('ios');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Show/hide based on pathname — only on home page
  useEffect(() => {
    if (pathname !== '/') {
      setVisible(false);
      return;
    }

    // Already dismissed or already standalone?
    if (localStorage.getItem(DISMISSED_KEY)) return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Show after delay once we're on home page
    const timer = setTimeout(() => {
      if (deferredPromptRef.current || platform === 'ios') {
        setVisible(true);
      }
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [pathname, platform]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  const handleInstallClick = async () => {
    if (!deferredPromptRef.current) return;
    deferredPromptRef.current.prompt();
    const result = await deferredPromptRef.current.userChoice;
    if (result.outcome === 'accepted') {
      setVisible(false);
      localStorage.setItem(DISMISSED_KEY, '1');
    }
    deferredPromptRef.current = null;
  };

  if (!visible) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <div className={styles.icon}>✨</div>
        <div className={styles.text}>
          {platform === 'ios' ? (
            <>
              <span className={styles.title}>Create a shortcut for Dream Valley</span>
              <span className={styles.subtitle}>
                Add to your home screen for a full screen experience!
              </span>
              <span className={styles.steps}>
                1. Tap{' '}
                <svg className={styles.shareIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                </svg>
                {' '}below &nbsp;2. Tap &ldquo;Add to Home Screen&rdquo;
              </span>
            </>
          ) : (
            <>
              <span className={styles.title}>Create a shortcut for Dream Valley</span>
              <span className={styles.subtitle}>
                Add to your home screen for a full screen experience!
              </span>
            </>
          )}
        </div>
        {platform === 'chrome' && (
          <button className={styles.installBtn} onClick={handleInstallClick}>
            Add
          </button>
        )}
      </div>
      <button className={styles.closeBtn} onClick={handleDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
