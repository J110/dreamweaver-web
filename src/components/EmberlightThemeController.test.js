/** @jest-environment jsdom */

const React = require('react')
const { act } = require('react-dom/test-utils')
const { createRoot } = require('react-dom/client')
const { EFFECTIVE_PREMIUM_KEY, THEME_CHANGE_EVENT } = require('../utils/emberlightTheme')

let mockPathname = '/settings'

jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }), { virtual: true })
jest.mock('@/utils/emberlightTheme', () => require('../utils/emberlightTheme'), { virtual: true })

global.IS_REACT_ACT_ENVIRONMENT = true

describe('EmberlightThemeController', () => {
  let container
  let root

  const mount = () => {
    const Controller = require('./EmberlightThemeController').default
    act(() => root.render(React.createElement(Controller)))
  }

  const storageEvent = (key, newValue) => {
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }))
  }

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    localStorage.clear()
    mockPathname = '/settings'
    delete document.documentElement.dataset.theme
    document.documentElement.removeAttribute('data-battery-saver')
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: false } })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  test('restores the premium theme from a confirmed persisted entitlement on cold start', () => {
    localStorage.setItem(EFFECTIVE_PREMIUM_KEY, 'true')
    mount()

    expect(document.documentElement.dataset.theme).toBe('premium')
  })

  test('uses cross-tab storage values and fails closed on clear or account replacement', () => {
    mount()

    act(() => storageEvent(EFFECTIVE_PREMIUM_KEY, 'true'))
    expect(document.documentElement.dataset.theme).toBe('premium')
    act(() => storageEvent(EFFECTIVE_PREMIUM_KEY, 'false'))
    expect(document.documentElement.dataset.theme).toBe('free')
    act(() => storageEvent(EFFECTIVE_PREMIUM_KEY, 'true'))
    act(() => storageEvent(null, null))
    expect(document.documentElement.dataset.theme).toBe('free')
    act(() => storageEvent(EFFECTIVE_PREMIUM_KEY, 'true'))
    act(() => storageEvent('dreamweaver_user', JSON.stringify({ family_id: 'other' })))
    expect(document.documentElement.dataset.theme).toBe('free')
  })

  test.each([
    [{ saveData: true }, true],
    [{ saveData: false }, false],
    [undefined, true],
  ])('sets battery saver activity for connection %p', (connection, expected) => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: connection })
    mount()

    expect(document.documentElement.hasAttribute('data-battery-saver')).toBe(expected)
  })
})
