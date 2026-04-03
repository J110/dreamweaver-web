'use client';

/**
 * LandingPage — The marketing landing page for new/anonymous visitors.
 * 9 sections + footer per the website spec. Dark warm palette, mobile-first.
 * 'use client' for interactivity (scroll, play button) — SSR still renders HTML.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { dvAnalytics } from '@/utils/analytics';
import styles from './landing.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dreamvalley.app';
const PREVIEW_LIMIT = 60; // seconds

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

const TYPE_LABELS = { story: 'Story', poem: 'Poem', song: 'Lullaby', long_story: 'Story' };
const TYPE_ICONS = { story: '📖', poem: '📝', song: '🎵', long_story: '📖' };

/* ─── Featured FLUX covers for the landing page ─── */
const FEATURED_COVERS = [
  '/covers/gen-638cb2facd22.svg',
  '/covers/gen-6e675d15e1f5.svg',
  '/covers/gen-e77b10c51e8f.svg',
  '/covers/gen-146a4028274a.svg',
  '/covers/gen-b5438a861ba4.svg',
  '/covers/gen-292e9eadf56e.svg',
  '/covers/gen-f9e33d4db1bd.svg',
];

const FINAL_CTA_COVER = '/covers/gen-01f0b88dc42d.svg';

/* ─── Category tags for the explore section ─── */
const CATEGORIES = [
  'Dreamy', 'Adventure', 'Animals', 'Space', 'Fantasy',
  'Fairy Tales', 'Nature', 'Ocean', 'Bedtime', 'Friendship',
  'Family', 'Mystery', 'Science',
];

const CATEGORY_SLUGS = {
  'Dreamy': 'dreamy', 'Adventure': 'adventure', 'Animals': 'animals',
  'Space': 'space', 'Fantasy': 'fantasy', 'Fairy Tales': 'fairy-tales',
  'Nature': 'nature', 'Ocean': 'ocean', 'Bedtime': 'bedtime',
  'Friendship': 'friendship', 'Family': 'family', 'Mystery': 'mystery',
  'Science': 'science',
};

export default function LandingPage() {
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
    <div className={styles.landing}>
      {/* ━━━ NAVIGATION BAR ━━━ */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-new.png" alt="Dream Valley" className={styles.navLogo} />
          <div className={styles.navLinks}>
            <Link href="/how-it-works" className={styles.navLink}>How It Works</Link>
            <Link href="/about" className={styles.navLink}>About</Link>
            <Link href="/blog" className={styles.navLink}>Blog</Link>
            <Link href="/onboarding" className={styles.navCta}>Get Started</Link>
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
          <h1 className={styles.heroTitle}>
            Bedtime stories that put kids to sleep.
          </h1>
          <p className={styles.heroSubtitle}>
            AI-generated stories every night — with calming narration, original music,
            and living animated art that gently guides your child from wide awake to sound asleep.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/onboarding" className={styles.ctaPrimary}>
              Try a story tonight — free
            </Link>
            <button
              onClick={() => scrollTo(howItWorksRef)}
              className={styles.ctaSecondary}
            >
              See how it works ↓
            </button>
          </div>
        </div>
      </section>

      {/* ━━━ SECTION 2: THE PROBLEM ━━━ */}
      <section className={styles.problem}>
        <div className={styles.sectionInner}>
          <p className={styles.problemLead}>
            Bedtime shouldn&apos;t be a battle.
          </p>
          <p className={styles.problemBody}>
            But for millions of families, it is. The stalling, the negotiations, the tears.
            You&apos;ve tried the routine. You&apos;ve tried the white noise. Maybe you&apos;ve even tried melatonin.
          </p>
          <p className={styles.problemPivot}>
            What if the story itself could do the work?
          </p>
        </div>
      </section>

      {/* ━━━ SECTION 3: HOW DREAM VALLEY WORKS ━━━ */}
      <section className={styles.howItWorks} ref={howItWorksRef}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>How Dream Valley Works</h2>

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
              <h3 className={styles.pillarTitle}>A new story, every night</h3>
              <p className={styles.pillarText}>
                Dream Valley creates original bedtime stories every day — adventures, fairy tales,
                ocean journeys, forest mysteries, and more. Your child never hears the same story twice.
                Just pick tonight&apos;s world and press play.
              </p>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className={styles.pillar}>
            <div className={styles.pillarVisual}>
              <div className={styles.voiceShowcase}>
                <div className={styles.voiceGroup}>
                  <div className={styles.voiceGroupLabel}>Narration voices</div>
                  <div className={styles.voiceCards}>
                    <div className={styles.voiceCard}><span>🌙</span> Calm</div>
                    <div className={styles.voiceCard}><span>🌿</span> Soft</div>
                    <div className={styles.voiceCard}><span>🎵</span> Melodic</div>
                    <div className={styles.voiceCard}><span>🌊</span> Gentle</div>
                    <div className={styles.voiceCard}><span>🎶</span> Musical</div>
                    <div className={styles.voiceCard}><span>🎧</span> ASMR</div>
                  </div>
                </div>
                <div className={styles.voiceGroup}>
                  <div className={styles.voiceGroupLabel}>Lullaby instruments</div>
                  <div className={styles.voiceCards}>
                    <div className={styles.voiceCard}><span>🎵</span> Harp</div>
                    <div className={styles.voiceCard}><span>🎸</span> Guitar</div>
                    <div className={styles.voiceCard}><span>🎹</span> Piano</div>
                    <div className={styles.voiceCard}><span>🎻</span> Cello</div>
                    <div className={styles.voiceCard}><span>🪈</span> Flute</div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.pillarContent}>
              <h3 className={styles.pillarTitle}>Six voices. Original music. Living art.</h3>
              <p className={styles.pillarText}>
                Pick from six narration voices for stories and poems — from calm whispers to melodic tones.
                Lullabies come with their own instrument themes: harp, guitar, piano, cello, or flute.
                Every story has its own original ambient music. And each cover is a living scene —
                water flows, fireflies glow, clouds drift — bringing your child into the story world.
              </p>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className={styles.pillar}>
            <div className={styles.pillarVisual}>
              <div className={styles.phaseDemo}>
                <div className={styles.phase}>
                  <div className={`${styles.phaseCircle} ${styles.phase1}`} />
                  <span>Phase 1</span>
                  <small>Engage</small>
                </div>
                <div className={styles.phaseArrow}>→</div>
                <div className={styles.phase}>
                  <div className={`${styles.phaseCircle} ${styles.phase2}`} />
                  <span>Phase 2</span>
                  <small>Descend</small>
                </div>
                <div className={styles.phaseArrow}>→</div>
                <div className={styles.phase}>
                  <div className={`${styles.phaseCircle} ${styles.phase3}`} />
                  <span>Phase 3</span>
                  <small>Sleep</small>
                </div>
              </div>
            </div>
            <div className={styles.pillarContent}>
              <h3 className={styles.pillarTitle}>Designed to guide your child to sleep</h3>
              <p className={styles.pillarText}>
                Our stories aren&apos;t just calming — they&apos;re engineered.
                Each one moves through three phases: engaging your child first,
                then gradually slowing the narration, dimming the visuals, and quieting the music —
                guiding them through the natural stages of falling asleep.
                The story and the sleep science are one and the same.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ SECTION 4: EXPERIENCE IT ━━━ */}
      <section className={styles.experience} ref={previewRef}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Listen now — no signup needed</h2>
          <p className={styles.sectionSubtitle}>A story, a poem, and a lullaby. Just press play.</p>
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
                  {/* Play/Pause button */}
                  {previewEnded !== idx ? (
                    <button
                      className={`${styles.previewPlayBtn} ${playingIdx === idx && !audioRef.current?.paused ? styles.previewPlaying : ''}`}
                      onClick={() => handlePreviewPlay(idx)}
                      aria-label={playingIdx === idx ? 'Pause preview' : 'Play preview'}
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
                      <p>Want to hear more?</p>
                      <Link href="/onboarding" className={styles.previewOverlayCta}>
                        Explore free
                      </Link>
                    </div>
                  )}
                  {/* Progress bar */}
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
                    {TYPE_ICONS[preview.type]} {TYPE_LABELS[preview.type] || 'Story'}
                  </span>
                  <h3 className={styles.previewTitle}>{preview.title}</h3>
                </div>
              </div>
            ))}
          </div>
          <Link href="/onboarding" className={styles.ctaPrimary}>
            Explore all stories — free
          </Link>
        </div>
      </section>

      {/* ━━━ SECTION 5: WHY IT WORKS ━━━ */}
      <section className={styles.whyItWorks}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Why It Works</h2>
          <div className={styles.scienceGrid}>
            <div className={styles.scienceCard}>
              <div className={styles.scienceIcon}>🎯</div>
              <h3>Starts where your child is</h3>
              <p>
                Our stories begin warm and engaging — matching your child&apos;s current energy.
                We don&apos;t start with whispers. We start with wonder.
                This is called arousal matching, and it&apos;s why your child actually pays attention
                instead of fighting the calm.
              </p>
            </div>
            <div className={styles.scienceCard}>
              <div className={styles.scienceIcon}>🌙</div>
              <h3>Guides them down naturally</h3>
              <p>
                As the story progresses, everything slows together. The narration pace drops.
                The music tempo eases. The animated cover dims and stills.
                Your child doesn&apos;t decide to get sleepy — the story takes them there,
                the way a car ride does.
              </p>
            </div>
            <div className={styles.scienceCard}>
              <div className={styles.scienceIcon}>✨</div>
              <h3>Uses every sense</h3>
              <p>
                Warm-spectrum visuals protect melatonin production.
                Breathing-rate music encourages slower respiration.
                Gradually dimming art signals the brain that it&apos;s time for sleep.
                Every element — visual, auditory, narrative — moves in the same direction: toward rest.
              </p>
            </div>
            <div className={styles.scienceCard}>
              <div className={styles.scienceIcon}>😌</div>
              <h3>Meets your child where they are</h3>
              <p>
                A hyper child and a worried child need different stories.
                Every Dream Valley story is tuned to a specific mood —
                matching your child&apos;s emotional state before guiding them toward sleep.
                This isn&apos;t new — lullabies across cultures have always done this,
                from Mesopotamian protection chants for anxious babies
                to nonsense-syllable songs for restless toddlers.
                We&apos;re just doing it with precision.
              </p>
            </div>
          </div>
          <Link href="/how-it-works" className={styles.learnMore}>
            Learn more about our approach →
          </Link>
        </div>
      </section>

      {/* ━━━ SECTION 6: TESTIMONIALS ━━━ */}
      <section className={styles.testimonials}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>What Parents Say</h2>
          <div className={styles.testimonialGrid}>
            <div className={styles.testimonialCard}>
              <p className={styles.quote}>
                &ldquo;My daughter used to fight bedtime for 45 minutes. Now she asks for her
                Dream Valley story. I actually get my evenings back.&rdquo;
              </p>
              <div className={styles.quoteAuthor}>— Sarah, parent of a 4-year-old</div>
            </div>
            <div className={styles.testimonialCard}>
              <p className={styles.quote}>
                &ldquo;I was using ChatGPT to make up stories every night.
                Dream Valley is that, but with actual narration, music, and the most beautiful art.
                My son is obsessed.&rdquo;
              </p>
              <div className={styles.quoteAuthor}>— James, parent of a 5-year-old</div>
            </div>
            <div className={styles.testimonialCard}>
              <p className={styles.quote}>
                &ldquo;We tried everything — melatonin, white noise, staying in the room.
                This is the first thing that actually made bedtime peaceful.&rdquo;
              </p>
              <div className={styles.quoteAuthor}>— Priya, parent of a 3-year-old</div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ SECTION 7: NOT ANOTHER BEDTIME STORY APP ━━━ */}
      <section className={styles.comparison}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Not Another Bedtime Story App</h2>
          <div className={styles.comparisonGrid}>
            <div className={styles.comparisonCard}>
              <h3>Unlike ChatGPT bedtime stories...</h3>
              <p>
                AI text on a bright screen doesn&apos;t help kids sleep.
                Dream Valley wraps AI storytelling in calming narration, original music,
                and animated art that gradually dims — a complete bedtime experience, not a wall of text.
              </p>
            </div>
            <div className={styles.comparisonCard}>
              <h3>Unlike pre-recorded story libraries...</h3>
              <p>
                Fixed libraries run out. Your child hears the same stories again and again
                until they stop working. Dream Valley generates something new every night —
                fresh characters, new worlds, original art. Your child never gets bored of bedtime.
              </p>
            </div>
            <div className={styles.comparisonCard}>
              <h3>Unlike screens before bed...</h3>
              <p>
                Blue light, bright UI, autoplay algorithms — normal screens fight sleep.
                Dream Valley uses warm-spectrum visuals, gradually dimming art, and no ads or autoplay.
                This is screen time you don&apos;t have to feel guilty about.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ SECTION 8: EXPLORE DREAM VALLEY ━━━ */}
      <section className={styles.explore}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Explore Dream Valley</h2>
          <div className={styles.exploreGrid}>
            <div className={styles.exploreCard}>
              <div className={styles.exploreIcon}>📖</div>
              <h3>Stories</h3>
              <p>Adventures that begin exciting and end in sleep. From 5-minute quick tales to 20-minute long journeys.</p>
            </div>
            <div className={styles.exploreCard}>
              <div className={styles.exploreIcon}>🌙</div>
              <h3>Long Stories</h3>
              <p>Extended narratives for deeper immersion. Three-phase sleep journeys with rich worlds and characters.</p>
            </div>
            <div className={styles.exploreCard}>
              <div className={styles.exploreIcon}>📝</div>
              <h3>Poems</h3>
              <p>Rhythmic, gentle verse that naturally slows breathing through cadence and repetition.</p>
            </div>
            <div className={styles.exploreCard}>
              <div className={styles.exploreIcon}>🎵</div>
              <h3>Lullabies</h3>
              <p>Original musical pieces with sleep-safe melodies. Perfect for winding down the last few minutes.</p>
            </div>
          </div>
          <h3 className={styles.exploreSubtitle}>Tuned to your child&apos;s mood</h3>
          <p className={styles.moodExplainer}>
            Bedtime isn&apos;t one-size-fits-all. A wired child needs a different story
            than an anxious one. Dream Valley matches content to how your child feels right now.
          </p>
          <div className={styles.moodRow}>
            <span className={styles.moodTag}>😌 Calm</span>
            <span className={styles.moodTag}>🔍 Curious</span>
            <span className={styles.moodTag}>⚡ Wired</span>
            <span className={styles.moodTag}>💧 Sad</span>
            <span className={styles.moodTag}>🌀 Anxious</span>
            <span className={styles.moodTag}>🔥 Angry</span>
          </div>

          <div className={styles.tagRow}>
            {CATEGORIES.map((cat) => (
              <Link key={cat} href={`/category/${CATEGORY_SLUGS[cat]}`} className={styles.tag}>
                {cat}
              </Link>
            ))}
          </div>
          <div className={styles.ageRow}>
            <Link href="/ages/0-1" className={styles.ageTag}>Ages 0-1</Link>
            <Link href="/ages/2-5" className={styles.ageTag}>Ages 2-5</Link>
            <Link href="/ages/6-8" className={styles.ageTag}>Ages 6-8</Link>
            <Link href="/ages/9-12" className={styles.ageTag}>Ages 9-12</Link>
          </div>
        </div>
      </section>

      {/* ━━━ SECTION 9: FINAL CTA ━━━ */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaCover}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FINAL_CTA_COVER} alt="Animated bedtime story cover" className={styles.finalCtaCoverImg} />
          <div className={styles.heroOverlay} />
        </div>
        <div className={styles.finalCtaContent}>
          <h2 className={styles.finalCtaTitle}>Tonight&apos;s story is waiting.</h2>
          <p className={styles.finalCtaSubtitle}>
            A new bedtime adventure every night. Calming voices, original music,
            and living art that guides your child to sleep.
          </p>
          <Link href="/onboarding" className={styles.ctaPrimary}>
            Start free tonight
          </Link>
          <p className={styles.noCreditCard}>No credit card required. Free stories every night.</p>

          <div className={styles.appStoreSection}>
            <p className={styles.appStoreLabel}>Get the app</p>
            <div className={styles.appStoreLinks}>
              <a
                href="https://apps.apple.com/sg/app/dream-valley-stories/id6759262548"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.appStoreLink}
                onClick={() => dvAnalytics.track('app_download_click', { platform: 'ios', location: 'cta' })}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.vervetogether.dreamvalley"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.appStoreLink}
                onClick={() => dvAnalytics.track('app_download_click', { platform: 'android', location: 'cta' })}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm.91-.91L19.59 12 17.72 9.79l-2.27 2.27 2.27 2.15zM6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49z"/>
                </svg>
                Google Play
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-new.png" alt="Dream Valley" className={styles.footerLogo} />
            <p className={styles.footerTagline}>Magical bedtime stories for kids</p>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <h4>Product</h4>
              <Link href="/how-it-works">How It Works</Link>
              <Link href="/about">About</Link>
              <Link href="/blog">Blog</Link>
              <Link href="/support">Contact</Link>
            </div>
            <div className={styles.footerCol}>
              <h4>Get the App</h4>
              <a href="https://apps.apple.com/sg/app/dream-valley-stories/id6759262548" target="_blank" rel="noopener noreferrer" onClick={() => dvAnalytics.track('app_download_click', { platform: 'ios', location: 'footer' })}>iOS App Store</a>
              <a href="https://play.google.com/store/apps/details?id=com.vervetogether.dreamvalley" target="_blank" rel="noopener noreferrer" onClick={() => dvAnalytics.track('app_download_click', { platform: 'android', location: 'footer' })}>Google Play</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Legal</h4>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/support">Terms of Service</Link>
            </div>
          </div>
          <div className={styles.footerTrust}>
            Dream Valley uses AI to generate stories, narration, music, and art.
            Content is reviewed for age-appropriateness and safety.
          </div>
          <div className={styles.footerCopy}>
            &copy; {new Date().getFullYear()} Dream Valley. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
