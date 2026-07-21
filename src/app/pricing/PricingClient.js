'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { isLoggedIn } from '@/utils/auth';
import { subscriptionApi, billingApi } from '@/utils/api';
import { dvAnalytics } from '@/utils/analytics';
import { openCheckoutUrl } from '@/utils/checkoutPending';
import { clearPricingIntent, readPricingIntent, savePricingIntent } from '@/utils/pricingIntent';
import { PRICING_REGIONS, getPlanPrice, inferPricingRegion } from '@/utils/regionalPricing';
import styles from './page.module.css';

const FREE_BULLETS_EN = [
  "Tonight's bedtime bundle — silly song, story, poem, lullaby",
  'Last 3 days of stories saved to play again',
  '3 free personalized stories',
  'Default narration voices',
];

const FREE_BULLETS_HI = [
  'Aaj raat ka bedtime bundle — silly song, kahani, kavita, lori',
  'Pichhle 3 din ki sabhi kahaniyaan saved',
  '3 free personalized kahaniyaan',
  'Default voices',
];

const PREMIUM_BULLETS_EN = [
  'Voice cloning — stories in your voice (3 voice slots)',
  '30 personalized story credits every month',
  'Last 30 days of stories saved',
  "Episodic memory — your kid's character remembers their adventures",
  'Karaoke mode + bookmark resume + offline downloads',
  'Up to 3 kid profiles',
];

const PREMIUM_BULLETS_HI = [
  'Voice cloning — kahaniyaan aapki aawaaz mein (3 voice slots)',
  '30 personalized story credits har mahine',
  'Pichhle 30 din ki sabhi kahaniyaan saved',
  'Episodic memory — aapke kid ka character apni adventures yaad rakhta hai',
  'Karaoke mode + bookmark resume + offline downloads',
  '3 tak kid profiles',
];

function formatDate(iso, lang) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const opts = { year: 'numeric', month: 'short', day: 'numeric' };
    return d.toLocaleDateString(lang === 'hi' ? 'en-IN' : 'en-US', opts);
  } catch {
    return iso;
  }
}

export default function PricingClient() {
  const { lang } = useI18n();
  const router = useRouter();

  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [region, setRegion] = useState(PRICING_REGIONS.ROW);
  const [selectedPlan, setSelectedPlan] = useState('annual');

  useEffect(() => {
    const loggedIn = isLoggedIn();
    setAuthed(loggedIn);
    try {
      const locale = navigator.language || '';
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      setRegion(inferPricingRegion({ locale, timeZone }));
      const requestedPlan = new URLSearchParams(window.location.search).get('plan');
      setSelectedPlan(
        requestedPlan === 'monthly' || requestedPlan === 'annual'
          ? requestedPlan
          : readPricingIntent() || 'annual'
      );
    } catch {}
    if (!loggedIn) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    subscriptionApi
      .getCurrent()
      .then((data) => {
        if (!cancelled) setCurrent(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isPremium = current?.current_tier?.id === 'premium';
  const free = lang === 'hi' ? FREE_BULLETS_HI : FREE_BULLETS_EN;
  const premium = lang === 'hi' ? PREMIUM_BULLETS_HI : PREMIUM_BULLETS_EN;

  async function startCheckout(plan) {
    setError(null);
    setSubmitting(true);
    try {
          const { checkout_url } = await billingApi.startCheckout(plan);
          if (checkout_url) {
            clearPricingIntent();
            openCheckoutUrl(checkout_url);
            return;
      }
      setError(
        lang === 'hi'
          ? 'Checkout shuru nahi ho paya. Thoda baad try karein.'
          : "Couldn't start checkout. Please try again in a moment."
      );
    } catch (e) {
      setError(
        lang === 'hi'
          ? 'Kuch galat hua. Thoda baad try karein.'
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function selectRegion(nextRegion) {
    setRegion(nextRegion);
    dvAnalytics.track('pricing_region_changed', { region: nextRegion });
  }

  function selectPlan(plan) {
    setSelectedPlan(plan);
    dvAnalytics.track('pricing_plan_selected', { plan, region });
  }

  function continueWithPlan() {
    savePricingIntent(selectedPlan);
    const authenticated = isLoggedIn();
    dvAnalytics.track('pricing_checkout_started', {
      plan: selectedPlan,
      region,
      authenticated,
    });
    if (!authenticated) {
      router.push('/onboarding');
      return;
    }
    setAuthed(true);
    startCheckout(selectedPlan);
  }

  async function openPortal() {
    setError(null);
    setSubmitting(true);
    try {
      const { portal_url } = await billingApi.startPortal();
      if (portal_url) {
        window.open(portal_url, '_blank', 'noopener,noreferrer');
        return;
      }
      setError(
        lang === 'hi' ? 'Portal nahi khul paya.' : "Couldn't open portal."
      );
    } catch (e) {
      setError(
        lang === 'hi' ? 'Kuch galat hua.' : 'Something went wrong.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <StarField />
      <div className={styles.page}>
        <Link href="/" className={styles.backLink}>
          &larr; {lang === 'hi' ? 'Wapas Dream Valley' : 'Back to Dream Valley'}
        </Link>

        <header className={styles.header}>
          <h1 className={styles.title}>
            {lang === 'hi' ? 'Apna plan chuniye' : 'Choose your plan'}
          </h1>
          <p className={styles.tagline}>
            {lang === 'hi'
              ? 'Aapka bedtime ritual jo bachhon ko sulaa de — aapki aawaaz mein, aapki language mein, unki apni kahaniyon ke saath.'
              : "The bedtime ritual that gets your kid to sleep — in your voice, in your language, with their own stories."}
          </p>
        </header>

        {loading && authed ? (
          <div className={styles.loading}>
            {lang === 'hi' ? 'Load ho raha hai...' : 'Loading...'}
          </div>
        ) : isPremium ? (
          <div className={styles.statusCard}>
            <div className={styles.statusBadge}>
              {lang === 'hi' ? 'Aap Premium par hain' : "You're on Premium"}
            </div>
            {current?.next_billing_date && (
              <p className={styles.statusMeta}>
                {lang === 'hi' ? 'Agla renewal: ' : 'Renews: '}
                {formatDate(current.next_billing_date, lang)}
              </p>
            )}
            <button
              className={styles.primaryBtn}
              onClick={openPortal}
              disabled={submitting}
            >
              {submitting
                ? lang === 'hi' ? 'Khul raha hai...' : 'Opening...'
                : lang === 'hi' ? 'Manage subscription' : 'Manage subscription'}
            </button>
          </div>
        ) : (
          <>
            <div className={styles.regionSwitchWrap}>
              <span>{lang === 'hi' ? 'Prices dikh rahe hain:' : 'Showing prices for:'}</span>
              <div className={styles.regionSwitch} role="group" aria-label="Pricing region">
                <button
                  type="button"
                  className={`${styles.regionButton} ${region === PRICING_REGIONS.INDIA ? styles.regionButtonActive : ''}`}
                  aria-pressed={region === PRICING_REGIONS.INDIA}
                  onClick={() => selectRegion(PRICING_REGIONS.INDIA)}
                >
                  India (₹)
                </button>
                <button
                  type="button"
                  className={`${styles.regionButton} ${region === PRICING_REGIONS.ROW ? styles.regionButtonActive : ''}`}
                  aria-pressed={region === PRICING_REGIONS.ROW}
                  onClick={() => selectRegion(PRICING_REGIONS.ROW)}
                >
                  Rest of world ($)
                </button>
              </div>
            </div>
            <div className={styles.tierGrid}>
            <div className={styles.tierCard}>
              <h2 className={styles.tierName}>
                {lang === 'hi' ? 'Free' : 'Free'}
              </h2>
              <div className={styles.tierPrice}>
                <span className={styles.priceAmount}>$0</span>
              </div>
              <ul className={styles.bulletList}>
                {free.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
              <div className={styles.tierFooter}>
                <span className={styles.tierFooterMuted}>
                  {lang === 'hi' ? 'Aapka current plan' : 'Your current plan'}
                </span>
              </div>
            </div>

            <div className={`${styles.tierCard} ${styles.tierCardFeatured}`}>
              <h2 className={styles.tierName}>
                {lang === 'hi' ? 'Premium' : 'Premium'}
              </h2>
              <div className={styles.trialRow}>
                <span className={styles.trialBadge}>
                  {lang === 'hi' ? '7 din free trial' : '7-day free trial'}
                </span>
              </div>
              <div className={styles.planOptions}>
                {['annual', 'monthly'].map((plan) => {
                  const price = getPlanPrice(region, plan);
                  const selected = selectedPlan === plan;
                  const period = lang === 'hi'
                    ? plan === 'annual' ? 'saal' : 'mahina'
                    : price.period;
                  return (
                    <button
                      key={plan}
                      type="button"
                      className={`${styles.planOption} ${selected ? styles.planOptionSelected : ''}`}
                      aria-pressed={selected}
                      onClick={() => selectPlan(plan)}
                    >
                      <span className={styles.planOptionTop}>
                        <span className={styles.planLabel}>
                          {plan === 'annual'
                            ? lang === 'hi' ? 'Yearly' : 'Annual'
                            : lang === 'hi' ? 'Monthly' : 'Monthly'}
                        </span>
                        {plan === 'annual' && (
                          <span className={styles.recommendedBadge}>
                            {lang === 'hi' ? 'Best value' : 'Recommended'}
                          </span>
                        )}
                      </span>
                      <span className={styles.planPriceRow}>
                        <strong>{price.amount}</strong>
                        <span>/{period}</span>
                      </span>
                      <span className={styles.webDiscountBadge}>10% web discount</span>
                    </button>
                  );
                })}
              </div>
              <ul className={styles.bulletList}>
                {premium.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
              <div className={styles.tierFooter}>
                <button
                  className={styles.primaryBtn}
                  onClick={continueWithPlan}
                  disabled={submitting}
                >
                  {submitting
                    ? lang === 'hi' ? 'Le ja raha hai...' : 'Taking you to checkout...'
                    : authed
                      ? lang === 'hi' ? 'Start 7-day free trial' : 'Start 7-day free trial'
                      : lang === 'hi' ? `${selectedPlan === 'annual' ? 'Yearly' : 'Monthly'} ke saath jaari rakhein` : `Continue with ${selectedPlan === 'annual' ? 'Annual' : 'Monthly'}`}
                </button>
                {!authed && (
                  <span className={styles.tierFooterMuted}>
                    {lang === 'hi'
                      ? 'Checkout se pehle apna profile complete karein'
                      : 'Complete your profile before checkout'}
                  </span>
                )}
                <button
                  className={styles.secondaryLink}
                  onClick={() => router.push('/restore')}
                >
                  {lang === 'hi'
                    ? 'Pehle se subscribed? Restore karein'
                    : 'Already subscribed? Restore'}
                </button>
              </div>
            </div>
          </div>
          </>
        )}

        {error && <div className={styles.errorBox}>{error}</div>}

        <p className={styles.trustFooter}>
          {lang === 'hi'
            ? 'Kabhi bhi cancel karein. 7 din ke trial me koi charge nahi.'
            : 'Cancel anytime. No charge during the 7-day trial.'}
        </p>
      </div>
    </>
  );
}
