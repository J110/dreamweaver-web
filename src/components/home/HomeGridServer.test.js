import HomeGridServer from './HomeGridServer';

jest.mock('@/server/homeGrid/buildHomeGrid', () => ({
  buildHomeGrid: jest.fn(() => Promise.resolve({ content: [{ id: 'seed1' }, { id: 'seed2' }] })),
}));
jest.mock('./HomeAppClient', () => ({ __esModule: true, default: function HomeAppClient() { return null; } }));
import { buildHomeGrid } from '@/server/homeGrid/buildHomeGrid';

test('HomeGridServer SSRs the anonymous EN seed and passes it as initialItems', async () => {
  const el = await HomeGridServer();
  expect(buildHomeGrid).toHaveBeenCalledWith(null, 'en');
  expect(el.props.initialItems).toEqual([{ id: 'seed1' }, { id: 'seed2' }]);
});
