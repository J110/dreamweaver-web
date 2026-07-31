const fs = require('fs');
const path = require('path');

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const variableNames = (source, pattern) => (
  Array.from(source.matchAll(pattern), (match) => match[1])
);

const declarations = (source, selector) => {
  const start = source.indexOf(`${selector} {`);
  const end = source.indexOf('\n}', start);
  return Object.fromEntries(
    Array.from(
      source.slice(start, end).matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm),
      (match) => [match[1], match[2]],
    ),
  );
};

const ruleBody = (source, selector) => {
  const start = source.indexOf(`${selector} {`);
  return source.slice(start, source.indexOf('}', start));
};

const resolve = (value, palette) => {
  const reference = value.match(/^var\((--[\w-]+)\)$/);
  return reference ? resolve(palette[reference[1]], palette) : value;
};

const luminance = (hex) => {
  const channels = hex.slice(1).match(/.{2}/g).map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
};

const contrast = (first, second) => {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
};

test('character wizard only consumes theme variables defined by globals', () => {
  const wizard = read('src/app/characters/create/page.module.css');
  const globals = read('src/app/globals.css');
  const consumed = new Set(variableNames(wizard, /var\((--[\w-]+)/g));
  const defined = new Set(Object.keys(declarations(globals, ':root')));

  expect(Array.from(consumed).filter((name) => !defined.has(name))).toEqual([]);
});

test('primary button text has AA contrast against the accent in both palettes', () => {
  const wizard = read('src/app/characters/create/page.module.css');
  const globals = read('src/app/globals.css');
  const base = declarations(globals, ':root');
  const premium = { ...base, ...declarations(globals, ":root[data-theme='premium']") };

  expect(base['--dv-on-accent']).toBe(resolve(base['--dv-text'], base));
  expect(premium['--dv-on-accent']).toBe('#201418');
  expect(wizard).toContain('color: var(--dv-on-accent);');
  expect(contrast(resolve(base['--dv-accent'], base), base['--dv-on-accent'])).toBeGreaterThanOrEqual(4.5);
  expect(contrast(premium['--dv-accent'], premium['--dv-on-accent'])).toBeGreaterThanOrEqual(4.5);
});

test('control borders remain visible against both control surfaces in both palettes', () => {
  const wizard = read('src/app/characters/create/page.module.css');
  const globals = read('src/app/globals.css');
  const base = declarations(globals, ':root');
  const premium = { ...base, ...declarations(globals, ":root[data-theme='premium']") };

  expect(base['--dv-control-border']).toBe('#8D7FE0');
  expect(premium['--dv-control-border']).toBe('#B88451');
  expect(ruleBody(wizard, '.card :global(.characterWizard textarea)')).toContain('border: 1px solid var(--dv-control-border);');
  expect(ruleBody(wizard, '.card :global(.characterPaidDialog button)')).toContain('border: 1px solid var(--dv-control-border);');
  expect(ruleBody(wizard, '.card')).toContain('border: 1px solid var(--dv-hairline);');
  expect(ruleBody(wizard, '.card :global(.characterWizard fieldset)')).toContain('border: 1px solid var(--dv-hairline);');
  for (const palette of [base, premium]) {
    const border = palette['--dv-control-border'];
    expect(contrast(border, resolve(palette['--dv-surface'], palette))).toBeGreaterThanOrEqual(3);
    expect(contrast(border, palette['--dv-surface-raised'])).toBeGreaterThanOrEqual(3);
  }
});
