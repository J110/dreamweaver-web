const fs = require('node:fs');
const path = require('node:path');

test('theme controller trusts authoritative same-tab detail when storage is unavailable', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/components/EmberlightThemeController.js'),
    'utf8',
  );

  expect(source).toContain('const eventPremium = event?.detail?.current');
  expect(source).toContain("typeof eventPremium === 'boolean'");
});

test('upgrade wash plays once per module session when seen persistence fails', () => {
  const transition = fs.readFileSync(
    path.join(process.cwd(), 'src/utils/emberlightTransition.js'),
    'utf8',
  );
  const component = fs.readFileSync(
    path.join(process.cwd(), 'src/components/EmberlightUpgradeWash.js'),
    'utf8',
  );

  expect(transition).toContain('let upgradeWashSeenThisSession = false');
  expect(component).toContain('readUpgradeWashSeen(localStorage)');
  expect(component).toContain('markUpgradeWashSeen(localStorage)');
});
