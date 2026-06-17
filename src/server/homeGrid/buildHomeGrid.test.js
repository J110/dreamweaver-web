import { buildHomeGrid } from './buildHomeGrid';

jest.mock('@/utils/seedData', () => ({ getStories: () => [] }));

function mockFetch(map) {
  global.fetch = jest.fn((url, opts) => {
    const key = url.includes('/users/me') ? 'me' : 'trending';
    const r = map[key];
    return Promise.resolve({ ok: r.ok, status: r.status, json: () => Promise.resolve(r.body) });
  });
}

test('anon (no token) → never calls /users/me, isPremium false', async () => {
  mockFetch({ trending: { ok: true, status: 200, body: { data: { items: [{ id: 'a', premium_locked: true }] } } } });
  const out = await buildHomeGrid(null, 'en');
  expect(out.content[0].premium_locked).toBe(true);
  expect(global.fetch).toHaveBeenCalledTimes(1); // trending only
});

test('invalid token → /users/me 401 → isPremium false (fail-closed)', async () => {
  mockFetch({
    trending: { ok: true, status: 200, body: { data: { items: [{ id: 'p', type: 'long_story', premium_locked: true }] } } },
    me: { ok: false, status: 401, body: {} },
  });
  const out = await buildHomeGrid('bad-token', 'en');
  expect(out.content[0].premium_locked).toBe(true);
});

test('trending backend error → seed-only anon locked view (fail-closed, never throws)', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }));
  const out = await buildHomeGrid('any', 'en');
  expect(Array.isArray(out.content)).toBe(true);
});
