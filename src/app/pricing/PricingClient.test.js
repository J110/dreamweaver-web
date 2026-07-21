import fs from 'fs';
import path from 'path';

describe('PricingClient purchase path', () => {
  const source = fs.readFileSync(path.join(__dirname, 'PricingClient.js'), 'utf8');

  test('offers explicit regional monthly and annual choices', () => {
    expect(source).toContain("const [region, setRegion] = useState(PRICING_REGIONS.ROW)");
    expect(source).toContain("const [selectedPlan, setSelectedPlan] = useState('annual')");
    expect(source).toContain("['annual', 'monthly'].map((plan)");
    expect(source).toContain("getPlanPrice(region, plan)");
    expect(source).toContain('10% web discount');
    expect(source).toContain('India (₹)');
    expect(source).toContain('Rest of world ($)');
  });

  test('keeps annual recommended while allowing monthly selection', () => {
    expect(source).toContain("plan === 'annual' && (");
    expect(source).toContain('styles.recommendedBadge');
    expect(source).toContain('onClick={() => selectPlan(plan)}');
  });

  test('preserves anonymous intent and sends only the selected plan to checkout', () => {
    expect(source).toContain('savePricingIntent(selectedPlan)');
    expect(source).toContain("router.push('/onboarding')");
    expect(source).toContain('startCheckout(selectedPlan)');
    expect(source).toContain('clearPricingIntent()');
    expect(source).not.toContain("startCheckout('annual')");
    expect(source).not.toContain("startCheckout('monthly')");
  });

  test('restores a selected plan without automatically opening checkout', () => {
    expect(source).toContain("readPricingIntent() || 'annual'");
    expect(source).toContain("requestedPlan === 'monthly' || requestedPlan === 'annual'");
    expect(source).not.toContain('startCheckout(requestedPlan)');
  });
});
