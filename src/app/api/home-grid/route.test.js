import { GET, dynamic } from './route';

jest.mock('@/server/homeGrid/buildHomeGrid', () => ({
  buildHomeGrid: jest.fn((token) => Promise.resolve({ content: [{ token: token ?? 'ANON' }] })),
}));
import { buildHomeGrid } from '@/server/homeGrid/buildHomeGrid';

function req(headers = {}, url = 'http://x/api/home-grid?lang=en') {
  return { headers: { get: (k) => headers[k.toLowerCase()] ?? null }, url };
}

beforeEach(() => { buildHomeGrid.mockClear(); });

test('no Authorization header → token null (anon/locked)', async () => {
  await GET(req());
  expect(buildHomeGrid).toHaveBeenCalledWith(null, 'en');
});

test('malformed Authorization (not "Bearer ") → token null (fail-closed)', async () => {
  await GET(req({ authorization: 'Token abc' }));
  expect(buildHomeGrid).toHaveBeenCalledWith(null, 'en');
});

test('empty-after-Bearer → token null (fail-closed)', async () => {
  await GET(req({ authorization: 'Bearer ' }));
  expect(buildHomeGrid).toHaveBeenCalledWith(null, 'en');
  buildHomeGrid.mockClear();
  await GET(req({ authorization: 'Bearer     ' })); // whitespace only
  expect(buildHomeGrid).toHaveBeenCalledWith(null, 'en');
});

test('valid Bearer token forwarded verbatim', async () => {
  await GET(req({ authorization: 'Bearer t-123' }));
  expect(buildHomeGrid).toHaveBeenCalledWith('t-123', 'en');
});

test('route is force-dynamic (per-user response never statically cached)', () => {
  expect(dynamic).toBe('force-dynamic');
});

test('response is no-store', async () => {
  const res = await GET(req({ authorization: 'Bearer t-1' }));
  expect(res.headers.get('Cache-Control')).toBe('no-store');
});
