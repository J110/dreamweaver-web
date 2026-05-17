'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { useVoicePreferences } from '@/utils/voicePreferences';
import { getSelectableVoices, getSampleUrl, getVoiceLabel } from '@/utils/voiceConfig';
import { isLoggedIn } from '@/utils/auth';
import { subscriptionApi, billingApi } from '@/utils/api';
import styles from './page.module.css';

function formatSubDate(iso, lang) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(
      lang === 'hi' ? 'en-IN' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' }
    );
  } catch {
    return iso;
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const { voicePrefs, setVoicePrefs } = useVoicePreferences();
  const [subState, setSubState] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState(null);

  useEffect(() => {
    // Anon users see the same settings screen without the subscription
    // section (subscription is auth-gated). Voice prefs etc. work either
    // way via VoicePreferencesProvider.
    if (!isLoggedIn()) return;
    let cancelled = false;
    subscriptionApi.getCurrent()
      .then((data) => { if (!cancelled) setSubState(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function openPortal() {
    setPortalError(null);
    setPortalLoading(true);
    try {
      const { portal_url } = await billingApi.startPortal();
      if (portal_url) {
        window.open(portal_url, '_blank', 'noopener,noreferrer');
        return;
      }
      setPortalError(lang === 'hi' ? 'Portal nahi khul paya.' : "Couldn't open portal.");
    } catch {
      setPortalError(lang === 'hi' ? 'Kuch galat hua.' : 'Something went wrong.');
    } finally {
      setPortalLoading(false);
    }
  }

  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState(null);
  async function startTopup() {
    setTopupError(null);
    setTopupLoading(true);
    try {
      const { checkout_url } = await billingApi.startTopupCheckout();
      if (checkout_url) {
        window.location.href = checkout_url;
        return;
      }
      setTopupError(lang === 'hi' ? 'Top-up start nahi ho paya.' : "Couldn't start top-up.");
    } catch {
      setTopupError(lang === 'hi' ? 'Kuch galat hua.' : 'Something went wrong.');
    } finally {
      setTopupLoading(false);
    }
  }

  const [selectedVoice, setSelectedVoice] = useState(voicePrefs?.preferredVoice || 'female_1');
  const [saved, setSaved] = useState(false);

  // Sync when voicePrefs loads from localStorage
  useEffect(() => {
    if (voicePrefs?.preferredVoice) setSelectedVoice(voicePrefs.preferredVoice);
  }, [voicePrefs?.preferredVoice]);

  // Audio preview
  const [playingVoice, setPlayingVoice] = useState(null);
  const audioRef = useRef(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingVoice(null);
  }, []);

  const playVoiceSample = useCallback((voiceId) => {
    if (playingVoice === voiceId) {
      stopAudio();
      return;
    }
    stopAudio();
    const url = getSampleUrl(voiceId, lang);
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingVoice(voiceId);
    audio.play().catch(() => setPlayingVoice(null));
    audio.onended = () => setPlayingVoice(null);
    audio.onerror = () => setPlayingVoice(null);
  }, [playingVoice, lang, stopAudio]);

  const handleVoiceSelect = (voiceId) => {
    playVoiceSample(voiceId);
    setSelectedVoice(voiceId);
  };

  const handleSave = () => {
    stopAudio();
    setVoicePrefs({ preferredVoice: selectedVoice });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <StarField />
      <div className={styles.app}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            ← {lang === 'hi' ? 'Wapas' : 'Back'}
          </button>
          <h1 className={styles.title}>{t('voiceSettings')}</h1>
        </div>

        <p className={styles.description}>{t('voiceSettingsDesc')}</p>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {lang === 'hi' ? 'Apni aawaaz chunein' : 'Choose Your Narrator'}
          </h2>
          <div className={styles.voiceGrid}>
            {getSelectableVoices().map(([id, meta]) => (
              <button
                key={id}
                onClick={() => handleVoiceSelect(id)}
                className={`${styles.voiceCard} ${selectedVoice === id ? styles.voiceCardActive : ''} ${playingVoice === id ? styles.voiceCardPlaying : ''}`}
              >
                <span className={styles.voiceIcon}>{meta.icon}</span>
                <span className={styles.voiceName}>{getVoiceLabel(id, lang)}</span>
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} className={styles.saveBtn}>
          {saved
            ? (lang === 'hi' ? 'Save ho gaya ✓' : 'Saved ✓')
            : (lang === 'hi' ? 'Save Karein' : 'Save Preferences')
          }
        </button>

        {isLoggedIn() && (
          <div className={`${styles.section} ${styles.subscriptionSection}`}>
            <h2 className={styles.sectionTitle}>
              {lang === 'hi' ? 'Subscription' : 'Subscription'}
            </h2>
            {(() => {
              const status = subState?.current_tier?.id === 'premium'
                ? (subState?.subscription_status || 'active')
                : 'free';
              const renewIso = subState?.next_billing_date;
              const renewStr = formatSubDate(renewIso, lang);

              if (status === 'free') {
                return (
                  <>
                    <p className={styles.subStatusLine}>
                      {lang === 'hi' ? 'Current plan: Free' : 'Current plan: Free'}
                    </p>
                    <p className={styles.subDescLine}>
                      {lang === 'hi'
                        ? 'Premium me voice cloning, 30 monthly credits, aur 30-day backlog milta hai.'
                        : 'Premium unlocks voice cloning, 30 monthly credits, and 30-day backlog.'}
                    </p>
                    <Link href="/pricing" className={styles.subPrimaryBtn}>
                      {lang === 'hi' ? 'Premium dekhein' : 'Upgrade to Premium'}
                    </Link>
                  </>
                );
              }

              const labels = {
                trialing: lang === 'hi' ? 'Trial active' : 'Trial active',
                active: lang === 'hi' ? 'Premium · active' : 'Premium · active',
                past_due: lang === 'hi' ? '⚠ Payment issue' : '⚠ Payment issue',
                canceled: lang === 'hi' ? 'Premium (cancelled)' : 'Premium (cancelled)',
              };
              const description = {
                trialing: renewStr
                  ? (lang === 'hi' ? `Trial ${renewStr} tak. Tab tak charge nahi hoga.` : `Trial active until ${renewStr}. No charge until then.`)
                  : (lang === 'hi' ? 'Trial active.' : 'Trial active.'),
                active: renewStr
                  ? (lang === 'hi' ? `Renew hota hai ${renewStr} ko.` : `Renews ${renewStr}.`)
                  : '',
                past_due: lang === 'hi'
                  ? 'Apna card update karein taaki Premium chalu rahe.'
                  : 'Update your card to keep Premium active.',
                canceled: renewStr
                  ? (lang === 'hi' ? `Premium ${renewStr} tak. Phir Free.` : `Premium until ${renewStr}, then Free.`)
                  : (lang === 'hi' ? 'Premium ka access period khatam hone wala hai.' : 'Premium ending soon.'),
              };
              const cta = status === 'past_due'
                ? (lang === 'hi' ? 'Payment update karein' : 'Update payment method')
                : status === 'canceled'
                ? (lang === 'hi' ? 'Phir activate karein' : 'Reactivate')
                : (lang === 'hi' ? 'Manage subscription' : 'Manage subscription');

              const credits = subState?.credits_remaining ?? 0;
              const topupCredits = subState?.topup_credits_remaining ?? 0;
              const periodEnd = formatSubDate(subState?.credits_period_end, lang);
              const frozen = !!subState?.credits_frozen;

              return (
                <>
                  <p className={styles.subStatusLine}>{labels[status] || labels.active}</p>
                  {description[status] && (
                    <p className={styles.subDescLine}>{description[status]}</p>
                  )}
                  <div className={styles.creditsBlock}>
                    <p className={styles.creditsLine}>
                      {lang === 'hi'
                        ? <>Credits is mahine: <strong>{credits}</strong>{topupCredits > 0 && <> + {topupCredits} top-up</>}</>
                        : <>Credits this month: <strong>{credits}</strong>{topupCredits > 0 && <> + {topupCredits} top-up</>}</>}
                    </p>
                    {periodEnd && !frozen && (
                      <p className={styles.creditsMeta}>
                        {lang === 'hi'
                          ? `${periodEnd} ko 30 par reset hoga.`
                          : `Resets to 30 on ${periodEnd}.`}
                      </p>
                    )}
                    {frozen && (
                      <p className={styles.subErrorLine}>
                        {lang === 'hi'
                          ? '⚠ Credits frozen — payment fail hone par. Card update karke unfreeze karein.'
                          : '⚠ Credits frozen — payment failed. Update your card to unfreeze.'}
                      </p>
                    )}
                  </div>
                  <button
                    className={styles.subPrimaryBtn}
                    onClick={openPortal}
                    disabled={portalLoading}
                  >
                    {portalLoading
                      ? (lang === 'hi' ? 'Khul raha hai...' : 'Opening...')
                      : cta}
                  </button>
                  {status !== 'canceled' && status !== 'past_due' && (
                    <button
                      className={styles.subSecondaryBtn}
                      onClick={startTopup}
                      disabled={topupLoading}
                    >
                      {topupLoading
                        ? (lang === 'hi' ? 'Le ja raha hai...' : 'Taking you to checkout...')
                        : (lang === 'hi' ? 'Top up — $2 / 10 credits' : 'Top up — $2 for 10 credits')}
                    </button>
                  )}
                  {portalError && (
                    <p className={styles.subErrorLine}>{portalError}</p>
                  )}
                  {topupError && (
                    <p className={styles.subErrorLine}>{topupError}</p>
                  )}
                </>
              );
            })()}
          </div>
        )}

      </div>
    </>
  );
}
