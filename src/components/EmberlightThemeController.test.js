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

test('theme controller reapplies the theme when storage is cleared', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/components/EmberlightThemeController.js'),
    'utf8',
  );
  expect(source).toContain('event.key === null || event.key === EFFECTIVE_PREMIUM_KEY');
});

test('layout provides theme font variables from the root element', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.js'), 'utf8');
  expect(source).toContain(
    '<html lang="en" className={`${quicksand.variable} ${fraunces.variable} ${tiroHindi.variable}`}>',
  );
  expect(source).toContain('<body className={quicksand.className}>');
});

test('premium reduced motion disables transitions', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');
  expect(source).toMatch(
    /:root\[data-theme='premium'\] \*[,\s\S]*?transition-duration: 1ms !important;/,
  );
});
