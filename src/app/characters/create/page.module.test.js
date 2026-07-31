const fs = require('fs');
const path = require('path');

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const variableNames = (source, pattern) => (
  Array.from(source.matchAll(pattern), (match) => match[1])
);

test('character wizard only consumes theme variables defined by globals', () => {
  const wizard = read('src/app/characters/create/page.module.css');
  const globals = read('src/app/globals.css');
  const consumed = new Set(variableNames(wizard, /var\((--[\w-]+)/g));
  const defined = new Set(variableNames(globals, /^\s*(--[\w-]+)\s*:/gm));

  expect(Array.from(consumed).filter((name) => !defined.has(name))).toEqual([]);
});
