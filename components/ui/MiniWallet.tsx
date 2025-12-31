'use client';

import React from 'react';
import Draggable from './Draggable';

export interface WalletBalance {
  accountName: string;
  euroBalance: number;
}

interface MiniWalletProps {
  balance: WalletBalance;
  onClose: () => void;
  visible: boolean;
  title?: string; // Optional custom title
  initialPosition?: { x: number; y: number }; // Optional custom position
  balanceSource?: string; // 'localStorage-cache' or 'hive-engine'
}

/**
 * MiniWallet Component
 *
 * A draggable wallet indicator that displays the user's Innopay account balance.
 * Wraps the Draggable component with wallet-specific styling and functionality.
 *
 * Features:
 * - Draggable positioning with constraints
 * - Shows account name and EURO balance
 * - Collapsible with close button
 * - Persistent position across renders
 *
 * @param balance - The wallet balance object containing accountName and euroBalance
 * @param onClose - Callback function when the close button is clicked
 * @param visible - Controls visibility of the wallet
 * @param title - Optional custom title (defaults to French "Votre portefeuille Innopay")
 * @param initialPosition - Optional custom initial position
 */
export default function MiniWallet({
  balance,
  onClose,
  visible,
  title = 'Votre portefeuille Innopay',
  initialPosition,
  balanceSource
}: MiniWalletProps) {
  if (!visible) return null;

  const handleCloseClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // Prevent drag from triggering
    onClose();
  };

  // Determine if balance is from cache (stale) or fresh from blockchain
  const isCached = balanceSource === 'localStorage-cache';
  const balanceClassName = isCached
    ? 'font-bold text-lg italic text-blue-200' // Cached: italic + light blue
    : 'font-bold text-lg text-white'; // Fresh: normal + white

  // Default position: bottom-right
  const defaultPosition = {
    x: typeof window !== 'undefined' ? window.innerWidth - 316 : 0, // 300px max-width + 16px margin
    y: typeof window !== 'undefined' ? window.innerHeight - 170 : 0  // Approximate height + 30px lift
  };

  return (
    <Draggable
      className="z-[9998] bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-lg shadow-lg"
      initialPosition={initialPosition || defaultPosition}
      style={{
        minWidth: '200px',
        maxWidth: '300px',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Drag handle indicator */}
        <div className="text-white opacity-50 text-xs flex-shrink-0">
          ⋮⋮
        </div>

        {/* Wallet content */}
        <div className="flex-1">
          <p className="text-xs opacity-75 mb-1">{title}</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <div>
              <p className={balanceClassName}>{balance.euroBalance.toFixed(2)} €</p>
              <p className="text-xs opacity-75 font-mono">{balance.accountName}</p>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleCloseClick}
          onMouseDown={handleCloseClick}
          onTouchStart={handleCloseClick}
          className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors flex-shrink-0"
          aria-label="Fermer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Draggable>
  );
}

/**
 * ReopenButton Component
 *
 * A fixed button that appears when the wallet is closed, allowing users to reopen it.
 *
 * @param onClick - Callback function when the button is clicked
 * @param visible - Controls visibility of the button (only shown when wallet is closed)
 */
export function WalletReopenButton({ onClick, visible }: { onClick: () => void; visible: boolean }) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-[9998] bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
      aria-label="Voir portefeuille"
    >
      <span className="text-2xl">💰</span>
    </button>
  );
}
