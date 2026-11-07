// R4b codemod (INDIESMENU-REFACTOR-PLAN.md §5b): removes the old return effects and the
// postMessage listener from app/menu/page.tsx; hooks/usePaymentReturn.ts replaces them.
// Each block is cut from a unique start anchor to the end of a unique end anchor line.
// Idempotent: a block whose start anchor is gone is reported and skipped.
// Run: npx tsx scripts/codemod-r4b-returns.ts
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', 'app', 'menu', 'page.tsx');

const BLOCKS: { name: string; start: string; end: string }[] = [
  {
    name: 'return effects (payment=success, credentials, debug log, topup, guest poll)',
    start: '  // Check for payment success on mount\n',
    end: '  }, [showPaymentSuccess, currentSessionId, blockchainComplete, handleFlow6Success]);\n',
  },
  {
    name: 'postMessage listener',
    start: '  // Drag handlers for wallet banner\n',
    end: "    console.log('postMessage listener registered');\n    return () => window.removeEventListener('message', handleMessage);\n  }, []);\n",
  },
];

function once(text: string, needle: string, from = 0): number {
  const i = text.indexOf(needle, from);
  if (i >= 0 && text.indexOf(needle, i + 1) >= 0) throw new Error(`anchor not unique: ${JSON.stringify(needle.slice(0, 60))}`);
  return i;
}

let page = readFileSync(PAGE, 'utf8').replace(/\r\n/g, '\n');
const crlf = readFileSync(PAGE, 'utf8').includes('\r\n');

for (const block of BLOCKS) {
  const start = once(page, block.start);
  if (start < 0) { console.log(`skip (already removed): ${block.name}`); continue; }
  const endAt = once(page, block.end, start);
  if (endAt < 0) throw new Error(`end anchor not found for: ${block.name}`);
  const end = endAt + block.end.length;
  const removed = page.slice(start, end).split('\n').length - 1;
  page = page.slice(0, start) + page.slice(end);
  console.log(`removed ${removed} lines: ${block.name}`);
}

writeFileSync(PAGE, crlf ? page.replace(/\n/g, '\r\n') : page);
