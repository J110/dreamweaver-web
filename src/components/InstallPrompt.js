'use client';

import { useEffect, useState, useRef } from 'react';
import styles from './InstallPrompt.module.css';

const DISMISSED_KEY = 'installPromptDismissed';
const SHOW_DELAY_MS = 3000;

/**
 * Cross-platform PWA install prompt.
 *
 * - Android / Desktop Chrome: captures `beforeinstallprompt`, shows "Install" button
 *   that triggers the native install dialog.
 * - iOS Safari: shows manual instructions ("Tap Share → Add to Home Screen").
 * - Already installed (standalone mode): hidden.
 * - Dismissable with ✕ — persists in localStorage so it only shows once.
 */
export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState(null); // 'chrome' | 'ios' | null
  const deferredPromptRef = useRef(null);

  useEffect(() => {
    // Already dismissed?
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // Already running as installed PWA?
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Listen for Chrome/Edge/Samsung beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setPlatform('chrome');
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detect iOS Safari (no beforeinstallprompt support)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS/.test(navigator.userAgent);

    // Show after delay
    const timer = setTimeout(() => {
      if (deferredPromptRef.current) {
        // Chrome/Edge already captured the event
        setVisible(true);
      } else if (isIOS && isSafari) {
        setPlatform('ios');
        setVisible(true);
      }
      // Other browsers (Firefox, etc.) — don't show if no install mechanism
    }, SHOW_DELAY_MS);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

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
              <span className={styles.title}>Add Dream Valley to Home Screen</span>
              <span className={styles.subtitle}>
                No install needed! Tap{' '}
                <svg className={styles.shareIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                </svg>
                {' '}then &ldquo;Add to Home Screen&rdquo;
              </span>
            </>
          ) : (
            <>
              <span className={styles.title}>Add Dream Valley to Home Screen</span>
              <span className={styles.subtitle}>
                No install needed — full screen, faster loading
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
