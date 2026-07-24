const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('premium component theme coverage', () => {
  test.each([
    'src/app/page.module.css',
    'src/components/BottomNav.module.css',
    'src/components/ContentCard.module.css',
    'src/app/before-bed/page.module.css',
  ])('%s defines premium component overrides', (file) => {
    expect(read(file)).toContain(":global(:root[data-theme='premium'])")
  })

  test('nap banner uses theme-aware colors', () => {
    const source = read('src/components/NapBanner.js')
    expect(source).toContain('var(--dv-banner-start)')
    expect(source).toContain('var(--dv-banner-button-start)')
  })

  test('before-bed player uses Emberlight tokens instead of purple literals', () => {
    const source = read('src/app/before-bed/[type]/[id]/page.js')
    expect(source).not.toContain('rgba(107, 76, 230')
    expect(source).toContain('var(--dv-soft-accent)')
    expect(source).toContain('var(--dv-text-dim)')
  })
})
