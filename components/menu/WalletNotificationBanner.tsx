'use client';

import React from 'react';
import Draggable from '@/components/ui/Draggable';

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
  onCreateAccount: () => void;
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
            className={`px-3 py-1.5 rounded-lg font-normal text-xs transition-colors w-[120px] text-center ${
              importDisabled
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-sky-200 text-gray-800 hover:bg-sky-300'
            }`}
            style={{ whiteSpace: 'normal', lineHeight: '1.3' }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            Importer un compte
          </button>

          <button
            onClick={onCreateAccount}
            className="bg-white text-blue-600 px-4 py-3 rounded-lg font-bold text-base hover:bg-blue-50 transition-colors w-[180px] text-center flex items-center justify-center gap-2"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <span>Créer un compte</span>
            <img src="/images/favicon-48x48.png" alt="innopay" className="w-10 h-10" />
          </button>

          {/* External Wallet Button */}
          {(!isSafariBanner || !cartEmpty || isCallWaiterFlow) && (
            <button
              onClick={onExternalWallet}
              className="bg-black text-red-500 px-4 py-3 rounded-lg font-semibold text-sm hover:bg-gray-900 transition-colors w-[180px] text-center"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              title="Use external wallet app like Hive Keychain or Ecency / Utiliser une app portefeuille externe comme Hive Keychain ou Ecency"
            >
              Portefeuille externe
            </button>
          )}

          <button
            onClick={onGuestCheckout}
            className={`bg-gray-600 bg-opacity-60 px-3 py-1.5 rounded-lg font-normal text-xs hover:bg-opacity-70 transition-all w-[120px] text-center ${
              guestCheckoutStarted ? 'italic text-gray-400' : 'text-gray-100'
            }`}
            style={{ whiteSpace: 'normal', lineHeight: '1.3' }}
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
