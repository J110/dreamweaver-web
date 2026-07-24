import { parseOfferings, restoreNativeForUser, recoverActivePurchase } from './nativePurchase';

test('maps RevenueCat monthly and annual packages', () => {
  const monthly = { id: '$rc_monthly', priceString: '$6.00' };
  const annual = { id: '$rc_annual', priceString: '$40.00' };

  expect(parseOfferings({ packages: [monthly, annual] })).toEqual({
    monthly,
    annual,
    other: [],
    all: [monthly, annual],
  });
});

test('identifies the current user before restoring', async () => {
  const calls = [];
  const result = await restoreNativeForUser('user-2', {
    identify: async (uid) => { calls.push(`identify:${uid}`); return true; },
    restore: async () => { calls.push('restore'); return { success: true, active: true }; },
  });

  expect(calls).toEqual(['identify:user-2', 'restore']);
  expect(result).toEqual({ success: true, active: true });
});

test('recovers an already-owned purchase through restore', async () => {
  const result = await recoverActivePurchase(
    { success: false, error: 'product_already_purchased' },
    async () => ({ success: true, active: true }),
  );

  expect(result).toEqual({ success: true, restored: true });
});
