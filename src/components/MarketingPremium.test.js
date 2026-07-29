const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('marketing hero links free visitors to Premium pricing', () => {
  const landingPage = read('src/components/landing/LandingPage.js');
  const landingCopy = read('src/components/landing/landingCopy.js');

  expect(landingPage).toContain('href="/pricing"');
  expect(landingPage).toContain('c.hero.premiumCta');
  expect(landingCopy).toContain("premiumCta: 'Get Premium'");
  expect(landingCopy).toContain("premiumCta: 'Premium lein'");
});

test('pricing page offers regional annual and monthly plans', () => {
  const pricingClient = read('src/app/pricing/PricingClient.js');

  expect(pricingClient).toContain('PRICING_REGIONS.INDIA');
  expect(pricingClient).toContain('PRICING_REGIONS.ROW');
  expect(pricingClient).toContain("['annual', 'monthly']");
  expect(pricingClient).toContain('10% web discount');
});
