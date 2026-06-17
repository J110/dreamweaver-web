import HomeGridServer from './HomeGridServer';

jest.mock('@/server/homeGrid/buildHomeGrid', () => ({ buildHomeGrid: jest.fn() }));
jest.mock('./HomeAppClient', () => ({ __esModule: true, default: function HomeAppClient() { return null; } }));
import { buildHomeGrid } from '@/server/homeGrid/buildHomeGrid';

const story = (id, addedAt) => ({ id, type: 'story', cover: '/c.webp', audio_variants: [{ url: '/a.mp3' }], addedAt });

test('HomeGridServer fetches the anon EN seed and SSRs only a small above-fold slice (subset of full)', async () => {
  const content = Array.from({ length: 20 }, (_, i) => story('s' + i, `2026-06-${10 + i}`));
  buildHomeGrid.mockResolvedValueOnce({ content });
  const el = await HomeGridServer();
  expect(buildHomeGrid).toHaveBeenCalledWith(null, 'en');            // anon + en seed
  expect(el.props.initialItems.length).toBeGreaterThan(0);
  expect(el.props.initialItems.length).toBeLessThanOrEqual(12);      // <= PER_ROW(4) * 3 sections
  expect(el.props.initialItems.length).toBeLessThan(content.length); // strict subset => slicing happened
});

test('above-fold slice keeps all when fewer than PER_ROW', async () => {
  buildHomeGrid.mockResolvedValueOnce({ content: [story('a', '2026-06-10'), story('b', '2026-06-11')] });
  const el = await HomeGridServer();
  expect(el.props.initialItems.length).toBe(2);
});
