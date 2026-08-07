'use client';

import { useEffect, useRef, useState } from 'react';
import { isLoggedIn } from '@/utils/auth';
import { useI18n } from '@/utils/i18n';
import {
  bindNativePushEvents,
  enableNativePush,
  nativePushBridge,
  syncExistingNativePush,
} from '@/utils/nativePush';
import styles from './NativePushPrompt.module.css';

const ENABLED_KEY = 'dreamvalley_push_enabled';
const NEXT_PROMPT_KEY = 'dreamvalley_push_prompt_after';
const REMIND_LATER_MS = 7 * 24 * 60 * 60 * 1000;

export default function NativePushPrompt() {
  const { lang } = useI18n();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('idle');
  const cleanupEvents = useRef(() => {});

  useEffect(() => {
    let stopped = false;
    let attempts = 0;
    let checking = false;
    const markEnabled = () => {
      try {
        localStorage.setItem(ENABLED_KEY, '1');
        localStorage.removeItem(NEXT_PROMPT_KEY);
      } catch {}
      setVisible(false);
    };
    const check = async () => {
      if (checking) return;
      if (stopped || !isLoggedIn() || !nativePushBridge()) return;
      checking = true;
      cleanupEvents.current();
      cleanupEvents.current = bindNativePushEvents(markEnabled);
      let enabled = false;
      let promptAfter = 0;
      try {
        enabled = localStorage.getItem(ENABLED_KEY) === '1';
        promptAfter = Number(localStorage.getItem(NEXT_PROMPT_KEY) || 0);
      } catch {}
      if (!enabled) {
        try {
          const current = await syncExistingNativePush();
          if (current.status === 'registered') {
            markEnabled();
            window.clearInterval(interval);
            checking = false;
            return;
          }
        } catch {}
        if (Date.now() >= promptAfter) {
          window.setTimeout(() => { if (!stopped) setVisible(true); }, 1200);
        }
      }
      window.clearInterval(interval);
      checking = false;
    };
    const interval = window.setInterval(() => {
      attempts += 1;
      check();
      if (attempts >= 60) window.clearInterval(interval);
    }, 250);
    check();
    return () => {
      stopped = true;
      window.clearInterval(interval);
      cleanupEvents.current();
    };
  }, []);

  function remindLater() {
    try { localStorage.setItem(NEXT_PROMPT_KEY, String(Date.now() + REMIND_LATER_MS)); } catch {}
    setVisible(false);
  }

  async function enable() {
    if (busy) return;
    setBusy(true);
    setStatus('idle');
    try {
      const result = await enableNativePush();
      if (result.status === 'registered') {
        try {
          localStorage.setItem(ENABLED_KEY, '1');
          localStorage.removeItem(NEXT_PROMPT_KEY);
        } catch {}
        setVisible(false);
      } else if (result.status === 'pending') {
        setStatus('pending');
      } else {
        setStatus(result.status === 'denied' ? 'denied' : 'failed');
      }
    } catch {
      setStatus('failed');
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div className={styles.backdrop} role="presentation">
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="push-prompt-title">
        <div className={styles.icon} aria-hidden="true">{'🔔'}</div>
        <h2 id="push-prompt-title">
          {lang === 'hi' ? 'Bedtime updates paayein' : 'Get bedtime updates'}
        </h2>
        <p>
          {lang === 'hi'
            ? 'Nayi stories, lullabies aur bedtime reminders ke liye notifications on karein.'
            : 'Turn on notifications for new stories, lullabies, and helpful bedtime reminders.'}
        </p>
        {status === 'denied' && (
          <p className={styles.error} role="status">
            {lang === 'hi'
              ? 'Notifications band hain. Aap baad mein iPhone Settings mein on kar sakte hain.'
              : 'Notifications are off. You can enable them later in iPhone Settings.'}
          </p>
        )}
        {status === 'failed' && (
          <p className={styles.error} role="status">
            {lang === 'hi' ? 'Abhi enable nahi ho paaya. Dobara try karein.' : 'Could not enable notifications. Please try again.'}
          </p>
        )}
        {status === 'pending' && (
          <p className={styles.error} role="status">
            {lang === 'hi' ? 'Permission mil gayi. Setup poora ho raha hai…' : 'Permission granted. Finishing setup…'}
          </p>
        )}
        <button className={styles.enable} type="button" onClick={enable} disabled={busy}>
          {busy
            ? (lang === 'hi' ? 'Enable ho raha hai…' : 'Enabling…')
            : (lang === 'hi' ? 'Notifications enable karein' : 'Enable notifications')}
        </button>
        <button className={styles.later} type="button" onClick={remindLater} disabled={busy}>
          {lang === 'hi' ? 'Abhi nahi' : 'Not now'}
        </button>
      </div>
    </div>
  );
}
