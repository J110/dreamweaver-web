import fs from 'node:fs';

const requiredFiles = [
  'src/app/page.js',
  'src/app/explore/page.js',
  'src/app/player/[id]/page.js',
  'src/app/playlist/page.js',
  'src/app/my-stories/page.js',
  'src/app/settings/page.js',
  'src/app/login/page.js',
  'src/app/pricing/PricingClient.js',
  'src/app/upgrade/UpgradeClient.js',
  'src/app/upgrade/success/page.js',
  'src/app/upgrade/cancelled/page.js',
  'src/app/privacy/page.js',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing verification route: ${file}`);
}

const globals = fs.readFileSync('src/app/globals.css', 'utf8');
for (const token of [
  '#201418',
  '#2C1D20',
  '#3A262A',
  '#D9A05F',
  '#A8743F',
  '#F2E6D8',
  '#B39A86',
  '#8D7568',
]) {
  if (!globals.includes(token)) throw new Error(`Missing Emberlight token: ${token}`);
}

const upgrade = fs.readFileSync('src/app/upgrade/page.module.css', 'utf8');
if (!upgrade.includes('--ink: #201418')) {
  throw new Error('Upgrade page is not an Emberlight preview');
}
