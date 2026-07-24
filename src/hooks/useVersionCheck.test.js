import { shouldReloadForBuild } from './useVersionCheck';

describe('shouldReloadForBuild', () => {
  test('prevents a second reload for the same server build', () => {
    expect(shouldReloadForBuild({
      currentBuildId: 'old',
      serverBuildId: 'new',
      attemptedBuildId: 'new',
    })).toBe(false);
  });

  test('reloads once when the server build changes', () => {
    expect(shouldReloadForBuild({
      currentBuildId: 'old',
      serverBuildId: 'new',
      attemptedBuildId: null,
    })).toBe(true);
  });
});
