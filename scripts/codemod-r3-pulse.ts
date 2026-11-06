// scripts/codemod-r3-pulse.ts — R3 (2026-11-06). Replaces the inline MiniWallet pulse state
// machine in app/menu/page.tsx with hooks/useWalletPulse.ts. Marker-based like the R2 scripts:
// aborts if a marker is missing or not unique. Idempotent.
// Run: npx tsx scripts/codemod-r3-pulse.ts [--apply]
import * as fs from 'fs';
import * as path from 'path';

const FILE = path.resolve(__dirname, '../app/menu/page.tsx');
const raw = fs.readFileSync(FILE, 'utf8');
const crlf = raw.includes('\r\n');
let src = raw.replace(/\r\n/g, '\n');

if (src.includes('useWalletPulse({')) { console.log('already done'); process.exit(0); }

function replaceOnce(from: string, to: string) {
  const i = src.indexOf(from);
  if (i === -1) throw new Error(`not found: ${from.slice(0, 80)}`);
  if (src.indexOf(from, i + 1) !== -1) throw new Error(`not unique: ${from.slice(0, 80)}`);
  src = src.slice(0, i) + to + src.slice(i + from.length);
}
function cutBetween(start: string, end: string, replacement: string) {
  const a = src.indexOf(start), b = src.indexOf(end);
  if (a === -1 || b === -1 || b <= a) throw new Error(`bad markers: ${start.slice(0, 60)}`);
  if (src.indexOf(start, a + 1) !== -1 || src.indexOf(end, b + 1) !== -1) throw new Error('markers not unique');
  const from = src.lastIndexOf('\n', a) + 1, to = src.lastIndexOf('\n', b) + 1;
  console.log(`replacing ${src.slice(from, to).split('\n').length - 1} lines`);
  src = src.slice(0, from) + replacement + src.slice(to);
}

// 1. State + refs → the hook.
replaceOnce(
  `  const [walletPulseState, setWalletPulseState] = useState<'none' | 'blue' | 'green' | 'green-slow' | 'green-solid' | 'red'>('none');
  const pulseIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pulseStartTimeoutRef = useRef<NodeJS.Timeout | null>(null); // tracks the 9s startup delay
`,
  `  // (hooks/useWalletPulse.ts; the rules are in lib/innopay/pulse.ts). The cart is cleared
  // when the order's transfer first shows up in the spoke DB.
  const {
    pulseState: walletPulseState, startOrderPulsing, resetPulse, hidePulse,
  } = useWalletPulse({ onOrderConfirmed: clearCart });
`,
);

// 2. Unmount cleanup no longer owns the pulse timers.
replaceOnce(
  `      if (pulseIntervalRef.current) {
        clearTimeout(pulseIntervalRef.current);
      }
      if (pulseStartTimeoutRef.current) {
        clearTimeout(pulseStartTimeoutRef.current);
      }
`,
  '',
);

// 3. The state machine itself.
cutBetween('// Persistent pulsing state machine', '// Check for payment success on mount', '');

// 4. MiniWallet props.
replaceOnce(
  `            if (walletPulseState !== 'none') setWalletPulseState('none');`,
  `            if (walletPulseState !== 'none') hidePulse();`,
);
replaceOnce(
  `          onPulseReset={() => {
            setWalletPulseState('none');
            localStorage.removeItem('innopay_latestMemoContent');
            localStorage.removeItem('innopay_latestMemoDateTime');
            localStorage.removeItem('innopay_fulfilledDetectedAt');
            if (pulseIntervalRef.current) { clearTimeout(pulseIntervalRef.current); pulseIntervalRef.current = null; }
            if (pulseStartTimeoutRef.current) { clearTimeout(pulseStartTimeoutRef.current); pulseStartTimeoutRef.current = null; }
          }}`,
  `          onPulseReset={resetPulse}`,
);

// 5. Import.
replaceOnce(
  "import { useI18n } from '@/lib/i18n';\n",
  "import { useI18n } from '@/lib/i18n';\nimport { useWalletPulse } from '@/hooks/useWalletPulse';\n",
);

const leftovers = ['pulseIntervalRef', 'pulseStartTimeoutRef', 'setWalletPulseState', 'pulseCheckRef', 'schedulePulse']
  .filter(name => src.includes(name));
if (leftovers.length) throw new Error(`still referenced: ${leftovers.join(', ')}`);

if (process.argv.includes('--apply')) {
  fs.writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src);
  console.log('written');
} else console.log('dry run (use --apply)');
