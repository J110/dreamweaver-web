import fs from 'fs';
import path from 'path';

test('every successful onboarding branch returns to a pending pricing plan', () => {
  const source = fs.readFileSync(path.join(__dirname, 'page.js'), 'utf8');
  const pricingReturns = source.match(/router\.replace\(getPricingReturnPath\(\)\)/g) || [];

  expect(source).toContain("import { getPricingReturnPath } from '@/utils/pricingIntent'");
  expect(pricingReturns).toHaveLength(3);
  expect(source).not.toContain("router.replace('/')");
});
