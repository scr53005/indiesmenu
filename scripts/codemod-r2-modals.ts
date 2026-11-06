// scripts/codemod-r2-modals.ts — R2, second half (2026-11-06). Replaces the inline modal JSX in
// app/menu/page.tsx with the components in components/menu/overlays/. Same safety rules as
// codemod-r2-banners.ts: each block runs from its start marker (included) to its end marker
// (excluded); a missing or non-unique marker aborts before anything is written. Idempotent.
//
// Run: npx tsx scripts/codemod-r2-modals.ts [--apply]
import * as fs from 'fs';
import * as path from 'path';

const FILE = path.resolve(__dirname, '../app/menu/page.tsx');

const BLOCKS: { start: string; end: string; replacement: string }[] = [
  {
    start: '{/* Duplicate Order Prevention Modal */}',
    end: '{/* External Wallet Warning Modal',
    replacement: `      {/* Duplicate Order Prevention Modal */}
      <DuplicateOrderModal
        open={showDuplicateModal}
        onOrderAnyway={() => {
          setShowDuplicateModal(false);
          setShowGuestWarningModal(false);
          setGuestCheckoutProcessing(false);
          skipDuplicateCheckRef.current = true;
          // Mixed posture: an account is sufficient — a missing local active key
          // is handled by the innopay-authority fallback inside handleOrder().
          const hasCredentials = !!getAccountName();
          if (hasCredentials) {
            handleOrder();
          } else {
            setShowWalletNotification(true);
          }
        }}
        onCancel={() => {
          setShowDuplicateModal(false);
          setShowGuestWarningModal(false);
          setGuestCheckoutProcessing(false);
        }}
      />

`,
  },
  {
    start: '{/* External Wallet Warning Modal',
    end: '{/* Import Account Modal */}',
    replacement: `      {/* External Wallet Warning Modal - FreeNow collision workaround */}
      <ExternalWalletModal
        open={showExternalWalletWarning}
        freeNowOpened={freeNowOpened}
        onProceed={proceedWithExternalWallet}
        onCopyLink={copyHiveUrlToClipboard}
        onClose={() => {
          setShowExternalWalletWarning(false);
          setPendingHiveUrl('');
          setFreeNowOpened(false);
        }}
        onCancel={() => {
          setShowExternalWalletWarning(false);
          setPendingHiveUrl('');
        }}
      />

`,
  },
  {
    start: '{/* Import Account Modal */}',
    end: '{/* Guest Checkout Warning Modal',
    replacement: `      {/* Import Account Modal */}
      <ImportAccountModal
        open={showImportModal}
        step={importStep}
        error={importError}
        loading={importLoading}
        email={importEmail}
        onEmailChange={setImportEmail}
        code={verificationCode}
        onCodeChange={setVerificationCode}
        attemptsLeft={importAttempts}
        accounts={multipleAccounts}
        onClose={() => setShowImportModal(false)}
        onRequestCode={handleRequestCode}
        onVerifyCode={handleVerifyCode}
        onBackToEmail={() => {
          setImportStep('email');
          setVerificationCode('');
          setImportError('');
        }}
        onSelectAccount={handleSelectAccount}
      />

`,
  },
  {
    start: '{/* Guest Checkout Warning Modal',
    end: '{/* Wallet Status Display',
    replacement: `      {/* Guest Checkout Warning Modal — adapts for waiter flow vs normal order */}
      <GuestCheckoutModal
        open={showGuestWarningModal}
        waiterFlow={isCallWaiterFlow}
        processing={guestCheckoutProcessing}
        seconds={guestCheckoutSeconds}
        guestTotal={(parseFloat(getTotalEurPriceNoDiscount()) * 1.05).toFixed(2)}
        discountLost={getDiscountAmount()}
        onProceed={() => proceedWithGuestCheckout()}
        onBack={() => setShowGuestWarningModal(false)}
      />

`,
  },
  {
    start: '{/* Wallet Status Display',
    end: '{/* Fixed Cart Section */}',
    replacement: `      {/* Wallet Status Display - Shows when credentials are loaded */}
      <WalletStatusBar
        username={walletCredentials?.username ?? null}
        onDisconnect={() => {
          clearCredentials(); // remove all key material, not just the display blob
          setWalletCredentials(null);
        }}
      />

`,
  },
  {
    start: '{/* Call Waiter Modal — two modes',
    end: '{/* Fixed Menu Selector (Dishes/Drinks)',
    replacement: `      {/* Call Waiter Modal — two modes: input (centered modal) and confirmed (top strip) */}
      <CallWaiterModal
        open={showWaiterModal && !waiterConfirmed}
        reason={waiterReason}
        onReasonChange={setWaiterReason}
        onCancel={() => setShowWaiterModal(false)}
        onConfirm={() => {
          // Check if user has an account — if yes, direct payment (a missing local
          // active key is handled by the innopay-authority fallback); if no, show strip + banner
          const accountName = getAccountName();

          if (accountName) {
            // Has credentials — direct payment flow
            setShowWaiterModal(false);
            handleCallWaiter(waiterReason);
          } else {
            // No credentials — transform to strip + show wallet banner
            setWaiterConfirmed(true);
            setIsCallWaiterFlow(true);
            setShowWalletNotification(true);
            setIsSafariBanner(false);
          }
        }}
      />

      {/* Call Waiter — confirmed strip (non-blocking, stays at top) */}
      <WaiterRequestedStrip
        show={showWaiterModal && waiterConfirmed}
        reason={waiterReason ?? ''}
        top={totalFixedHeaderHeight + 8}
        onCancel={() => {
          setShowWaiterModal(false);
          setWaiterConfirmed(false);
          setIsCallWaiterFlow(false);
          setShowWalletNotification(false);
        }}
      />

`,
  },
  {
    start: '{/* Cart Composition Modal */}',
    end: '{/* Bottom Contact/Legal Banner */}',
    replacement: `      {/* Cart Composition Modal */}
      <CartCompositionModal
        open={showCartComposition}
        cart={cart}
        total={getTotalEurPrice()}
        onClose={() => setShowCartComposition(false)}
      />

`,
  },
];

const IMPORTS = `import DuplicateOrderModal from '@/components/menu/overlays/DuplicateOrderModal';
import ExternalWalletModal from '@/components/menu/overlays/ExternalWalletModal';
import ImportAccountModal from '@/components/menu/overlays/ImportAccountModal';
import GuestCheckoutModal from '@/components/menu/overlays/GuestCheckoutModal';
import WalletStatusBar from '@/components/menu/overlays/WalletStatusBar';
import { CallWaiterModal, WaiterRequestedStrip } from '@/components/menu/overlays/CallWaiterOverlays';
import CartCompositionModal from '@/components/menu/overlays/CartCompositionModal';
`;
const IMPORT_ANCHOR = "import AccountCreatedBanner from '@/components/menu/overlays/AccountCreatedBanner';\n";

function lineStartOf(src: string, marker: string): number {
  const first = src.indexOf(marker);
  if (first === -1) throw new Error(`marker not found: ${marker}`);
  if (src.indexOf(marker, first + 1) !== -1) throw new Error(`marker not unique: ${marker}`);
  return src.lastIndexOf('\n', first) + 1;
}

const raw = fs.readFileSync(FILE, 'utf8');
const crlf = raw.includes('\r\n');
let src = raw.replace(/\r\n/g, '\n');

if (src.includes('<DuplicateOrderModal')) {
  console.log('already done');
  process.exit(0);
}

for (const { start, end, replacement } of BLOCKS) {
  const from = lineStartOf(src, start);
  const to = lineStartOf(src, end);
  if (to <= from) throw new Error(`end before start: ${start}`);
  console.log(`replacing ${src.slice(from, to).split('\n').length - 1} lines from "${start}"`);
  src = src.slice(0, from) + replacement + src.slice(to);
}

if (!src.includes(IMPORT_ANCHOR)) throw new Error('import anchor not found');
src = src.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + IMPORTS);

if (process.argv.includes('--apply')) {
  fs.writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src);
  console.log('written');
} else {
  console.log('dry run (use --apply)');
}
