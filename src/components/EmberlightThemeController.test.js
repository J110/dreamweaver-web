const fs = require('node:fs');
const path = require('node:path');

test('theme controller owns root theme selection and native notification', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/components/EmberlightThemeController.js'),
    'utf8',
  );
  expect(source).toContain("setAttribute('data-theme', theme)");
  expect(source).toContain('DreamValleyTheme?.postMessage(theme)');
  expect(source).toContain('THEME_CHANGE_EVENT');
});
