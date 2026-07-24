/** @jest-environment jsdom */

import React from 'react'
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'
import StarField from './StarField'

global.IS_REACT_ACT_ENVIRONMENT = true

describe('StarField theme particles', () => {
  let container
  let root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  test('provides motion paths for premium fireflies while retaining 60 shared particles', () => {
    act(() => root.render(<StarField />))

    const particles = container.querySelectorAll('.star')
    expect(particles).toHaveLength(60)
    expect(particles[0].style.getPropertyValue('--firefly-drift-x')).not.toBe('')
    expect(particles[0].style.getPropertyValue('--firefly-drift-y')).not.toBe('')
    expect(particles[0].style.getPropertyValue('--firefly-mid-x')).not.toBe('')
    expect(particles[0].style.getPropertyValue('--firefly-mid-y')).not.toBe('')
  })
})
