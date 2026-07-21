import {
  PRICING_REGIONS,
  getPlanPrice,
  inferPricingRegion,
} from './regionalPricing';

describe('regionalPricing', () => {
  test('uses India for an Indian locale or timezone', () => {
    expect(inferPricingRegion({ locale: 'en-IN', timeZone: 'UTC' })).toBe(PRICING_REGIONS.INDIA);
    expect(inferPricingRegion({ locale: 'en-US', timeZone: 'Asia/Kolkata' })).toBe(PRICING_REGIONS.INDIA);
  });

  test('uses ROW when neither signal indicates India', () => {
    expect(inferPricingRegion({ locale: 'en-US', timeZone: 'America/New_York' })).toBe(PRICING_REGIONS.ROW);
  });

  test('returns approved monthly and annual prices', () => {
    expect(getPlanPrice(PRICING_REGIONS.INDIA, 'monthly')).toEqual({ amount: '₹500', period: 'month' });
    expect(getPlanPrice(PRICING_REGIONS.INDIA, 'annual')).toEqual({ amount: '₹4,000', period: 'year' });
    expect(getPlanPrice(PRICING_REGIONS.ROW, 'monthly')).toEqual({ amount: '$6', period: 'month' });
    expect(getPlanPrice(PRICING_REGIONS.ROW, 'annual')).toEqual({ amount: '$40', period: 'year' });
  });
});
