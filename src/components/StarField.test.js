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

  test('provides natural premium firefly paths while retaining 60 shared particles', () => {
    render()

    const stars = particles()
    expect(stars).toHaveLength(60)
    expect(stars[0].style.getPropertyValue('--firefly-left')).not.toBe('')
    expect(stars[0].style.getPropertyValue('--firefly-top')).not.toBe('')
    for (let waypoint = 1; waypoint <= 5; waypoint += 1) {
      expect(stars[0].style.getPropertyValue(`--firefly-x${waypoint}`)).not.toBe('')
      expect(stars[0].style.getPropertyValue(`--firefly-y${waypoint}`)).not.toBe('')
    }
    expect(stars[0].style.getPropertyValue('--firefly-wander-duration')).not.toBe('')
    expect(stars[0].style.getPropertyValue('--firefly-glow-duration')).not.toBe('')
  })

  test('shows exactly 40 premium fireflies across the jittered 8 by 5 grid', () => {
    document.documentElement.dataset.theme = 'premium'
    render()

    const stars = particles()
    expect(stars.filter((star) => getComputedStyle(star).display !== 'none')).toHaveLength(40)
    expect(styleRule(":root[data-theme='premium'] .star").style.getPropertyValue('left')).toBe('var(--firefly-left)')
    expect(styleRule(":root[data-theme='premium'] .star").style.getPropertyValue('top')).toBe('var(--firefly-top)')
    expect(styleRule(":root[data-theme='premium'] .star").style.animation).toContain('fireflyWander')
    expect(styleRule(":root[data-theme='premium'] .star").style.animation).toContain('fireflyGlow')

    stars.slice(0, 40).forEach((star, index) => {
      const column = index % 8
      const row = Math.floor(index / 8)
      const left = Number.parseFloat(star.style.getPropertyValue('--firefly-left'))
      const top = Number.parseFloat(star.style.getPropertyValue('--firefly-top'))

      expect(left).toBeGreaterThanOrEqual(((column + 0.2) / 8) * 100)
      expect(left).toBeLessThanOrEqual(((column + 0.8) / 8) * 100)
      expect(top).toBeGreaterThanOrEqual(((row + 0.2) / 5) * 100)
      expect(top).toBeLessThanOrEqual(((row + 0.8) / 5) * 100)

      for (let waypoint = 1; waypoint <= 5; waypoint += 1) {
        const x = Number.parseFloat(star.style.getPropertyValue(`--firefly-x${waypoint}`))
        const y = Number.parseFloat(star.style.getPropertyValue(`--firefly-y${waypoint}`))
        expect(x).toBeGreaterThanOrEqual(-60)
        expect(x).toBeLessThanOrEqual(60)
        expect(y).toBeGreaterThanOrEqual(-50)
        expect(y).toBeLessThanOrEqual(50)
      }

      const wanderDuration = Number.parseFloat(star.style.getPropertyValue('--firefly-wander-duration'))
      const wanderDelay = Number.parseFloat(star.style.getPropertyValue('--firefly-wander-delay'))
      const glowDuration = Number.parseFloat(star.style.getPropertyValue('--firefly-glow-duration'))
      const glowDelay = Number.parseFloat(star.style.getPropertyValue('--firefly-glow-delay'))

      expect(wanderDuration).toBeGreaterThanOrEqual(18)
      expect(wanderDuration).toBeLessThanOrEqual(32)
      expect(wanderDelay).toBeGreaterThanOrEqual(-32)
      expect(wanderDelay).toBeLessThanOrEqual(0)
      expect(glowDuration).toBeGreaterThanOrEqual(3)
      expect(glowDuration).toBeLessThanOrEqual(7)
      expect(glowDelay).toBeGreaterThanOrEqual(-7)
      expect(glowDelay).toBeLessThanOrEqual(0)
    })
  })

  test('uses independent premium wander and glow timing without free twinkle overrides', () => {
    document.documentElement.dataset.theme = 'premium'
    render()

    const star = particles()[0]
    const style = getComputedStyle(star)
    const premiumAnimation = style.animation || styleRule(":root[data-theme='premium'] .star").style.animation
    const animationNames = style.animationName
      ? style.animationName.split(',').map((name) => name.trim())
      : premiumAnimation.split(',').map((animation) => animation.trim().split(/\s+/)[0])
    const durations = style.animationDuration
      ? style.animationDuration.split(',').map((duration) => Number.parseFloat(duration))
      : [
          Number.parseFloat(star.style.getPropertyValue('--firefly-wander-duration')),
          Number.parseFloat(star.style.getPropertyValue('--firefly-glow-duration')),
        ]

    expect(star.style.animationDuration).toBe('')
    expect(animationNames).toEqual(['fireflyWander', 'fireflyGlow'])
    expect(durations).toHaveLength(2)
    expect(durations[0]).toBeGreaterThanOrEqual(18)
    expect(durations[0]).toBeLessThanOrEqual(32)
    expect(durations[1]).toBeGreaterThanOrEqual(3)
    expect(durations[1]).toBeLessThanOrEqual(7)
  })

  test('retains all 60 twinkling stars through the free theme selector', () => {
    document.documentElement.dataset.theme = 'free'
    render()

    expect(particles().filter((star) => getComputedStyle(star).display !== 'none')).toHaveLength(60)
    expect(styleRule(":root:not([data-theme='premium']) .star").style.animation).toContain('twinkle')
    expect(styleRule(":root[data-theme='premium'] .star").style.getPropertyValue('left')).toBe('var(--firefly-left)')
  })

  test('keeps free twinkle timing between two and five seconds', () => {
    document.documentElement.dataset.theme = 'free'
    render()

    const star = particles()[0]
    const computedDuration = getComputedStyle(star).animationDuration
    const duration = Number.parseFloat(computedDuration || star.style.getPropertyValue('--star-twinkle-duration'))
    expect(duration).toBeGreaterThanOrEqual(2)
    expect(duration).toBeLessThanOrEqual(5)
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
