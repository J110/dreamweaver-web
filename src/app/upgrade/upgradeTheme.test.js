const fs = require('node:fs');
const path = require('node:path');

test('upgrade page uses Emberlight tokens and no legacy lavender token', () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), 'src/app/upgrade/page.module.css'),
    'utf8',
  );
  expect(css).toContain('--ink: #201418');
  expect(css).toContain('--ember: #D9A05F');
  expect(css).toContain('--cream: #F2E6D8');
  expect(css).not.toContain('--lavender:');
});

test('upgrade loading state uses semantic text', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/app/upgrade/UpgradeClient.js'),
    'utf8',
  );
  expect(source).not.toContain("color: 'rgba(248,246,255,0.5)'");
});
