export const PRICING_REGIONS = Object.freeze({ INDIA: 'IN', ROW: 'ROW' });

const PRICES = Object.freeze({
  IN: Object.freeze({
    monthly: Object.freeze({ amount: '₹500', period: 'month' }),
    annual: Object.freeze({ amount: '₹4,000', period: 'year' }),
  }),
  ROW: Object.freeze({
    monthly: Object.freeze({ amount: '$6', period: 'month' }),
    annual: Object.freeze({ amount: '$40', period: 'year' }),
  }),
});

export function inferPricingRegion({ locale = '', timeZone = '' } = {}) {
  const indianLocale = /(?:^|[-_])IN$/i.test(locale);
  const indianTimeZone = timeZone === 'Asia/Kolkata' || timeZone === 'Asia/Calcutta';
  return indianLocale || indianTimeZone ? PRICING_REGIONS.INDIA : PRICING_REGIONS.ROW;
}

export function getPlanPrice(region, plan) {
  const safeRegion = region === PRICING_REGIONS.INDIA ? region : PRICING_REGIONS.ROW;
  return PRICES[safeRegion][plan];
}
