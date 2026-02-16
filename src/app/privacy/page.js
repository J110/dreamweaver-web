'use client';

import Link from 'next/link';
import StarField from '@/components/StarField';
import styles from './page.module.css';

export default function PrivacyPolicyPage() {
  return (
    <>
      <StarField />
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          <Link href="/" className={styles.backLink}>
            &larr; Back to Dream Valley
          </Link>

          <header className={styles.header}>
            <span className={styles.iconLarge} role="img" aria-label="shield">
              &#x1F6E1;&#xFE0F;
            </span>
            <h1 className={styles.title}>Privacy Policy</h1>
            <p className={styles.appName}>Dream Valley - Magical Bedtime Stories</p>
            <p className={styles.effectiveDate}>
              Effective Date: February 15, 2026 &middot; Last Updated: February 15, 2026
            </p>
          </header>

          <div className={styles.intro}>
            Dream Valley (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is a children&apos;s bedtime
            story application designed to deliver AI-powered personalized stories and poems for
            children ages 0 through 18, with primary focus on children ages 0 to 12. We are
            committed to protecting the privacy of children and families who use our app. This
            Privacy Policy explains what information we collect, how we use it, and the choices you
            have. We comply with the Children&apos;s Online Privacy Protection Act (COPPA) and
            applicable data protection laws.
          </div>

          {/* Section 1 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>1</span>
              Information We Collect
            </h2>
            <div className={styles.sectionContent}>
              <p>
                We collect only the minimum information necessary to provide a safe, personalized
                bedtime story experience. We do <span className={styles.bold}>not</span> collect
                real email addresses, precise location data, photographs, or payment information.
              </p>

              <p className={styles.bold}>Information you provide directly:</p>
              <ul className={styles.list}>
                <li>
                  <span className={styles.bold}>Username</span> &mdash; A chosen display name used to
                  identify your account. This is not a real email address. Your account uses a
                  generated identifier in the format username@dreamweaver.app, which serves only as
                  an internal login credential.
                </li>
                <li>
                  <span className={styles.bold}>Child&apos;s Age Group</span> &mdash; The age group
                  selection (0-1, 1-3, 4-5, 6-8, 8-12, or 12+) used to personalize story content for
                  developmental appropriateness.
                </li>
                <li>
                  <span className={styles.bold}>Content Preferences</span> &mdash; Preferred story
                  themes (such as animals, nature, fantasy, adventure, space, friendship, and others),
                  preferred language (English or Hindi), and preferred narrator voice.
                </li>
              </ul>

              <p className={styles.bold}>Information collected automatically:</p>
              <ul className={styles.list}>
                <li>
                  <span className={styles.bold}>Interaction Data</span> &mdash; Stories and poems you
                  like or save, playback history, and content generation requests. This data helps us
                  improve content recommendations.
                </li>
                <li>
                  <span className={styles.bold}>Device Preferences</span> &mdash; Voice selection,
                  language preference, and theme settings stored locally on your device via
                  localStorage.
                </li>
                <li>
                  <span className={styles.bold}>Basic Usage Analytics</span> &mdash; App usage
                  patterns such as session duration and feature usage, collected in aggregate form to
                  improve the app experience. These analytics do not identify individual children.
                </li>
              </ul>

              <div className={styles.highlightImportant}>
                <p>
                  <span className={styles.bold}>What we do NOT collect:</span> Real email addresses,
                  real names, physical addresses, phone numbers, precise geolocation, photos or
                  videos, contacts or address book data, payment or financial information, social
                  media account information, or any biometric data.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>2</span>
              How We Use Information
            </h2>
            <div className={styles.sectionContent}>
              <p>We use the limited information we collect solely for the following purposes:</p>
              <ul className={styles.list}>
                <li>
                  <span className={styles.bold}>Personalized Content</span> &mdash; To generate
                  age-appropriate bedtime stories and poems tailored to the selected age group and
                  preferred themes.
                </li>
                <li>
                  <span className={styles.bold}>Account Functionality</span> &mdash; To allow users
                  to log in, save favorite stories, and maintain their preferences across sessions.
                </li>
                <li>
                  <span className={styles.bold}>Audio Playback</span> &mdash; To deliver stories and
                  poems using text-to-speech in the selected narrator voice.
                </li>
                <li>
                  <span className={styles.bold}>Content Recommendations</span> &mdash; To suggest
                  stories and poems based on past interactions, liked content, and age group.
                </li>
                <li>
                  <span className={styles.bold}>App Improvement</span> &mdash; To understand how the
                  app is used in aggregate so we can improve features, fix issues, and enhance the
                  overall experience.
                </li>
                <li>
                  <span className={styles.bold}>Safety and Moderation</span> &mdash; To ensure all
                  generated content remains appropriate and safe for children.
                </li>
              </ul>

              <div className={styles.highlight}>
                <p>
                  We <span className={styles.bold}>never</span> use children&apos;s information for
                  advertising, marketing, or profiling purposes. We do not serve ads of any kind in
                  Dream Valley. We do not sell, rent, or share personal information with third parties
                  for their marketing purposes.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>3</span>
              Children&apos;s Privacy (COPPA Compliance)
            </h2>
            <div className={styles.sectionContent}>
              <p>
                Dream Valley is designed with children&apos;s safety as a top priority. We comply
                with the Children&apos;s Online Privacy Protection Act (COPPA) and take the following
                measures:
              </p>
              <ul className={styles.list}>
                <li>
                  We do not require children to provide any personal information beyond a chosen
                  username and age group to use the app.
                </li>
                <li>
                  We do not collect real email addresses, real names, or any other personally
                  identifiable information from children.
                </li>
                <li>
                  The username@dreamweaver.app format is an internal-only credential and does not
                  correspond to an actual email inbox.
                </li>
                <li>
                  We do not enable children to make their personal information publicly available.
                </li>
                <li>
                  We do not use behavioral advertising or targeted advertising directed at children.
                </li>
                <li>
                  All AI-generated content is filtered and reviewed for age-appropriateness before
                  being presented to children.
                </li>
                <li>
                  The app does not contain social features, chat functionality, or user-to-user
                  communication.
                </li>
                <li>
                  We do not condition a child&apos;s participation in any activity on the disclosure
                  of more personal information than is reasonably necessary.
                </li>
              </ul>

              <div className={styles.highlightImportant}>
                <p>
                  <span className={styles.bold}>Parental Notice:</span> We encourage parents and
                  guardians to supervise their children&apos;s use of the app. If you believe your
                  child has provided us with personal information beyond what is described in this
                  policy, please contact us immediately at privacy@vervetogether.com and we will
                  promptly delete such information.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>4</span>
              Data Storage and Security
            </h2>
            <div className={styles.sectionContent}>
              <p>We take data security seriously and implement appropriate measures to protect information:</p>
              <ul className={styles.list}>
                <li>
                  <span className={styles.bold}>Cloud Storage</span> &mdash; Account data (username,
                  age group, preferences, saved stories) is stored securely using Google Firebase,
                  which provides enterprise-grade security including encryption at rest and in transit.
                </li>
                <li>
                  <span className={styles.bold}>Local Storage</span> &mdash; Device preferences
                  (voice selection, language, theme settings) are stored locally on your device using
                  browser localStorage. This data never leaves your device.
                </li>
                <li>
                  <span className={styles.bold}>Authentication</span> &mdash; We use Firebase
                  Authentication with secure token-based authentication. Passwords are hashed and
                  never stored in plain text.
                </li>
                <li>
                  <span className={styles.bold}>Data Transmission</span> &mdash; All data transmitted
                  between the app and our servers is encrypted using industry-standard TLS/SSL
                  protocols.
                </li>
                <li>
                  <span className={styles.bold}>Access Controls</span> &mdash; Access to stored data
                  is restricted to authorized personnel only and is limited to what is necessary for
                  app operation and maintenance.
                </li>
              </ul>

              <div className={styles.highlight}>
                <p>
                  While we implement industry-standard security measures, no method of electronic
                  storage or transmission is 100% secure. We continuously monitor and update our
                  security practices to protect your information.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>5</span>
              Third-Party Services
            </h2>
            <div className={styles.sectionContent}>
              <p>
                Dream Valley uses the following third-party services to operate. These services are
                carefully selected for their security standards and privacy practices:
              </p>
              <ul className={styles.list}>
                <li>
                  <span className={styles.bold}>Google Firebase</span> &mdash; Used for user
                  authentication and cloud data storage (Firestore). Firebase is operated by Google
                  and complies with major privacy regulations. Firebase processes the username-based
                  credentials and stores user preferences and saved content. See Google&apos;s
                  privacy policy at privacy.google.com for more information.
                </li>
                <li>
                  <span className={styles.bold}>AI Content Generation Services</span> &mdash; We use
                  AI language models to generate bedtime stories and poems. The information sent to
                  these services is limited to the content request parameters (age group, theme,
                  language) and does not include any personally identifiable information about the
                  user. Generated content is filtered for child safety.
                </li>
                <li>
                  <span className={styles.bold}>Text-to-Speech Services</span> &mdash; We use
                  text-to-speech technology to convert generated stories into audio. Only the story
                  text and voice selection parameters are sent to these services. No user-identifying
                  information is transmitted.
                </li>
              </ul>

              <div className={styles.highlight}>
                <p>
                  We do not use any third-party advertising services, social media tracking pixels,
                  or analytics services that track individual children. We do not share personal
                  information with third parties for advertising or marketing purposes.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>6</span>
              Parental Rights
            </h2>
            <div className={styles.sectionContent}>
              <p>
                Parents and legal guardians have the following rights regarding their child&apos;s
                information:
              </p>
              <ul className={styles.list}>
                <li>
                  <span className={styles.bold}>Right to Review</span> &mdash; You may request to
                  review the personal information we have collected from your child by contacting us
                  at privacy@vervetogether.com.
                </li>
                <li>
                  <span className={styles.bold}>Right to Deletion</span> &mdash; You may request
                  that we delete all personal information associated with your child&apos;s account.
                  We will process deletion requests within 30 days.
                </li>
                <li>
                  <span className={styles.bold}>Right to Refuse Further Collection</span> &mdash; You
                  may request that we stop collecting information from your child and delete their
                  account entirely.
                </li>
                <li>
                  <span className={styles.bold}>Right to Data Portability</span> &mdash; You may
                  request a copy of your child&apos;s data in a commonly used, machine-readable
                  format.
                </li>
                <li>
                  <span className={styles.bold}>Right to Restrict Processing</span> &mdash; You may
                  request that we limit the processing of your child&apos;s information to essential
                  app functions only.
                </li>
              </ul>

              <div className={styles.highlightImportant}>
                <p>
                  To exercise any of these rights, please contact us at{' '}
                  <span className={styles.bold}>privacy@vervetogether.com</span> with the subject
                  line &quot;Parental Rights Request.&quot; We will verify your identity as the
                  child&apos;s parent or guardian before processing any request. All requests will be
                  handled within 30 days.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>7</span>
              Data Retention and Deletion
            </h2>
            <div className={styles.sectionContent}>
              <p>We retain user data according to the following guidelines:</p>
              <ul className={styles.list}>
                <li>
                  <span className={styles.bold}>Account Data</span> &mdash; Username, age group, and
                  preferences are retained for as long as the account is active. Upon account
                  deletion, this data is permanently removed within 30 days.
                </li>
                <li>
                  <span className={styles.bold}>Generated Content</span> &mdash; Saved stories and
                  poems are retained as long as the account is active. They are deleted when the
                  account is deleted or when the user removes them.
                </li>
                <li>
                  <span className={styles.bold}>Interaction Data</span> &mdash; Likes, saves, and
                  playback history are retained for as long as the account is active and are deleted
                  upon account deletion.
                </li>
                <li>
                  <span className={styles.bold}>Local Data</span> &mdash; Data stored in localStorage
                  on your device can be cleared at any time through your browser or device settings.
                </li>
                <li>
                  <span className={styles.bold}>Inactive Accounts</span> &mdash; Accounts that have
                  been inactive for more than 24 months may be automatically deleted, along with all
                  associated data. We will make reasonable efforts to notify users before such
                  deletion where possible.
                </li>
              </ul>

              <div className={styles.highlight}>
                <p>
                  <span className={styles.bold}>How to delete your account:</span> You can request
                  account deletion at any time by contacting us at privacy@vervetogether.com. Upon
                  receiving a verified deletion request, we will permanently delete all associated
                  data from our servers within 30 days. Data that has already been anonymized and
                  aggregated for analytics purposes cannot be attributed back to an individual and
                  may be retained.
                </p>
              </div>
            </div>
          </section>

          {/* Section 8 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>8</span>
              Changes to This Policy
            </h2>
            <div className={styles.sectionContent}>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our
                practices, technology, legal requirements, or other factors. When we make changes:
              </p>
              <ul className={styles.list}>
                <li>
                  We will update the &quot;Last Updated&quot; date at the top of this policy.
                </li>
                <li>
                  For material changes that affect how we handle children&apos;s information, we will
                  provide prominent notice within the app before the changes take effect.
                </li>
                <li>
                  If required by COPPA or other applicable law, we will obtain verifiable parental
                  consent before implementing changes that materially expand our collection or use of
                  children&apos;s information.
                </li>
                <li>
                  Continued use of Dream Valley after changes become effective constitutes acceptance
                  of the revised policy.
                </li>
              </ul>

              <p>
                We encourage you to review this Privacy Policy periodically to stay informed about
                how we protect your family&apos;s information.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>9</span>
              Contact Us
            </h2>
            <div className={styles.sectionContent}>
              <p>
                If you have any questions, concerns, or requests regarding this Privacy Policy or our
                data practices, please contact us:
              </p>
              <ul className={styles.list}>
                <li>
                  <span className={styles.bold}>Email:</span> privacy@vervetogether.com
                </li>
                <li>
                  <span className={styles.bold}>Subject Line:</span> Use &quot;Dream Valley Privacy
                  Inquiry&quot; for general questions, or &quot;Parental Rights Request&quot; for
                  requests related to your child&apos;s data.
                </li>
                <li>
                  <span className={styles.bold}>Response Time:</span> We aim to respond to all
                  inquiries within 5 business days and process all data requests within 30 days.
                </li>
              </ul>
            </div>
          </section>

          {/* Contact Card */}
          <div className={styles.contactCard}>
            <p className={styles.contactTitle}>Have Questions About Your Privacy?</p>
            <a href="mailto:privacy@vervetogether.com" className={styles.contactEmail}>
              privacy@vervetogether.com
            </a>
            <p className={styles.contactNote}>
              We take your family&apos;s privacy seriously and are here to help with any concerns.
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
