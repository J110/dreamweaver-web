import {
  clearPricingIntent,
  getPricingReturnPath,
  readPricingIntent,
  savePricingIntent,
} from './pricingIntent';

function createStorage() {
  const values = new Map();
  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

describe('pricingIntent', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'sessionStorage', {
      configurable: true,
      value: createStorage(),
    });
    jest.spyOn(Date, 'now').mockReturnValue(2_000_000);
  });

  afterEach(() => jest.restoreAllMocks());

  test('round-trips a valid plan and builds its pricing return path', () => {
    savePricingIntent('annual');
    expect(readPricingIntent()).toBe('annual');
    expect(getPricingReturnPath()).toBe('/pricing?plan=annual');
  });

  test('rejects invalid intents', () => {
    savePricingIntent('lifetime');
    expect(readPricingIntent()).toBeNull();
    expect(getPricingReturnPath()).toBe('/');
  });

  test('rejects expired intents', () => {
    sessionStorage.setItem('dv_pricing_intent', JSON.stringify({ plan: 'monthly', createdAt: 1 }));
    expect(readPricingIntent()).toBeNull();
    expect(sessionStorage.getItem('dv_pricing_intent')).toBeNull();
  });

  test('clears an intent', () => {
    savePricingIntent('monthly');
    clearPricingIntent();
    expect(readPricingIntent()).toBeNull();
  });
});
