/** @jest-environment jsdom */

const React = require('react');
const { act } = require('react-dom/test-utils');
const { createRoot } = require('react-dom/client');

const mockPush = jest.fn();
const mockSaveContent = jest.fn();
const mockUnsaveContent = jest.fn();
const mockUnlikeContent = jest.fn();
const mockSetUpgradeIntent = jest.fn();
const mockQueueOfflinePackage = jest.fn();
const mockRemoveOfflinePackage = jest.fn();
const mockOpenOfflineStore = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@/utils/auth', () => ({
  isLoggedIn: () => true,
  getUser: () => ({ uid: 'user-1' }),
}));
jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    t: (key) => ({
      heartCapTitle: 'Your 5 free saves are full',
      heartCapBody: 'Upgrade to Premium for 30 saved favorites and offline listening.',
      heartCapUpgrade: 'Upgrade to Premium',
      heartCapDismiss: 'Close',
      premiumCapTitle: 'Your Premium library is full',
      premiumCapBody: 'Your Premium library is full. Remove one saved favorite to add another.',
      playerSavedToProfile: 'Saved to your profile',
      playerRemovedFromSaved: 'Removed from saved',
      heartSignInToSave: 'Sign in to save',
    })[key] || key,
  }),
}));
jest.mock('@/utils/api', () => ({
  interactionApi: {
    saveContent: (...args) => mockSaveContent(...args),
    unsaveContent: (...args) => mockUnsaveContent(...args),
    unlikeContent: (...args) => mockUnlikeContent(...args),
  },
}));
jest.mock('@/utils/upgradeIntent', () => ({
  setUpgradeIntent: (...args) => mockSetUpgradeIntent(...args),
}));
jest.mock('@/utils/offlineLibrary', () => ({
  queueOfflinePackage: (...args) => mockQueueOfflinePackage(...args),
  removeOfflinePackage: (...args) => mockRemoveOfflinePackage(...args),
}));
jest.mock('@/utils/offlineStore', () => ({
  openOfflineStore: (...args) => mockOpenOfflineStore(...args),
}));
jest.mock('./HeartButton.module.css', () => ({
  heart: 'heart',
  filled: 'filled',
  toast: 'toast',
}));
jest.mock('./SaveLimitModal.module.css', () => ({
  backdrop: 'backdrop',
  dialog: 'dialog',
  dismiss: 'dismiss',
  upgrade: 'upgrade',
}));

const HeartButton = require('./HeartButton').default;

global.IS_REACT_ACT_ENVIRONMENT = true;

const sampleContent = {
  id: 'story-1',
  title: 'Moon Garden',
  audio_variants: [{ voice: 'female_2', url: '/audio/moon.mp3' }],
  cover: '/covers/moon.jpg',
};

describe('HeartButton save limits and offline lifecycle', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockPush.mockReset();
    mockSaveContent.mockReset();
    mockUnsaveContent.mockReset();
    mockUnlikeContent.mockReset();
    mockSetUpgradeIntent.mockReset();
    mockQueueOfflinePackage.mockReset().mockResolvedValue(null);
    mockRemoveOfflinePackage.mockReset().mockResolvedValue(null);
    mockOpenOfflineStore.mockReset().mockResolvedValue({ name: 'offline-store' });
    window.history.replaceState({}, '', '/player/story-1?voice=female_2');
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const renderHeart = (props = {}) => {
    act(() => {
      root.render(React.createElement(HeartButton, {
        contentId: 'story-1',
        content: sampleContent,
        ...props,
      }));
    });
  };

  const heart = () => container.querySelector('button[aria-pressed]');
  const dialog = () => container.querySelector('[role="dialog"]');

  const click = async (element) => {
    await act(async () => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
  };

  test('free sixth save reverts the heart and opens the upgrade modal on every attempt', async () => {
    mockSaveContent.mockResolvedValue({
      saved: false,
      liked: false,
      cap_reached: true,
      saved_count: 5,
      save_cap: 5,
      offline_allowed: false,
    });
    renderHeart();

    await click(heart());

    expect(dialog()).not.toBeNull();
    expect(dialog().getAttribute('aria-modal')).toBe('true');
    expect(dialog().textContent).toContain('30 saved favorites');
    expect(dialog().textContent).toContain('offline listening');
    expect(heart().getAttribute('aria-pressed')).toBe('false');

    await click(container.querySelector('[aria-label="Close"]'));
    await click(heart());

    expect(dialog()).not.toBeNull();
    expect(mockSaveContent).toHaveBeenCalledTimes(2);
    expect(mockUnlikeContent).not.toHaveBeenCalled();
  });

  test('upgrade action preserves the current path and query', async () => {
    mockSaveContent.mockResolvedValue({
      saved: false,
      liked: false,
      cap_reached: true,
      saved_count: 5,
      save_cap: 5,
      offline_allowed: false,
    });
    renderHeart();
    await click(heart());

    await click([...dialog().querySelectorAll('button')]
      .find((button) => button.textContent === 'Upgrade to Premium'));

    expect(mockSetUpgradeIntent).toHaveBeenCalledWith('/player/story-1?voice=female_2');
    expect(mockPush).toHaveBeenCalledWith('/upgrade?intent=%2Fplayer%2Fstory-1%3Fvoice%3Dfemale_2');
  });

  test('premium cap reverts the heart and shows library-full copy', async () => {
    mockSaveContent.mockResolvedValue({
      saved: false,
      liked: false,
      cap_reached: true,
      saved_count: 30,
      save_cap: 30,
      offline_allowed: false,
    });
    renderHeart({ effectivePremium: true });

    await click(heart());

    expect(heart().getAttribute('aria-pressed')).toBe('false');
    expect(dialog().textContent).toContain('Remove one saved favorite to add another.');
    expect(dialog().textContent).not.toContain('Upgrade to Premium');
  });

  test('premium save queues the current voice only after server confirmation', async () => {
    let confirmSave;
    mockSaveContent.mockReturnValue(new Promise((resolve) => {
      confirmSave = resolve;
    }));
    renderHeart({ effectivePremium: true, selectedVoice: 'female_2' });

    act(() => {
      heart().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(mockQueueOfflinePackage).not.toHaveBeenCalled();

    await act(async () => {
      confirmSave({ saved: true, liked: false, cap_reached: false, offline_allowed: true });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(heart().getAttribute('aria-pressed')).toBe('true');
    expect(mockQueueOfflinePackage).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      content: sampleContent,
      selectedVoice: 'female_2',
      store: { name: 'offline-store' },
    }));
  });

  test('unsave removes the package only after server success', async () => {
    let confirmUnsave;
    mockUnsaveContent.mockReturnValue(new Promise((resolve) => {
      confirmUnsave = resolve;
    }));
    renderHeart({ initialSaved: true });

    act(() => {
      heart().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(mockRemoveOfflinePackage).not.toHaveBeenCalled();

    await act(async () => {
      confirmUnsave({ saved: false, liked: false });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRemoveOfflinePackage).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      contentId: 'story-1',
      store: { name: 'offline-store' },
    }));
  });

  test('Escape dismisses the save-limit dialog', async () => {
    mockSaveContent.mockResolvedValue({
      saved: false,
      liked: false,
      cap_reached: true,
      saved_count: 5,
      save_cap: 5,
      offline_allowed: false,
    });
    renderHeart();
    await click(heart());

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(dialog()).toBeNull();
  });
});
