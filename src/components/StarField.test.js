/** @jest-environment jsdom */

const fs = require('fs')
const path = require('path')
const React = require('react')
const { act } = require('react-dom/test-utils')
const { createRoot } = require('react-dom/client')
const StarField = require('./StarField').default
const globalCss = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8')

global.IS_REACT_ACT_ENVIRONMENT = true

describe('StarField theme particles', () => {
  let container
  let root
  let stylesheet

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    stylesheet = document.createElement('style')
    stylesheet.textContent = globalCss
    document.head.appendChild(stylesheet)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    stylesheet.remove()
    delete document.documentElement.dataset.theme
  })

  const render = () => act(() => root.render(React.createElement(StarField)))

  const particles = () => Array.from(container.querySelectorAll('.star'))

  const cssRules = (rules) => Array.from(rules).flatMap((rule) => [
    rule,
    ...(rule.cssRules ? cssRules(rule.cssRules) : []),
  ])

  const styleRule = (selector) => cssRules(stylesheet.sheet.cssRules).find(
    (rule) => rule.selectorText === selector
  )

  test('provides motion paths for premium fireflies while retaining 60 shared particles', () => {
    render()

    const stars = particles()
    expect(stars).toHaveLength(60)
    expect(stars[0].style.getPropertyValue('--firefly-drift-x')).not.toBe('')
    expect(stars[0].style.getPropertyValue('--firefly-drift-y')).not.toBe('')
    expect(stars[0].style.getPropertyValue('--firefly-mid-x')).not.toBe('')
    expect(stars[0].style.getPropertyValue('--firefly-mid-y')).not.toBe('')
  })

  test('shows exactly 24 premium fireflies through the active theme selector', () => {
    document.documentElement.dataset.theme = 'premium'
    render()

    expect(particles().filter((star) => getComputedStyle(star).display !== 'none')).toHaveLength(24)
    expect(styleRule(":root[data-theme='premium'] .star").style.getPropertyValue('animation-name')).toBe('fireflyDrift')
  })

  test('retains all 60 twinkling stars through the free theme selector', () => {
    document.documentElement.dataset.theme = 'free'
    render()

    expect(particles().filter((star) => getComputedStyle(star).display !== 'none')).toHaveLength(60)
    expect(styleRule('.star').style.animation).toContain('twinkle')
  })

  test('declares no animation for premium fireflies when reduced motion is active', () => {
    document.documentElement.dataset.theme = 'premium'
    render()

    const premiumRule = cssRules(stylesheet.sheet.cssRules).find(
      (rule) => rule.parentRule?.conditionText === '(prefers-reduced-motion: reduce)'
        && rule.selectorText === ":root[data-theme='premium'] .star"
    )

    expect(premiumRule.style.animation).toBe('none')
    expect(premiumRule.style.opacity).toBe('0.65')
  })
})
