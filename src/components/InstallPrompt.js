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
 * - iOS Safari: shows step-by-step instructions (··· menu → Add to Home Screen).
 *   iOS has no API to trigger this — user must do it manually.
 * - Already installed (standalone mode): hidden.
 * - Auto-hides when app is installed (listens for `appinstalled` event).
 * - Dismissable with ✕ — persists in localStorage so it only shows once.
 */
export default function InstallPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState(null); // 'chrome' | 'ios' | null
  const deferredPromptRef = useRef(null);
  const listenerSetup = useRef(false);

  // Always listen for beforeinstallprompt and appinstalled
  useEffect(() => {
    if (listenerSetup.current) return;
    listenerSetup.current = true;

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setPlatform('chrome');
    };

    // Auto-dismiss when app is installed
    const handleAppInstalled = () => {
      setVisible(false);
      localStorage.setItem(DISMISSED_KEY, '1');
      deferredPromptRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Detect iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS/.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setPlatform('ios');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
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
    if (!deferredPromptRef.current) {
      // Prompt already used or expired — just dismiss
      handleDismiss();
      return;
    }
    try {
      deferredPromptRef.current.prompt();
      const result = await deferredPromptRef.current.userChoice;
      if (result.outcome === 'accepted') {
        setVisible(false);
        localStorage.setItem(DISMISSED_KEY, '1');
      }
    } catch (e) {
      // prompt() can throw if already used — dismiss gracefully
      handleDismiss();
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
                1. Tap <strong>···</strong> below → 2. Tap{' '}
                <svg className={styles.shareIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                </svg>
                {' '}Share → 3. Scroll up → 4. &ldquo;Add to Home Screen&rdquo;
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
