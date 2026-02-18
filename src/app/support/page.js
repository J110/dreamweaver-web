'use client';

import Link from 'next/link';
import StarField from '@/components/StarField';
import styles from '../privacy/page.module.css';

export default function SupportPage() {
  return (
    <>
      <StarField />
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          <Link href="/" className={styles.backLink}>
            &larr; Back to Dream Valley
          </Link>

          <header className={styles.header}>
            <span className={styles.iconLarge} role="img" aria-label="support">
              &#x1F4AC;
            </span>
            <h1 className={styles.title}>Support &amp; Help</h1>
            <p className={styles.appName}>Dream Valley - Magical Bedtime Stories</p>
          </header>

          <div className={styles.intro}>
            We&apos;re here to help! Whether you have a question about using Dream Valley,
            need help with your account, or want to share feedback, you can reach us using the
            contact options below. We typically respond within 1&ndash;2 business days.
          </div>

          {/* Section 1 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>1</span>
              Contact Us
            </h2>
            <div className={styles.sectionContent}>
              <p>
                For any questions, issues, or feedback, please reach out to us by email. We&apos;re
                happy to help with anything related to Dream Valley.
              </p>
              <ul className={styles.list}>
                <li>
                  <span className={styles.bold}>General Support:</span>{' '}
                  <a href="mailto:support@vervetogether.com" style={{ color: '#6B4CE6' }}>support@vervetogether.com</a>
                </li>
                <li>
                  <span className={styles.bold}>Privacy Concerns:</span>{' '}
                  <a href="mailto:privacy@vervetogether.com" style={{ color: '#6B4CE6' }}>privacy@vervetogether.com</a>
                </li>
              </ul>
              <div className={styles.highlight}>
                <p>
                  When contacting support, please include a brief description of your issue and
                  the device you&apos;re using (iPhone, iPad, Android, or web browser). This
                  helps us assist you more quickly.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>2</span>
              Frequently Asked Questions
            </h2>
            <div className={styles.sectionContent}>
              <p className={styles.bold}>What is Dream Valley?</p>
              <p>
                Dream Valley is a bedtime story app that offers personalized stories, poems, and
                songs for children. Each story comes with ambient music and narration by different
                voice characters to create a soothing bedtime experience.
              </p>

              <p className={styles.bold}>Is Dream Valley free to use?</p>
              <p>
                Yes! Dream Valley is currently free to use with our full library of stories,
                narration voices, and ambient music.
              </p>

              <p className={styles.bold}>What age group is Dream Valley for?</p>
              <p>
                Dream Valley offers content suitable for children ages 0 through 12, with
                stories tailored for different developmental stages. Parents can select their
                child&apos;s age group during setup for the best experience.
              </p>

              <p className={styles.bold}>How do I change the narrator voice?</p>
              <p>
                On any story&apos;s player page, you&apos;ll see voice switch buttons below the
                play controls. Tap any of them to instantly switch between narrator voices.
                You can also set your preferred default voice in the Settings page.
              </p>

              <p className={styles.bold}>Can I use Dream Valley offline?</p>
              <p>
                Dream Valley currently requires an internet connection to stream stories and
                narration. We are exploring offline support for future updates.
              </p>

              <p className={styles.bold}>How do I report a problem with a story?</p>
              <p>
                If you find any issue with a story &mdash; such as audio problems, content
                concerns, or technical glitches &mdash; please email us at{' '}
                <a href="mailto:support@vervetogether.com" style={{ color: '#6B4CE6' }}>support@vervetogether.com</a>{' '}
                with the story name and a description of the issue.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>3</span>
              Account &amp; Data
            </h2>
            <div className={styles.sectionContent}>
              <p className={styles.bold}>How do I delete my account?</p>
              <p>
                To delete your account and all associated data, please email{' '}
                <a href="mailto:privacy@vervetogether.com" style={{ color: '#6B4CE6' }}>privacy@vervetogether.com</a>{' '}
                with the subject line &quot;Account Deletion Request.&quot; We will process your
                request within 30 days.
              </p>

              <p className={styles.bold}>What data does Dream Valley collect?</p>
              <p>
                We collect only the minimum information needed to personalize your experience:
                a chosen username, age group, and content preferences. We do not collect real
                email addresses, names, or payment information. For full details, please see
                our{' '}
                <Link href="/privacy" style={{ color: '#6B4CE6' }}>Privacy Policy</Link>.
              </p>

              <div className={styles.highlightImportant}>
                <p>
                  <span className={styles.bold}>Parents:</span> If you have concerns about your
                  child&apos;s data or want to exercise your parental rights under COPPA, please
                  contact us at{' '}
                  <a href="mailto:privacy@vervetogether.com" style={{ color: '#6B4CE6' }}>privacy@vervetogether.com</a>.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>4</span>
              Troubleshooting
            </h2>
            <div className={styles.sectionContent}>
              <p className={styles.bold}>Stories won&apos;t play or load</p>
              <ul className={styles.list}>
                <li>Check your internet connection and try again.</li>
                <li>Close and reopen the app or refresh the page.</li>
                <li>Make sure your device volume is turned up and not on silent mode.</li>
              </ul>

              <p className={styles.bold}>Music starts and stops unexpectedly</p>
              <ul className={styles.list}>
                <li>If you switch between stories quickly, give the music a moment to load.</li>
                <li>Try tapping the music play/pause button to restart the ambient music.</li>
              </ul>

              <p className={styles.bold}>App appears blank or doesn&apos;t load</p>
              <ul className={styles.list}>
                <li>Clear your browser cache and reload the page.</li>
                <li>If using the iOS app, try closing it completely and reopening.</li>
                <li>Make sure you&apos;re using a supported browser (Safari, Chrome, or Firefox).</li>
              </ul>

              <div className={styles.highlight}>
                <p>
                  If none of these steps resolve your issue, please email us at{' '}
                  <a href="mailto:support@vervetogether.com" style={{ color: '#6B4CE6' }}>support@vervetogether.com</a>{' '}
                  with details about the problem and your device information.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Card */}
          <div className={styles.contactCard}>
            <p className={styles.contactTitle}>Need More Help?</p>
            <a href="mailto:support@vervetogether.com" className={styles.contactEmail}>
              support@vervetogether.com
            </a>
            <p className={styles.contactNote}>
              We aim to respond to all inquiries within 1&ndash;2 business days.
            </p>
          </div>

          {/* Footer */}
          <footer className={styles.footer}>
            <p className={styles.footerText}>
              &copy; {new Date().getFullYear()} Dream Valley by Verve Together. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}
