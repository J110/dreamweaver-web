'use client';

/**
 * LandingPage — Marketing landing for new/anonymous visitors.
 * Flow: Hero · Problem · How · Living Art · Listen · Download band ·
 * Parents · Adapts (age+mood) · Premium (native-gated) · Final · Footer.
 *
 * Two independent systems, by design:
 *  - Download badges (AppBadges): app-store links, NOT a purchase
 *    pathway — render for EVERYONE incl. native. No gate import.
 *  - Premium entry: the ONLY web purchase surface — rendered only when
 *    `nativeRequest` (computed server-side in app/page.js) is false, so
 *    it is ABSENT from a native request's HTML.
 *
 * SSR-safe i18n: read `lang` from useI18n() only (provider inits 'en',
 * corrects post-mount) — never localStorage during render.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { dvAnalytics } from '@/utils/analytics';
import { useI18n } from '@/utils/i18n';
import RadioLiveLink from '@/components/RadioLiveLink';
import RadioLiveCard from '@/components/RadioLiveCard';
import { LANDING_COPY, MOODS, AGES } from './landingCopy';
import styles from './landing.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dreamvalley.app';
const PREVIEW_LIMIT = 60; // seconds

const APP_STORE_URL = 'https://apps.apple.com/sg/app/dream-valley-stories/id6759262548';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.vervetogether.dreamvalley';

/* ─── Fallback content when API is unavailable ─── */
const FALLBACK_PREVIEWS = [
  {
    title: 'The Sleepy Cloud',
    type: 'story',
    cover: '/covers/sleepy-cloud.svg',
    audioUrl: '/audio/pre-gen/7fe248e1_female_1.mp3',
  },
  {
    title: 'Sailing to Dreamland',
    type: 'song',
    cover: '/covers/sailing-dreamland.svg',
    audioUrl: '/audio/pre-gen/a3945b7b_female_1.mp3',
  },
];

const TYPE_ICONS = { story: '📖', song: '🎵', long_story: '📖' };

/* ─── Featured FLUX covers for the landing page ─── */
const FEATURED_COVERS = [
  '/covers/gen-31f50f685a68.svg',
  '/covers/gen-6e675d15e1f5.svg',
  '/covers/gen-586908c26fc2.svg',
  '/covers/gen-146a4028274a.svg',
  '/covers/gen-b5438a861ba4.svg',
  '/covers/gen-292e9eadf56e.svg',
  '/covers/gen-f9e33d4db1bd.svg',
];

const FINAL_CTA_COVER = '/covers/gen-01f0b88dc42d.svg';

/* ─── Download badges — NOT gated (app-store links, not a purchase
   pathway). Deliberately independent of isNativeRequest; renders for
   everyone, including native. ─── */
function AppBadges({ location, className }) {
  return (
    <div className={className || styles.appStoreLinks}>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.appStoreLink}
        onClick={() => dvAnalytics.track('app_download_click', { platform: 'ios', location })}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
        App Store
      </a>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.appStoreLink}
        onClick={() => dvAnalytics.track('app_download_click', { platform: 'android', location })}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm.91-.91L19.59 12 17.72 9.79l-2.27 2.27 2.27 2.15zM6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49z" />
        </svg>
        Google Play
      </a>
    </div>
  );
}

export default function LandingPage({ nativeRequest = false }) {
  const { lang, setLang } = useI18n();
  const c = LANDING_COPY[lang];

  const [coverIdx, setCoverIdx] = useState(0);
  const howItWorksRef = useRef(null);
  const previewRef = useRef(null);

  // ── Audio preview state ──
  const [previews, setPreviews] = useState(FALLBACK_PREVIEWS);
  const [playingIdx, setPlayingIdx] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [previewEnded, setPreviewEnded] = useState(null); // index of ended card
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  // Rotate hero carousel every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCoverIdx((i) => (i + 1) % FEATURED_COVERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Fetch latest content for previews
  useEffect(() => {
    async function fetchPreviews() {
      try {
        const types = ['story', 'song'];
        const results = await Promise.all(
          types.map(async (type) => {
            const res = await fetch(
              `${API_URL}/api/v1/content?content_type=${type}&page_size=5&sort_by=created_at`,
              { next: { revalidate: 3600 } }
            );
            if (!res.ok) return null;
            const json = await res.json();
            const items = json.data?.items || [];
            // Pick first item with audio
            return items.find(
              (it) => it.audio_variants && it.audio_variants.length > 0
            ) || null;
          })
        );
        const mapped = results.map((item, i) => {
          if (!item) return FALLBACK_PREVIEWS[i];
          const variant = item.audio_variants[0];
          return {
            title: item.title,
            type: item.type,
            cover: item.cover,
            audioUrl: variant.url,
          };
        });
        setPreviews(mapped);
      } catch {
        // Keep fallback
      }
    }
    fetchPreviews();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
    setPlayingIdx(null);
    setElapsed(0);
  }, []);

  const handlePreviewPlay = useCallback((idx) => {
    // Toggle pause/resume
    if (playingIdx === idx && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
        progressRef.current = setInterval(() => {
          setElapsed((e) => {
            if (e >= PREVIEW_LIMIT - 1) {
              // Fade out
              const audio = audioRef.current;
              if (audio) {
                let vol = 1;
                const fade = setInterval(() => {
                  vol -= 0.05;
                  if (vol <= 0) { clearInterval(fade); audio.pause(); }
                  else audio.volume = vol;
                }, 100);
              }
              clearInterval(progressRef.current);
              progressRef.current = null;
              setPlayingIdx(null);
              setPreviewEnded(idx);
              return PREVIEW_LIMIT;
            }
            return e + 1;
          });
        }, 1000);
      } else {
        audioRef.current.pause();
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
      return;
    }

    // Stop current if different
    stopPlayback();
    setPreviewEnded(null);

    const preview = previews[idx];
    if (!preview?.audioUrl) return;

    const audio = new Audio(preview.audioUrl);
    audioRef.current = audio;
    setPlayingIdx(idx);
    setElapsed(0);

    audio.play().catch(() => { setPlayingIdx(null); });

    audio.onended = () => {
      stopPlayback();
      setPreviewEnded(idx);
    };

    progressRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e >= PREVIEW_LIMIT - 1) {
          const a = audioRef.current;
          if (a) {
            let vol = 1;
            const fade = setInterval(() => {
              vol -= 0.05;
              if (vol <= 0) { clearInterval(fade); a.pause(); }
              else a.volume = vol;
            }, 100);
          }
          clearInterval(progressRef.current);
          progressRef.current = null;
          setPlayingIdx(null);
          setPreviewEnded(idx);
          return PREVIEW_LIMIT;
        }
        return e + 1;
      });
    }, 1000);

    dvAnalytics.track('landing_preview_play', { title: preview.title, type: preview.type });
  }, [playingIdx, previews, stopPlayback]);

  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={`${styles.landing} ${lang === 'hi' ? styles.hi : ''}`}>
      {/* ━━━ NAVIGATION BAR ━━━ */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-new.png" alt="Dream Valley" className={styles.navLogo} />
          <div className={styles.navRight}>
            <div className={styles.navLinks}>
              <Link href="/how-it-works" className={styles.navLink}>{c.nav.howItWorks}</Link>
              <Link href="/about" className={styles.navLink}>{c.nav.about}</Link>
              <Link href="/blog" className={styles.navLink}>{c.nav.blog}</Link>
              <RadioLiveLink label={c.nav.radio} />
            </div>
            <div className={styles.navActions}>
              <div className={styles.langToggle} role="group" aria-label="Language">
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`${styles.langBtn} ${lang === 'en' ? styles.langBtnActive : ''}`}
                  aria-pressed={lang === 'en'}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLang('hi')}
                  className={`${styles.langBtn} ${lang === 'hi' ? styles.langBtnActive : ''}`}
                  aria-pressed={lang === 'hi'}
                >
                  Hindi
                </button>
              </div>
              <Link href="/onboarding" className={styles.navCta}>{c.nav.getStarted}</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ━━━ SECTION 1: HERO ━━━ */}
      <section className={styles.hero}>
        <div className={styles.heroCover}>
          {FEATURED_COVERS.map((cover, i) => (
            <div
              key={cover}
              className={`${styles.heroSlide} ${i === coverIdx ? styles.heroSlideActive : ''}`}
            >
              <object
                type="image/svg+xml"
                data={cover}
                className={styles.heroCoverImg}
                aria-label="Animated bedtime story cover"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="Animated bedtime story cover" className={styles.heroCoverImg} />
              </object>
            </div>
          ))}
          <div className={styles.heroOverlay} />
        </div>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{c.hero.h1}</h1>
          <p className={styles.heroSubtitle}>{c.hero.sub}</p>
          <div className={styles.heroCtas}>
            <Link href="/onboarding" className={styles.ctaPrimary}>{c.hero.cta1}</Link>
            <button
              onClick={() => scrollTo(howItWorksRef)}
              className={styles.ctaSecondary}
            >
              {c.hero.cta2}
            </button>
          </div>
          <div className={styles.heroDownload}>
            <span className={styles.heroDownloadLabel}>{c.hero.orGetApp}</span>
            <AppBadges location="hero" className={styles.heroBadges} />
          </div>
        </div>
      </section>

      {/* ━━━ SECTION 2: THE PROBLEM ━━━ */}
      <section className={styles.problem}>
        <div className={styles.sectionInner}>
          <p className={styles.problemLead}>{c.problem.lead}</p>
          <p className={styles.problemBody}>{c.problem.body}</p>
        </div>
      </section>

      {/* ━━━ SECTION 3: HOW DREAM VALLEY WORKS ━━━ */}
      <section className={styles.howItWorks} ref={howItWorksRef}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>{c.how.title}</h2>

          {/* Pillar 1 */}
          <div className={styles.pillar}>
            <div className={styles.pillarVisual}>
              <div className={styles.coverGrid}>
                {FEATURED_COVERS.slice(0, 5).map((cover, i) => (
                  <div key={cover} className={`${styles.coverThumb} ${i === coverIdx % 5 ? styles.coverThumbActive : ''}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt="Story cover" className={styles.coverThumbImg} />
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.pillarContent}>
              <h3 className={styles.pillarTitle}>{c.how.p1Title}</h3>
              <p className={styles.pillarText}>{c.how.p1Body}</p>
            </div>
          </div>

          {/* Pillar 2 — audio (waveform pictorial; real proof is §Listen below) */}
          <div className={styles.pillar}>
            <div className={styles.pillarVisual}>
              <div className={styles.waveform} aria-hidden="true">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                  <span key={i} className={styles.waveBar} style={{ animationDelay: `${i * 0.11}s` }} />
                ))}
              </div>
            </div>
            <div className={styles.pillarContent}>
              <h3 className={styles.pillarTitle}>{c.how.p2Title}</h3>
              <p className={styles.pillarText}>{c.how.p2Body}</p>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className={styles.pillar}>
            <div className={styles.pillarVisual}>
              <div className={styles.phaseDemo}>
                <div className={styles.phase}>
                  <div className={`${styles.phaseCircle} ${styles.phase1}`} />
                  <span>Phase 1</span>
                  <small>{c.how.phaseEngage}</small>
                </div>
                <div className={styles.phaseArrow}>→</div>
                <div className={styles.phase}>
                  <div className={`${styles.phaseCircle} ${styles.phase2}`} />
                  <span>Phase 2</span>
                  <small>{c.how.phaseDescend}</small>
                </div>
                <div className={styles.phaseArrow}>→</div>
                <div className={styles.phase}>
                  <div className={`${styles.phaseCircle} ${styles.phase3}`} />
                  <span>Phase 3</span>
                  <small>{c.how.phaseSleep}</small>
                </div>
              </div>
            </div>
            <div className={styles.pillarContent}>
              <h3 className={styles.pillarTitle}>{c.how.p3Title}</h3>
              <p className={styles.pillarText}>{c.how.p3Body}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ SECTION 4: LIVING ART (cover-dims mechanism) ━━━ */}
      <section className={styles.art}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>{c.art.title}</h2>
          <p className={styles.sectionSubtitle}>{c.art.lead}</p>
          <div className={styles.artDemo}>
            <div className={styles.artStage}>
              <object
                type="image/svg+xml"
                data={FEATURED_COVERS[0]}
                className={styles.artCover}
                aria-label="Animated bedtime cover dimming toward sleep"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={FEATURED_COVERS[0]} alt="Animated bedtime cover dimming toward sleep" className={styles.artCover} />
              </object>
              <div className={styles.artDim} aria-hidden="true" />
            </div>
            <ol className={styles.artPhases}>
              <li className={styles.artPhase}><span className={styles.artPhaseNum}>1</span><div className={styles.artPhaseText}><span className={styles.artPhaseLabel}>{c.art.phase1Label}</span><p>{c.art.phase1}</p></div></li>
              <li className={styles.artPhase}><span className={styles.artPhaseNum}>2</span><div className={styles.artPhaseText}><span className={styles.artPhaseLabel}>{c.art.phase2Label}</span><p>{c.art.phase2}</p></div></li>
              <li className={styles.artPhase}><span className={styles.artPhaseNum}>3</span><div className={styles.artPhaseText}><span className={styles.artPhaseLabel}>{c.art.phase3Label}</span><p>{c.art.phase3}</p></div></li>
            </ol>
          </div>
          <p className={styles.artMechanism}>{c.art.mechanism}</p>
        </div>
      </section>

      {/* ━━━ SECTION 5: LISTEN ━━━ */}
      <section className={styles.experience} ref={previewRef}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>{c.listen.title}</h2>
          <p className={styles.sectionSubtitle}>{c.listen.sub}</p>
          <div className={styles.radioCardWrap}>
            <RadioLiveCard />
          </div>
          <div className={styles.previewGrid}>
            {previews.map((preview, idx) => (
              <div key={idx} className={styles.previewCard}>
                <div className={styles.previewCoverWrap}>
                  {preview.cover ? (
                    <object
                      type="image/svg+xml"
                      data={preview.cover}
                      className={styles.previewCoverImg}
                      aria-label={`Cover for ${preview.title}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview.cover} alt={preview.title} className={styles.previewCoverImg} />
                    </object>
                  ) : (
                    <div className={styles.previewCoverPlaceholder}>
                      {TYPE_ICONS[preview.type] || '📖'}
                    </div>
                  )}
                  {previewEnded !== idx ? (
                    <button
                      className={`${styles.previewPlayBtn} ${playingIdx === idx && !audioRef.current?.paused ? styles.previewPlaying : ''}`}
                      onClick={() => handlePreviewPlay(idx)}
                      aria-label={playingIdx === idx ? c.listen.pauseAria : c.listen.playAria}
                    >
                      {playingIdx === idx && audioRef.current && !audioRef.current.paused ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                  ) : (
                    <div className={styles.previewOverlay}>
                      <p>{c.listen.endedQ}</p>
                      <Link href="/onboarding" className={styles.previewOverlayCta}>
                        {c.listen.endedCta}
                      </Link>
                    </div>
                  )}
                  {playingIdx === idx && (
                    <div className={styles.previewBarTrack}>
                      <div
                        className={styles.previewBar}
                        style={{ width: `${(elapsed / PREVIEW_LIMIT) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className={styles.previewMeta}>
                  <span className={styles.previewTypeBadge}>
                    {TYPE_ICONS[preview.type]} {c.typeBadge[preview.type] || c.typeBadge.story}
                  </span>
                  <h3 className={styles.previewTitle}>{preview.title}</h3>
                </div>
              </div>
            ))}
          </div>
          <Link href="/onboarding" className={styles.ctaPrimary}>
            {c.listen.cta}
          </Link>
        </div>
      </section>

      {/* ━━━ DOWNLOAD BAND (mid-page; not gated) ━━━ */}
      <section className={styles.downloadBand}>
        <div className={`${styles.sectionInner} ${styles.downloadBandInner}`}>
          <span className={styles.downloadBandTitle}>{c.download.bandTitle}</span>
          <AppBadges location="band" className={styles.appStoreLinks} />
        </div>
      </section>

      {/* ━━━ SECTION 6: TESTIMONIALS (placeholder — replace before launch) ━━━ */}
      <section className={styles.testimonials}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>{c.parents.title}</h2>
          <div className={styles.testimonialGrid}>
            <div className={styles.testimonialCard}>
              <p className={styles.quote}>&ldquo;{c.parents.q1}&rdquo;</p>
              <div className={styles.quoteAuthor}>{c.parents.q1Author}</div>
            </div>
            <div className={styles.testimonialCard}>
              <p className={styles.quote}>&ldquo;{c.parents.q2}&rdquo;</p>
              <div className={styles.quoteAuthor}>{c.parents.q2Author}</div>
            </div>
          </div>
          <p className={styles.testimonialNote}>{c.parents.illustrative}</p>
        </div>
      </section>

      {/* ━━━ SECTION 7: MADE FOR YOUR CHILD, AUTOMATICALLY (age + mood) ━━━ */}
      <section className={styles.explore}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>{c.explore.title}</h2>
          <p className={styles.sectionSubtitle}>{c.explore.lead}</p>

          <h3 className={styles.exploreSubtitle}>{c.explore.byAge}</h3>
          <div className={styles.ageRow}>
            {AGES.map((a) => (
              <Link key={a.href} href={a.href} className={styles.ageTag}>{a[lang]}</Link>
            ))}
          </div>

          <h3 className={styles.exploreSubtitle}>{c.explore.byMood}</h3>
          <p className={styles.moodExplainer}>{c.explore.moodExplainer}</p>
          <div className={styles.moodRow}>
            {MOODS.map((m) => (
              <span key={m.en} className={styles.moodTag}>{m.e} {m[lang]}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ DREAM VALLEY PREMIUM (web purchase surface — native-gated) ━━━ */}
      {!nativeRequest && (
        <section className={styles.premium}>
          <div className={`${styles.sectionInner} ${styles.premiumInner}`}>
            <h2 className={styles.premiumTitle}>{c.premium.title}</h2>
            <p className={styles.premiumLine}>{c.premium.line}</p>
            <Link href="/pricing" className={styles.premiumCta}>{c.premium.cta} →</Link>
          </div>
        </section>
      )}

      {/* ━━━ SECTION 8: FINAL CTA ━━━ */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaCover}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FINAL_CTA_COVER} alt="Animated bedtime story cover" className={styles.finalCtaCoverImg} />
          <div className={styles.heroOverlay} />
        </div>
        <div className={styles.finalCtaContent}>
          <h2 className={styles.finalCtaTitle}>{c.finalCta.title}</h2>
          <p className={styles.finalCtaSubtitle}>{c.finalCta.sub}</p>
          <Link href="/onboarding" className={styles.ctaPrimary}>
            {c.finalCta.cta}
          </Link>
          <p className={styles.noCreditCard}>{c.finalCta.noCard}</p>

          <div className={styles.appStoreSection}>
            <p className={styles.appStoreLabel}>{c.finalCta.getApp}</p>
            <AppBadges location="cta" className={styles.appStoreLinks} />
          </div>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-new.png" alt="Dream Valley" className={styles.footerLogo} />
            <p className={styles.footerTagline}>{c.footer.tagline}</p>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <h4>{c.footer.colProduct}</h4>
              <Link href="/how-it-works">{c.footer.lkHowItWorks}</Link>
              <Link href="/about">{c.footer.lkAbout}</Link>
              <Link href="/blog">{c.footer.lkBlog}</Link>
              <Link href="/support">{c.footer.lkContact}</Link>
            </div>
            <div className={styles.footerCol}>
              <h4>{c.footer.colApp}</h4>
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" onClick={() => dvAnalytics.track('app_download_click', { platform: 'ios', location: 'footer' })}>{c.footer.lkIos}</a>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" onClick={() => dvAnalytics.track('app_download_click', { platform: 'android', location: 'footer' })}>{c.footer.lkPlay}</a>
            </div>
            <div className={styles.footerCol}>
              <h4>{c.footer.colListen}</h4>
              <RadioLiveLink variant="footer" label={c.footer.lkRadio} />
            </div>
            <div className={styles.footerCol}>
              <h4>{c.footer.colLegal}</h4>
              <Link href="/privacy">{c.footer.lkPrivacy}</Link>
              <Link href="/support">{c.footer.lkTerms}</Link>
            </div>
          </div>
          <div className={styles.footerTrust}>{c.footer.trust}</div>
          <div className={styles.footerCopy}>
            &copy; {new Date().getFullYear()} Dream Valley. {c.footer.rights}
          </div>
        </div>
      </footer>
    </div>
  );
}
