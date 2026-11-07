'use client';

import React, { useEffect, useState } from 'react';
import Draggable from '@/components/ui/Draggable';

/** If the browser still hasn't left after this, give the button back (e.g. hub unreachable). */
const CREATE_PRESSED_MAX_MS = 15_000;

// "Créer un compte" is a raised key: light top, dark bottom edge. It sinks while pressed, and
// stays sunk (spinner, "Un instant…") from the tap until the browser leaves for the hub: loading
// the hub takes a few seconds on a phone, and a flat button that did not change looked like a
// missed tap, so customers tapped again.
const CREATE_BASE =
  'bg-gradient-to-b from-white to-blue-50 text-blue-700 px-4 py-3 rounded-xl font-bold text-base ' +
  'w-[180px] text-center flex items-center justify-center gap-2 border border-blue-100 select-none ' +
  'transition-[transform,box-shadow] duration-75 ease-out';
const CREATE_RAISED =
  'shadow-[0_4px_0_#1e3a8a,0_6px_12px_rgba(0,0,0,0.35)] hover:from-white hover:to-blue-100 ' +
  'active:translate-y-[3px] active:shadow-[0_1px_0_#1e3a8a,inset_0_2px_4px_rgba(30,58,138,0.25)]';
const CREATE_PRESSED =
  'translate-y-[3px] shadow-[0_1px_0_#1e3a8a,inset_0_2px_4px_rgba(30,58,138,0.25)] cursor-wait';

// The other three buttons get the same raised key, in their own colours. Tailwind only generates
// classes it finds written out in full, so each colour has its own literal strings.
const KEY_MOTION = 'transition-[transform,box-shadow] duration-75 ease-out select-none';
/** No 300 ms double-tap-zoom wait on iOS before the press shows; no grey tap flash. */
const KEY_TOUCH: React.CSSProperties = { touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' };

// "Importer un compte": opens a modal in the page, so the press only needs to show while held.
const IMPORT_RAISED =
  'bg-gradient-to-b from-sky-100 to-sky-200 text-gray-800 border border-sky-100 hover:to-sky-300 ' +
  'shadow-[0_3px_0_#0369a1,0_4px_8px_rgba(0,0,0,0.3)] ' +
  'active:translate-y-[2px] active:shadow-[0_1px_0_#0369a1,inset_0_2px_3px_rgba(3,105,161,0.3)]';

// "Portefeuille externe": black key, a thin light line on top for the relief.
const EXTERNAL_RAISED =
  'bg-gradient-to-b from-gray-800 to-black text-red-500 border border-gray-700 ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_0_#000,0_6px_12px_rgba(0,0,0,0.4)] ' +
  'active:translate-y-[3px] active:shadow-[0_1px_0_#000,inset_0_2px_4px_rgba(0,0,0,0.6)]';

// "Commandez sans compte": stays sunk once started (guestCheckoutStarted), like "Créer un compte".
const GUEST_RAISED =
  'bg-gradient-to-b from-gray-500/70 to-gray-600/70 text-gray-100 border border-gray-400/40 ' +
  'shadow-[0_3px_0_#374151,0_4px_8px_rgba(0,0,0,0.3)] ' +
  'active:translate-y-[2px] active:shadow-[0_1px_0_#374151,inset_0_2px_3px_rgba(0,0,0,0.35)]';
const GUEST_PRESSED =
  'bg-gradient-to-b from-gray-600/70 to-gray-600/70 text-gray-400 italic border border-gray-400/40 ' +
  'translate-y-[2px] shadow-[0_1px_0_#374151,inset_0_2px_3px_rgba(0,0,0,0.35)] cursor-wait';

interface WalletNotificationBannerProps {
  topOffset: string;
  isSafariBanner: boolean;
  cartEmpty: boolean;
  isCallWaiterFlow: boolean;
  importDisabled: boolean;
  guestCheckoutStarted: boolean;
  table: string;
  recipient: string;
  onImportAccount: () => void;
  /** Returns false when it did not leave the page (e.g. the duplicate-order modal opened). */
  onCreateAccount: () => boolean | void;
  onExternalWallet: () => void;
  onGuestCheckout: () => void;
  onDismiss: () => void;
}

const WalletNotificationBanner: React.FC<WalletNotificationBannerProps> = React.memo(({
  topOffset,
  isSafariBanner,
  cartEmpty,
  isCallWaiterFlow,
  importDisabled,
  guestCheckoutStarted,
  table,
  recipient,
  onImportAccount,
  onCreateAccount,
  onExternalWallet,
  onGuestCheckout,
  onDismiss,
}) => {
  // Waiter flow: different text and button labels
  const bannerText = isCallWaiterFlow
    ? "🔔 Pour appeler un serveur, créez votre portefeuille Innopay"
    : isSafariBanner && cartEmpty
      ? "💳 Si vous n'avez pas de portefeuille compatible Innopay, nous conseillons de créer un compte avant de commander!"
      : "💳 Pour commander, créez votre portefeuille Innopay";

  const subtitleText = isCallWaiterFlow
    ? "Gratuit et instantané - Service: seulement 0.02€"
    : "Gratuit et instantané - Pas besoin d\u0027installer d\u0027application";

  const showSubtitle = isCallWaiterFlow || (!isSafariBanner || !cartEmpty);

  const guestButtonLabel = isCallWaiterFlow
    ? "Appeler sans compte (1€)"
    : "Commandez sans compte";

  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (!creating) return;
    // Back button from the hub: the page comes back from memory (bfcache) with the button sunk.
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) setCreating(false); };
    window.addEventListener('pageshow', onPageShow);
    const timer = window.setTimeout(() => setCreating(false), CREATE_PRESSED_MAX_MS);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.clearTimeout(timer);
    };
  }, [creating]);

  const handleCreateClick = () => {
    if (creating) return; // second tap while the hub loads
    setCreating(true);
    if (onCreateAccount() === false) setCreating(false);
  };

  return (
    <Draggable
      className="z-[8990] bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 shadow-lg rounded-lg"
      style={{
        top: topOffset,
        width: '100%',
        maxWidth: '896px',
      }}
      initialPosition={{ x: 0, y: 0 }}
    >
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        {/* Drag handle indicator */}
        <div className="text-white opacity-50 text-xs flex-shrink-0">
          ⋮⋮
        </div>

        {/* Left zone: Text */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm md:text-base">
            {bannerText}
          </p>
          {showSubtitle && (
            <p className="text-xs md:text-sm opacity-90 mt-1">
              {subtitleText}
            </p>
          )}
        </div>

        {/* Center zone: Buttons stacked */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          {/* Import Account Button */}
          <button
            onClick={onImportAccount}
            disabled={importDisabled}
            className={`px-3 py-1.5 rounded-lg font-normal text-xs w-[120px] text-center ${KEY_MOTION} ${
              importDisabled
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed' // flat: nothing to press
                : IMPORT_RAISED
            }`}
            style={{ whiteSpace: 'normal', lineHeight: '1.3', ...KEY_TOUCH }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            Importer un compte
          </button>

          <button
            onClick={handleCreateClick}
            aria-busy={creating}
            className={`${CREATE_BASE} ${creating ? CREATE_PRESSED : CREATE_RAISED}`}
            style={KEY_TOUCH}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <span>{creating ? 'Un instant…' : 'Créer un compte'}</span>
            {creating ? (
              <span className="w-10 h-10 flex items-center justify-center" aria-hidden="true">
                <span className="w-6 h-6 rounded-full border-2 border-blue-200 border-t-blue-700 animate-spin" />
              </span>
            ) : (
              <img src="/images/favicon-48x48.png" alt="innopay" className="w-10 h-10" />
            )}
          </button>

          {/* External Wallet Button */}
          {(!isSafariBanner || !cartEmpty || isCallWaiterFlow) && (
            <button
              onClick={onExternalWallet}
              className={`px-4 py-3 rounded-xl font-semibold text-sm w-[180px] text-center ${KEY_MOTION} ${EXTERNAL_RAISED}`}
              style={KEY_TOUCH}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              title="Use external wallet app like Hive Keychain or Ecency / Utiliser une app portefeuille externe comme Hive Keychain ou Ecency"
            >
              Portefeuille externe
            </button>
          )}

          <button
            onClick={onGuestCheckout}
            className={`px-3 py-1.5 rounded-lg font-normal text-xs w-[120px] text-center ${KEY_MOTION} ${
              guestCheckoutStarted ? GUEST_PRESSED : GUEST_RAISED
            }`}
            style={{ whiteSpace: 'normal', lineHeight: '1.3', ...KEY_TOUCH }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {guestButtonLabel}
          </button>
        </div>

        {/* Right zone: Close button */}
        <div className="flex-shrink-0 w-2">
          <button
            onClick={onDismiss}
            className="text-white hover:text-blue-200 transition-colors p-1"
            aria-label="Fermer"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            ✕
          </button>
        </div>
      </div>
    </Draggable>
  );
});

WalletNotificationBanner.displayName = 'WalletNotificationBanner';

export default WalletNotificationBanner;
