const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

test('premium surfaces promise 30 saves and offline listening', () => {
  expect(read('src/app/pricing/PricingClient.js')).toMatch(/30 saved favorites/i)
  expect(read('src/app/pricing/PricingClient.js')).toMatch(/offline/i)
  expect(read('src/app/support/page.js')).not.toMatch(/exploring offline support/i)
})
