/** @jest-environment jsdom */

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

test('upgrade page renders no legacy indigo, gold, or purple literals', () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), 'src/app/upgrade/page.module.css'),
    'utf8',
  );
  const renderedCss = css.replace(/^\s*--[\w-]+:.*;$/gm, '');

  expect(renderedCss).not.toMatch(
    /rgba?\((?:212,\s*175,\s*90|107,\s*76,\s*230|13,\s*11,\s*46|22,\s*18,\s*62|212,\s*160,\s*48|255,\s*245,\s*180)|#(?:1a1200|e8c460|d4a030|c88820)/i,
  );
});

test('upgrade loading state uses semantic text', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/app/upgrade/UpgradeClient.js'),
    'utf8',
  );
  expect(source).not.toContain("color: 'rgba(248,246,255,0.5)'");
});

test('upgrade headline follows the free and premium display-font property chain', () => {
  const globalCss = fs.readFileSync(
    path.join(process.cwd(), 'src/app/globals.css'),
    'utf8',
  );
  const upgradeCss = fs.readFileSync(
    path.join(process.cwd(), 'src/app/upgrade/page.module.css'),
    'utf8',
  );
  const style = document.createElement('style');
  style.textContent = `${globalCss}\n${upgradeCss}`;
  document.head.appendChild(style);
  const rules = Array.from(style.sheet.cssRules);
  const rule = (selector) => rules.find((candidate) => candidate.selectorText === selector);
  const baseDisplay = rule(':root').style
    .getPropertyValue('--dv-font-display')
    .trim();
  const premiumDisplay = rule(":root[data-theme='premium']").style
    .getPropertyValue('--dv-font-display')
    .trim();
  const headlineFont = rule('.headline').style
    .getPropertyValue('font-family')
    .trim();
  const resolveDisplayFont = (displayFont) => (
    headlineFont.replace('var(--dv-font-display)', displayFont)
  );

  expect(resolveDisplayFont(baseDisplay)).toBe('var(--font-dream-ui), serif');
  expect(resolveDisplayFont(premiumDisplay)).toBe('var(--font-dream-display), serif');
  style.remove();
});
