import fs from 'node:fs';
import path from 'node:path';

const roots = ['src/app', 'src/components'];
const forbidden = /#(?:0D0B2E|1A1550|2D2364|6B4CE6|FF6B9D|1E1854|F8F6FF|B8B3D8)\\b/i;
const failures = [];

function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) scan(full);
    if (!entry.isFile() || !/\\.(css|js)$/.test(entry.name)) continue;
    if (full.endsWith('globals.css') || full.includes('/upgrade/')) continue;
    const lines = fs.readFileSync(full, 'utf8').split('\\n');
    lines.forEach((line, index) => {
      if (forbidden.test(line)) failures.push(`${full}:${index + 1}`);
    });
  }
}

roots.forEach(scan);
if (failures.length) {
  process.stderr.write(`${failures.join('\\n')}\\n`);
  process.exit(1);
}
