import Link from 'next/link';
import styles from './page.module.css';

export const metadata = {
  title: 'The Sleep Science Behind Dream Valley',
  description: 'Learn how Dream Valley uses arousal matching, three-phase sleep architecture, warm-spectrum visuals, and respiratory entrainment to guide your child from awake to asleep.',
  alternates: { canonical: 'https://dreamvalley.app/how-it-works' },
  openGraph: {
    title: 'The Sleep Science Behind Dream Valley',
    description: 'How bedtime stories, narration pacing, ambient music, and animated art work together to help children fall asleep.',
    type: 'article',
    url: 'https://dreamvalley.app/how-it-works',
  },
};

export default function HowItWorksPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'The Sleep Science Behind Dream Valley',
    description: metadata.description,
    url: 'https://dreamvalley.app/how-it-works',
    datePublished: '2026-03-01',
    publisher: { '@id': 'https://dreamvalley.app/#organization' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className={styles.page}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link> / <span>How It Works</span>
        </nav>

        {/* Hero */}
        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>The science behind Dream Valley</h1>
          <p className={styles.heroSubtitle}>
            Every story, every voice, every note of music, every pixel of our animated art
            is designed around one goal: guiding your child from awake to asleep. Here&apos;s how.
          </p>
        </header>

        {/* Section: Arousal Matching */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>We start where your child is</h2>
          <div className={styles.sectionBody}>
            <p>
              Most sleep apps start calm. That&apos;s a mistake. A child who&apos;s bouncing off the walls
              at 8 PM won&apos;t connect with a whispered story — there&apos;s too big a gap between their
              current energy and the story&apos;s energy. They&apos;ll fidget, resist, or simply ignore it.
            </p>
            <p>
              Dream Valley starts with engagement. Phase 1 of every story matches a child&apos;s awake
              energy — the narrative is interesting, the cover art is vivid, the narration pace is
              conversational. The child is drawn in because the story meets them where they are.
            </p>
            <p>
              This principle is called <strong>arousal matching</strong>, and it&apos;s one of the
              foundational techniques in sleep therapy. You don&apos;t drag someone to sleep — you meet
              their current state and gently guide them down.
            </p>
          </div>
        </section>

        {/* Section: Three-Phase Journey */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>The three-phase journey</h2>
          <div className={styles.sectionBody}>
            <p>Every Dream Valley story moves through three distinct phases:</p>

            <div className={styles.phaseCards}>
              <div className={styles.phaseCard}>
                <div className={`${styles.phaseIndicator} ${styles.p1}`} />
                <h3>Phase 1 — Capture</h3>
                <p className={styles.phaseTime}>Minutes 1–4</p>
                <p>
                  The story is engaging, the world is alive, the narration is warm and natural.
                  The child is hooked.
                </p>
              </div>
              <div className={styles.phaseCard}>
                <div className={`${styles.phaseIndicator} ${styles.p2}`} />
                <h3>Phase 2 — Descent</h3>
                <p className={styles.phaseTime}>Minutes 4–10</p>
                <p>
                  The story slows. Narration pace drops. Music tempo eases. The animated cover
                  begins to dim and still. The child feels the world getting quieter but doesn&apos;t
                  notice the deliberate pacing — it feels natural, like evening turning to night.
                </p>
              </div>
              <div className={styles.phaseCard}>
                <div className={`${styles.phaseIndicator} ${styles.p3}`} />
                <h3>Phase 3 — Sleep</h3>
                <p className={styles.phaseTime}>Minutes 10–18</p>
                <p>
                  The story is barely a whisper. The music is breathing-rate slow. The cover is
                  nearly still, deeply dimmed. Only a gentle glow remains, pulsing at 6 breaths
                  per minute — matching the respiratory rate of a sleeping child.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Visual Sleep Science */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What your child sees</h2>
          <div className={styles.sectionBody}>
            <p>
              Screen time before bed is harmful because screens emit blue light that suppresses
              melatonin, the hormone that triggers sleep. Dream Valley addresses this directly.
            </p>
            <p>
              All visuals use <strong>warm-spectrum colors</strong> — soft ambers, deep purples,
              warm creams. No cool blues, no bright whites. The animated cover gradually dims across
              the three phases, reducing overall screen brightness.
            </p>
            <p>
              The cover art transitions from vivid and engaging to deeply warm and nearly dark —
              signaling the brain that it&apos;s nighttime. This approach is based on research into
              <strong> cross-modal correspondence</strong>: when visual warmth and dimness align
              with auditory calm, the brain receives a unified &ldquo;time to sleep&rdquo; signal
              that&apos;s more powerful than any single cue alone.
            </p>
          </div>
        </section>

        {/* Section: Auditory Sleep Science */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What your child hears</h2>
          <div className={styles.sectionBody}>
            <p>Dream Valley uses three audio layers that work together:</p>
            <div className={styles.audioLayers}>
              <div className={styles.audioLayer}>
                <h4>Narration Pacing</h4>
                <p>
                  Starts at conversational speed and slows progressively through each phase.
                  The human voice naturally entrains a listener&apos;s breathing — when the narrator
                  slows, the child&apos;s breathing slows.
                </p>
              </div>
              <div className={styles.audioLayer}>
                <h4>Original Ambient Music</h4>
                <p>
                  Generated for each story. Tempo begins around 70 BPM and drops to approximately
                  55 BPM by Phase 3 — close to a sleeping child&apos;s heart rate. The music uses
                  low-frequency sounds rather than melodic instruments, to avoid stimulating active listening.
                </p>
              </div>
              <div className={styles.audioLayer}>
                <h4>Breathing Pacer</h4>
                <p>
                  A subtle pulse at a controlled breathing rate — 12 breaths per minute in Phase 1,
                  dropping to 6 breaths per minute by Phase 3. The child unconsciously synchronizes
                  without being told to &ldquo;breathe deeply.&rdquo;
                </p>
              </div>
            </div>
            <p>
              This technique, called <strong>respiratory entrainment</strong>, is one of the most
              well-studied non-pharmacological sleep aids.
            </p>
          </div>
        </section>

        {/* Section: Integration */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What makes this different</h2>
          <div className={styles.sectionBody}>
            <p>
              Most sleep tools use a single intervention: a meditation app guides breathing.
              A white noise machine masks sound. A bedtime story entertains. A dark room removes light.
            </p>
            <p>
              Dream Valley <strong>integrates all of these</strong> into a single experience.
              The story provides narrative engagement. The narration pacing guides breathing.
              The music sets the tempo. The animated cover manages light exposure.
              The phase progression creates a complete arc from awake to asleep.
            </p>
            <p>
              No other product combines all of these into one unified experience.
              That integration is what makes Dream Valley work for children who haven&apos;t responded
              to any single intervention alone.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className={styles.cta}>
          <Link href="/onboarding" className={styles.ctaButton}>
            Try a story tonight — free
          </Link>
          <p className={styles.ctaHint}>No credit card required</p>
        </div>

        <div className={styles.backLink}>
          <Link href="/">← Back to Dream Valley</Link>
          <span className={styles.sep}>·</span>
          <Link href="/about">About Us</Link>
        </div>
      </div>
    </>
  );
}
