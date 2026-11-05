// scripts/r1-package-json.ts — R1 (Next 16 + Prisma 7), 2026-11-05. Idempotent.
// Edits package.json versions; you then run `npm install` yourself.
// Versions match millewee/innohatch (Next 16.2.4, Prisma 7.8.0). Prisma is pinned to ^7 on
// purpose: `npm install prisma` with no version now installs the 8 release candidate.
import * as fs from 'fs';
import * as path from 'path';

const file = path.resolve(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));

pkg.dependencies.next = '16.2.4';
pkg.dependencies.react = '19.2.3';
pkg.dependencies['react-dom'] = '19.2.3';
// The runtime client, its adapter and pg are needed at run time, not just at build.
pkg.dependencies['@prisma/client'] = '^7.8.0';
pkg.dependencies['@prisma/adapter-pg'] = '^7.8.0';
pkg.dependencies.pg = pkg.devDependencies.pg ?? '^8.16.0';
delete pkg.devDependencies['@prisma/client'];
delete pkg.devDependencies.pg;
pkg.devDependencies.prisma = '^7.8.0';
// `next lint` no longer exists in Next 16, and indies never had an ESLint config.
delete pkg.scripts.lint;

const sort = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
pkg.dependencies = sort(pkg.dependencies);
pkg.devDependencies = sort(pkg.devDependencies);
fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
console.log('package.json updated; now run: npm install');
