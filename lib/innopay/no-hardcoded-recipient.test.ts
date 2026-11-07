// @vitest-environment node
// Regression guard (2026-11-07): Flow 3 sent `recipient: 'indies.cafe'` hard-coded, so a dev
// guest payment paid the PROD account. Every payment must use NEXT_PUBLIC_HIVE_ACCOUNT
// (indies-test on dev). A `|| 'indies.cafe'` fallback after the env var is fine; a literal
// account given directly as the recipient is not.
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const DIRS = ['app', 'components', 'hooks', 'lib'];
const HARDCODED = /recipient\s*[:=]\s*['"`]indies\.cafe/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

it('no payment sends a hard-coded indies.cafe recipient', () => {
  const offenders = DIRS.flatMap((d) => sourceFiles(join(ROOT, d)))
    .flatMap((file) => readFileSync(file, 'utf8').split('\n')
      .map((line, i) => (HARDCODED.test(line) ? `${relative(ROOT, file)}:${i + 1}` : null))
      .filter((x): x is string => x !== null));
  expect(offenders).toEqual([]);
});
