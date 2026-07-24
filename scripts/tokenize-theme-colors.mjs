import fs from 'node:fs';
import path from 'node:path';

const roots = ['src/app', 'src/components'];
const replacements = new Map([
  [/#0D0B2E/gi, 'var(--color-deep-night)'],
  [/#1A1550/gi, 'var(--color-midnight-blue)'],
  [/#2D2364/gi, 'var(--dv-surface-raised)'],
  [/#6B4CE6/gi, 'var(--color-primary-purple)'],
  [/#FF6B9D/gi, 'var(--color-primary-pink)'],
  [/#1E1854/gi, 'var(--color-card-dark)'],
  [/#F8F6FF/gi, 'var(--color-text-light)'],
  [/#B8B3D8/gi, 'var(--color-text-muted)'],
  [/rgba\\(107,\\s*76,\\s*230,\\s*0\\.24\\)/gi, 'var(--dv-hairline)'],
  [/rgba\\(107,\\s*76,\\s*230,\\s*0\\.12\\)/gi, 'var(--dv-soft-accent)'],
]);

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(full);
    return /\\.(css|js)$/.test(entry.name) ? [full] : [];
  });
}

for (const root of roots) {
  for (const file of filesUnder(root)) {
    if (file.endsWith('globals.css') || file.includes('/upgrade/')) continue;
    let source = fs.readFileSync(file, 'utf8');
    for (const [pattern, replacement] of replacements) {
      source = source.replace(pattern, replacement);
    }
    fs.writeFileSync(file, source);
  }
}
