// scripts/codemod-r2-banners.ts — R2 (2026-11-05). Replaces the inline banner JSX in
// app/menu/page.tsx with the components in components/menu/overlays/. Each block is found by
// its start marker (included) and end marker (excluded); the script refuses to run if a marker
// is missing or not unique, so it can't cut the wrong lines. Idempotent: once replaced, the
// start markers are gone and it reports "already done".
//
// Run: npx tsx scripts/codemod-r2-banners.ts [--apply]
import * as fs from 'fs';
import * as path from 'path';

const FILE = path.resolve(__dirname, '../app/menu/page.tsx');

const BLOCKS: { start: string; end: string; replacement: string }[] = [
  {
    start: '{/* Payment Success Banner - Two States */}',
    end: '{/* Restaurant Closed Popup',
    replacement: `      {/* Payment progress / transmission error / account-created processing (yellow, grey) */}
      <PaymentProgressBanners
        showPaymentSuccess={showPaymentSuccess}
        blockchainComplete={blockchainComplete}
        transmissionError={transmissionError}
        showAccountCreated={showAccountCreated}
        accountCreationComplete={accountCreationComplete}
        onShowOrder={() => setShowCartComposition(true)}
        onClearOrder={() => {
          clearCart();
          setShowPaymentSuccess(false);
          setTransmissionError(false);
        }}
      />

      {/* UNIFIED Success Banner - Flow 4 (wallet ready) / Flows 5, 6, 7 (order sent) */}
      <FlowSuccessBanner
        kind={flow4Success ? 'walletReady' : (flow5Success || flow6Success || flow7Success) ? 'orderSent' : null}
        onDismiss={() => {
          // Clear all flow success states
          setFlow4Success(false);
          setFlow5Success(false);
          setFlow6Success(false);
          setFlow7Success(false);
          // Also clear the yellow "processing" banner for Flow 3 (guest checkout)
          setShowPaymentSuccess(false);
          setBlockchainComplete(true);
        }}
      />

      <WaiterCalledBanner show={waiterCalledSuccess} onDismiss={() => setWaiterCalledSuccess(false)} />

`,
  },
  {
    start: '{/* Restaurant Closed Popup',
    end: '{/* DEV ONLY: Clear localStorage button */}',
    replacement: `      {/* Restaurant Closed Popup — shown when trying to order drinks outside opening hours */}
      {showClosedPopup && <RestaurantClosedPopup info={nextOpenInfo} onClose={() => setShowClosedPopup(false)} />}

      {/* Kitchen Closed Banner — dine-in customers after hours */}
      {isKitchenClosed && table && (
        <KitchenClosedBanner
          closeTime={kitchenCloseTime}
          minimized={kitchenClosedBannerMinimized}
          onMinimizedChange={setKitchenClosedBannerMinimized}
        />
      )}

`,
  },
  {
    start: '{/* Topup Success Banner */}',
    end: '{/* Guest RUBIS teaser',
    replacement: `      <TopupSuccessBanner
        show={showTopupSuccess}
        onDismiss={() => {
          setShowTopupSuccess(false);
          setFlow5Success(true);
          console.log('[TOPUP BANNER] Dismissed manually, showing unified success banner');
        }}
      />

      {/* Account Creation Success - Blue Banner (Account Credentials) */}
      <AccountCreatedBanner
        credentials={showAccountCreated && accountCreationComplete ? newAccountCredentials : null}
        onDismiss={() => {
          setShowAccountCreated(false);
          setNewAccountCredentials(null);
        }}
      />

`,
  },
];

const IMPORTS = `import PaymentProgressBanners from '@/components/menu/overlays/PaymentProgressBanners';
import { FlowSuccessBanner, TopupSuccessBanner, WaiterCalledBanner } from '@/components/menu/overlays/SuccessBanners';
import { KitchenClosedBanner, RestaurantClosedPopup } from '@/components/menu/overlays/ClosedNotices';
import AccountCreatedBanner from '@/components/menu/overlays/AccountCreatedBanner';
`;
const IMPORT_ANCHOR = "import Draggable from '@/components/ui/Draggable';\n";

function lineStartOf(src: string, marker: string): number {
  const first = src.indexOf(marker);
  if (first === -1) throw new Error(`marker not found: ${marker}`);
  if (src.indexOf(marker, first + 1) !== -1) throw new Error(`marker not unique: ${marker}`);
  return src.lastIndexOf('\n', first) + 1; // cut whole lines, indentation included
}

const raw = fs.readFileSync(FILE, 'utf8');
const crlf = raw.includes('\r\n');
let src = raw.replace(/\r\n/g, '\n');

if (!src.includes(BLOCKS[0].start)) {
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
