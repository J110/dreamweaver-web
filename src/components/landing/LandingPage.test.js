import fs from 'fs';
import path from 'path';

test('hero exposes Premium pricing only to web visitors', () => {
  const source = fs.readFileSync(path.join(__dirname, 'LandingPage.js'), 'utf8');
  const copy = fs.readFileSync(path.join(__dirname, 'landingCopy.js'), 'utf8');

  expect(source).toContain('{!nativeRequest && (');
  expect(source).toContain('<Link href="/pricing" className={styles.ctaPremium}>');
  expect(source).toContain('{c.hero.premiumCta}');
  expect(source).toContain('<Link href="/onboarding" className={styles.ctaPrimary}>{c.hero.cta1}</Link>');
  expect(copy).toContain("premiumCta: 'Get Premium'");
  expect(copy).toContain("premiumCta: 'Premium lein'");
});
