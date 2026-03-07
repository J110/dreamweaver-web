import Link from 'next/link';
import styles from './page.module.css';

export const metadata = {
  title: 'About Dream Valley — AI Bedtime Stories for Kids',
  description: 'Dream Valley is built by a team passionate about helping families have peaceful bedtimes. Learn about our mission, team, and the technology behind our stories.',
  alternates: { canonical: 'https://dreamvalley.app/about' },
  openGraph: {
    title: 'About Dream Valley — AI Bedtime Stories for Kids',
    description: 'Meet the team behind Dream Valley and learn about our mission to make bedtime peaceful for every family.',
    type: 'website',
    url: 'https://dreamvalley.app/about',
  },
};

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Dream Valley',
    url: 'https://dreamvalley.app/about',
    isPartOf: { '@type': 'WebSite', '@id': 'https://dreamvalley.app/#website' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className={styles.page}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link> / <span>About</span>
        </nav>

        {/* Mission */}
        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>About Dream Valley</h1>
          <p className={styles.heroSubtitle}>
            We believe bedtime should be the best part of a child&apos;s day — not a battle.
            Dream Valley exists to make that happen for every family.
          </p>
        </header>

        {/* Story */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Our Story</h2>
          <p>
            Dream Valley started with a simple observation: bedtime is hard.
            For millions of families, it&apos;s the most stressful 30 minutes of the day.
            The stalling, the negotiations, the &ldquo;one more story&rdquo; — parents are exhausted
            and children are wired.
          </p>
          <p>
            We asked: what if technology could help? Not with another bright screen or
            another generic meditation app, but with something designed from the ground up
            around how children actually fall asleep?
          </p>
          <p>
            That question led us to build Dream Valley — a bedtime experience that combines
            original AI-generated stories, calming narration voices, ambient music composed
            for each story, and living animated art that gradually dims and stills as your
            child drifts to sleep.
          </p>
          <p>
            Every element is engineered around sleep science: arousal matching, respiratory
            entrainment, cross-modal correspondence, and a three-phase architecture that
            guides a child from wide awake to sound asleep.
          </p>
        </section>

        {/* Team */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Our Team</h2>
          <div className={styles.teamGrid}>
            <div className={styles.teamCard}>
              <div className={styles.teamAvatar}>AM</div>
              <h3>Anmol Mohan</h3>
              <p className={styles.teamRole}>Co-founder</p>
              <p className={styles.teamBio}>
                Based in Singapore. MBA from HEC Paris. Background in design, AI, and innovation.
                Anmol leads product development and the AI systems that power Dream Valley&apos;s
                story generation, music composition, and animated cover pipeline.
              </p>
              <a
                href="https://www.linkedin.com/in/anmol-mohan/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.teamLink}
              >
                LinkedIn →
              </a>
            </div>
            <div className={styles.teamCard}>
              <div className={styles.teamAvatar}>NS</div>
              <h3>Neha Singh</h3>
              <p className={styles.teamRole}>Co-founder</p>
              <p className={styles.teamBio}>
                Based in Pune, India. Passionate about creating workplaces where people feel
                connected, motivated, and inspired to grow. Neha leads content strategy,
                user experience, and community building at Dream Valley.
              </p>
              <a
                href="https://www.linkedin.com/in/neha-singh-4a81ba11a/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.teamLink}
              >
                LinkedIn →
              </a>
            </div>
          </div>
        </section>

        {/* What we believe */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What We Believe</h2>
          <div className={styles.beliefGrid}>
            <div className={styles.beliefCard}>
              <h3>Bedtime should feel like magic</h3>
              <p>
                Not a chore. Not a negotiation. Every child deserves to end their day
                with wonder, warmth, and a story that&apos;s just for them.
              </p>
            </div>
            <div className={styles.beliefCard}>
              <h3>Technology should serve families</h3>
              <p>
                No ads. No autoplay. No addictive loops. Dream Valley is designed to
                help your child sleep, not to keep them scrolling.
              </p>
            </div>
            <div className={styles.beliefCard}>
              <h3>Fresh content matters</h3>
              <p>
                Children crave novelty. A story heard 20 times loses its power.
                Dream Valley generates something new every night — keeping bedtime fresh
                and your child engaged.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className={styles.cta}>
          <Link href="/how-it-works" className={styles.ctaSecondary}>
            Learn how it works →
          </Link>
          <Link href="/onboarding" className={styles.ctaButton}>
            Try Dream Valley tonight — free
          </Link>
        </div>

        <div className={styles.backLink}>
          <Link href="/">← Back to Dream Valley</Link>
        </div>
      </div>
    </>
  );
}
