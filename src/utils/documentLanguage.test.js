const fs = require('node:fs');
const path = require('node:path');

test('document language synchronizes initial and changed i18n state', () => {
  let syncDocumentLanguage;
  expect(() => {
    ({ syncDocumentLanguage } = require('./documentLanguage'));
  }).not.toThrow();
  if (!syncDocumentLanguage) return;

  const root = { lang: '' };
  global.document = { documentElement: root };

  syncDocumentLanguage('en');
  expect(root.lang).toBe('en');

  syncDocumentLanguage('hi');
  expect(root.lang).toBe('hi');

  syncDocumentLanguage('unsupported');
  expect(root.lang).toBe('en');

  delete global.document;
});

test('i18n provider synchronizes the document whenever language state changes', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/utils/i18n.js'),
    'utf8',
  );

  expect(source).toContain("import { syncDocumentLanguage } from './documentLanguage';");
  expect(source).toMatch(
    /useEffect\(\(\) => \{\s*syncDocumentLanguage\(lang\);\s*\}, \[lang\]\);/s,
  );
});
