import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const roots = ['apps', 'libs', 'proto', 'frontend', 'clickhouse', 'docker', 'scripts'];
const extensions = new Set(['.ts', '.vue', '.proto', '.sql', '.mjs', '.js', '.css']);
const skipDirs = new Set(['node_modules', 'dist', '.nuxt', '.output']);
const slash = String.fromCharCode(47);
const star = String.fromCharCode(42);
const patterns = [
  new RegExp('^\\s*' + slash + slash),
  new RegExp('\\' + slash + '\\' + star),
  new RegExp('<!' + '--'),
];
const offenders = [];

const walk = (path) => {
  const stats = statSync(path, { throwIfNoEntry: false });
  if (!stats) return;
  if (stats.isDirectory()) {
    for (const entry of readdirSync(path)) {
      if (!skipDirs.has(entry)) walk(join(path, entry));
    }
    return;
  }
  if (!extensions.has(extname(path))) return;
  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, index) => {
    const stripped = line.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');
    if (patterns.some((pattern) => pattern.test(stripped))) {
      offenders.push(`${path}:${index + 1}: ${line.trim()}`);
    }
  });
};

roots.forEach(walk);
if (offenders.length > 0) {
  console.error(offenders.join('\n'));
  process.exit(1);
}
console.log('no comments found');
