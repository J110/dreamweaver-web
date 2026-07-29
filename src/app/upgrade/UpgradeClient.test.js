/** @jest-environment jsdom */

const React = require('react')
const { act } = require('react-dom/test-utils')
const { createRoot } = require('react-dom/client')

const mockGetCurrent = jest.fn()
const mockGetTiers = jest.fn()
const mockStartCheckout = jest.fn()
const mockOpenCheckoutUrl = jest.fn()

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn() }),
}), { virtual: true })
jest.mock('@/utils/api', () => ({
  subscriptionApi: { getCurrent: mockGetCurrent, getTiers: mockGetTiers },
  billingApi: { startCheckout: mockStartCheckout },
}), { virtual: true })
jest.mock('@/utils/checkoutPending', () => ({ openCheckoutUrl: mockOpenCheckoutUrl }), { virtual: true })
jest.mock('@/utils/platformDetect', () => ({ isNativeApp: () => false }), { virtual: true })
jest.mock('@/utils/upgradeIntent', () => ({ captureIntentFromQuery: jest.fn() }), { virtual: true })
jest.mock('@/components/StarField', () => () => null, { virtual: true })
jest.mock('@/components/UpgradeShowcase', () => () => null, { virtual: true })
jest.mock('./page.module.css', () => ({}), { virtual: true })

global.IS_REACT_ACT_ENVIRONMENT = true

describe('UpgradeClient checkout entitlement baseline', () => {
  let container
  let root

  const render = async () => {
    const UpgradeClient = require('./UpgradeClient').default
    await act(async () => root.render(React.createElement(UpgradeClient)))
  }

  const trialButton = () => Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent.includes('Start my free trial')
  )

  const clickTrial = async () => {
    await act(async () => {
      trialButton().dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    mockGetTiers.mockResolvedValue({})
    mockGetCurrent.mockReset()
    mockStartCheckout.mockReset()
    mockOpenCheckoutUrl.mockReset()
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  test('starts checkout only after a confirmed free entitlement baseline', async () => {
    mockGetCurrent.mockResolvedValue({ effective_premium: false })
    mockStartCheckout.mockResolvedValue({ checkout_url: 'https://checkout.example' })
    await render()
    await clickTrial()

    expect(mockStartCheckout).toHaveBeenCalledWith('monthly')
    expect(mockGetCurrent.mock.invocationCallOrder[0]).toBeLessThan(mockStartCheckout.mock.invocationCallOrder[0])
    expect(mockOpenCheckoutUrl).toHaveBeenCalledWith('https://checkout.example')
  })

  test('does not start checkout for confirmed premium entitlement', async () => {
    mockGetCurrent.mockResolvedValue({ effective_premium: true })
    await render()
    await clickTrial()

    expect(mockStartCheckout).not.toHaveBeenCalled()
    expect(container.textContent).toContain('already have Premium')
  })

  test.each([
    ['a failed entitlement request', () => mockGetCurrent.mockRejectedValue(new Error('offline'))],
    ['a missing entitlement boolean', () => mockGetCurrent.mockResolvedValue({})],
  ])('does not start checkout after %s', async (_, setup) => {
    setup()
    await render()
    await clickTrial()

    expect(mockStartCheckout).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Please try again')
  })
})
