const fs = require('fs');
const path = require('path');

test('native apps can open upgrade while pricing remains web-only', () => {
  const page = fs.readFileSync(path.join(__dirname, 'page.js'), 'utf8');
  const middleware = fs.readFileSync(path.join(__dirname, '../../middleware.js'), 'utf8');

  expect(page).not.toContain('isNativeRequest');
  expect(page).not.toContain('notFound');
  expect(middleware).toContain("matcher: ['/pricing']");
  expect(middleware).not.toContain("'/pricing', '/upgrade'");
});
