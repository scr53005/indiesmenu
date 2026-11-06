// scripts/codemod-r3-import.ts — R3 (2026-11-06). Replaces the inline account-import state and
// handlers in app/menu/page.tsx with hooks/useImportAccount.ts. Marker-based like the other
// R2/R3 scripts: aborts if a marker is missing or not unique. Idempotent.
// Run: npx tsx scripts/codemod-r3-import.ts [--apply]
import * as fs from 'fs';
import * as path from 'path';

const FILE = path.resolve(__dirname, '../app/menu/page.tsx');
const raw = fs.readFileSync(FILE, 'utf8');
const crlf = raw.includes('\r\n');
let src = raw.replace(/\r\n/g, '\n');

if (src.includes('useImportAccount()')) { console.log('already done'); process.exit(0); }

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
  console.log(`replacing ${src.slice(from, to).split('\n').length - 1} lines from "${start.slice(0, 50)}"`);
  src = src.slice(0, from) + replacement + src.slice(to);
}

// 1. State.
replaceOnce(
  `  // State for import account modal (email verification system)
  const [showImportModal, setShowImportModal] = useState(false);
`,
  `  // Import an existing account by email + code (hooks/useImportAccount.ts)
  const { importDisabled, openImport: handleImportAccount, modalProps: importModalProps } = useImportAccount();
`,
);
replaceOnce(
  `  const [importEmail, setImportEmail] = useState('');
  const [importError, setImportError] = useState('');
  const [importAttempts, setImportAttempts] = useState(5);
  const [importDisabled, setImportDisabled] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importStep, setImportStep] = useState<'email' | 'code' | 'select'>('email');
  const [verificationCode, setVerificationCode] = useState('');
  const [multipleAccounts, setMultipleAccounts] = useState<Array<{
    accountName: string;
    creationDate: string;
    euroBalance: number;
  }>>([]);
`,
  '',
);

// 2. Attempts effect.
replaceOnce(
  `  // Load import attempts counter from localStorage
  useEffect(() => {
    const storedAttempts = localStorage.getItem('innopay_import_attempts');
    if (storedAttempts) {
      const attempts = parseInt(storedAttempts, 10);
      setImportAttempts(attempts);
      if (attempts <= 0) {
        setImportDisabled(true);
      }
    }
  }, []);
`,
  '',
);

// 3. handleImportAccount.
cutBetween('  // Handle import account button click', '  // Handle "Créer un compte" button in wallet notification banner', '');

// 4. The three request handlers.
cutBetween('  // Handle email submission (request verification code)', '  const proceedWithGuestCheckout = useCallback(', '');

// 5. Modal props.
cutBetween('      <ImportAccountModal\n', '      {/* Guest Checkout Warning Modal', `      <ImportAccountModal {...importModalProps} />

`);

// 6. Import.
replaceOnce(
  "import { useMenu } from '@/hooks/useMenu';\n",
  "import { useMenu } from '@/hooks/useMenu';\nimport { useImportAccount } from '@/hooks/useImportAccount';\n",
);

const leftovers = ['setShowImportModal', 'setImportError', 'setImportStep', 'setVerificationCode', 'setMultipleAccounts',
  'setImportLoading', 'setImportAttempts', 'setImportDisabled', 'setImportEmail', 'handleRequestCode', 'handleVerifyCode',
  'handleSelectAccount'].filter(name => src.includes(name));
if (leftovers.length) throw new Error(`still referenced: ${leftovers.join(', ')}`);

if (process.argv.includes('--apply')) {
  fs.writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src);
  console.log('written');
} else console.log('dry run (use --apply)');
