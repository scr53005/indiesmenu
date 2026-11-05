// scripts/codemod-shared-prisma.ts — R1 (Prisma 7), 2026-11-05. Idempotent.
//
// Prisma 7 needs a driver adapter on every client, so all server code must share the one client
// built in lib/prisma.ts instead of each file doing `new PrismaClient()`. With one shared client,
// a per-request `await prisma.$disconnect()` would close the pool under every other request in
// flight, so those `finally` blocks are removed too (scripts keep theirs: they own their client).
// CAUTION: a `try` that had only that `finally` (no `catch`) is left bare and must be unwrapped
// by hand (lib/data/menu.ts getMenuData was; tsc reports TS1472 there).
//
// Run: npx tsx scripts/codemod-shared-prisma.ts          (dry run: lists what would change)
//      npx tsx scripts/codemod-shared-prisma.ts --apply
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const FILES = [
  'app/api/admin/alergenes/route.ts',
  'app/api/admin/ingredients/route.ts',
  'app/api/admin/match-images/route.ts',
  'app/api/baseline-euro/route.ts',
  'app/api/daily-specials/route.ts',
  'app/api/dishes/route.ts',
  'app/api/fulfill/route.ts',
  'app/api/orders/history/route.ts',
  'app/api/poll-euro/route.ts',
  'app/api/poll-hbd/route.ts',
  'app/api/transfers/check/route.ts',
  'app/api/transfers/check-mine/route.ts',
  'app/api/transfers/sync-from-merchant-hub/route.ts',
  'app/api/transfers/unfulfilled/route.ts',
  'lib/data/menu.ts',
];

function transform(file: string, src: string): string {
  // lib files use a relative import (Vitest/tsx don't resolve "@/").
  const importLine = file.startsWith('lib/')
    ? "import prisma from '../prisma'; // relative: lib file (CLAUDE.md alias gotcha)"
    : "import prisma from '@/lib/prisma';";
  return src
    .replace(/^import \{ PrismaClient \} from '@prisma\/client';.*$/m, importLine)
    .replace(/^import \{ PrismaClient, (\w+) \} from '@prisma\/client';$/m,
      `${importLine}\nimport type { $1 } from '@prisma/client';`)
    .replace(/^const prisma = new PrismaClient\(\);\n\n?/m, '')
    .replace(/\n  \} finally \{\n(?:    \/\/[^\n]*\n)?    await prisma\.\$disconnect\(\);\n  \}/g, '\n  }');
}

const apply = process.argv.includes('--apply');
for (const file of FILES) {
  const full = path.join(ROOT, file);
  const before = fs.readFileSync(full, 'utf8');
  // Most files here are CRLF: transform on LF, then restore the file's own line endings.
  const crlf = before.includes('\r\n');
  const lf = transform(file, before.replace(/\r\n/g, '\n'));
  const after = crlf ? lf.replace(/\n/g, '\r\n') : lf;
  if (after === before) { console.log(`unchanged  ${file}`); continue; }
  if (/new PrismaClient|\$disconnect/.test(after)) console.warn(`CHECK BY HAND  ${file}`);
  if (apply) fs.writeFileSync(full, after);
  console.log(`${apply ? 'updated   ' : 'would edit'} ${file}`);
}
