const fs = require('fs');
const path = require('path');

test('locked nap track opens the shared upgrade page', () => {
  const source = fs.readFileSync(path.join(__dirname, 'page.js'), 'utf8');

  expect(source).toContain("router.push('/upgrade')");
  expect(source).not.toContain("router.push('/pricing')");
});
