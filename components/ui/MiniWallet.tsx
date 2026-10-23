'use client';

import React, { useRef, useCallback } from 'react';
import Draggable from './Draggable';
import WalletActions from './WalletActions';
import { forgetLocalWallet } from '@/lib/innopay/forget-wallet';

import { getInnopayUrl } from '@/lib/utils';

export type PulseState = 'none' | 'blue' | 'green' | 'green-slow' | 'green-solid' | 'red';

export interface WalletBalance {
  accountName: string;
  euroBalance: number;
}

interface MiniWalletProps {
  balance: WalletBalance;
  onClose: () => void;
  visible: boolean;
  language?: string;
  title?: string;
  initialPosition?: { x: number; y: number };
  balanceSource?: string; // 'localStorage-cache' or 'hive-engine'
  pulseState?: PulseState;
  onPulseReset?: () => void;
}

// Gradient classes per state
const pulseGradients: Record<PulseState, string> = {
  none: 'from-blue-600 to-blue-700',
  blue: 'from-blue-600 to-blue-700',
  green: 'from-green-600 to-green-700',
  'green-slow': 'from-green-600 to-green-700',
  'green-solid': 'from-green-600 to-green-700',
  red: 'from-red-900 to-red-800',
};

export default function MiniWallet({
  balance,
  onClose,
  visible,
  title = 'Votre portefeuille Innopay',
  language = 'fr',
  initialPosition,
  balanceSource,
  pulseState = 'none',
  onPulseReset,
}: MiniWalletProps) {

  // Double-tap detection (two taps within 400ms)
  const lastTapRef = useRef(0);
  // Long-press detection (1 second hold)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCloseClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (pulseState !== 'none') onPulseReset?.();
    onClose();
  };

  const handleDoubleTap = useCallback(() => {
    if (pulseState === 'none') return;
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      onPulseReset?.();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [pulseState, onPulseReset]);

  const handleLongPressStart = useCallback(() => {
    if (pulseState === 'none') return;
    longPressTimerRef.current = setTimeout(() => {
      onPulseReset?.();
    }, 1000);
  }, [pulseState, onPulseReset]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  if (!visible) return null;

  const isCached = balanceSource === 'localStorage-cache';
  const balanceClassName = isCached
    ? 'font-bold text-lg italic text-blue-200'
    : 'font-bold text-lg text-white';

  const defaultPosition = {
    x: typeof window !== 'undefined' ? window.innerWidth - 316 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight - 170 : 0,
  };

  const isPulsing = pulseState !== 'none' && pulseState !== 'green-solid';
  const gradientClass = pulseGradients[pulseState];

  // Animation speed: normal 2s, slow 4s, solid/none = no animation
  const pulseAnimation = isPulsing
    ? { animation: `walletPulse ${pulseState === 'green-slow' ? '4s' : '2s'} ease-in-out infinite` }
    : {};

  return (
    <>
      {/* Keyframes injected once */}
      {isPulsing && (
        <style>{`
          @keyframes walletPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.02); opacity: 0.88; }
          }
        `}</style>
      )}
      <Draggable keepInViewport bottomInset={40}
        className={`z-[9998] innopay-miniwallet bg-gradient-to-r ${gradientClass} text-white  transition-colors duration-700`}
        initialPosition={initialPosition || defaultPosition}
        style={{
          minWidth: '220px',
          maxWidth: '280px',
          ...pulseAnimation,
        }}
      >
        <div
          className="mw-header"
          onClick={handleDoubleTap}
          onTouchStart={handleLongPressStart}
          onTouchEnd={handleLongPressEnd}
          onTouchCancel={handleLongPressEnd}
          onMouseDown={handleLongPressStart}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
        >
          {/* Drag handle indicator */}
          <svg className="mw-grip" aria-hidden="true" width="7" height="16" viewBox="0 0 7 16" fill="currentColor">
            <circle cx="1" cy="4" r="1" /><circle cx="6" cy="4" r="1" />
            <circle cx="1" cy="8" r="1" /><circle cx="6" cy="8" r="1" />
            <circle cx="1" cy="12" r="1" /><circle cx="6" cy="12" r="1" />
          </svg>

          {/* Wallet content */}
          <div className="mw-info">
            <p className="mw-title">{title}</p>
            <div className="mw-balance-row">
              <svg className="mw-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 8V6a2 2 0 0 0-2-2H6a3 3 0 0 0 0 6h14v10H6a3 3 0 0 1-3-3V7m17 7h-4v3h4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <p className={`mw-amount ${balanceClassName}`}>{balance.euroBalance.toFixed(2)} €</p>
                <a
                  href={`${getInnopayUrl()}/user`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mw-account font-mono hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >{balance.accountName}</a>
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleCloseClick}
            onMouseDown={(e) => { e.stopPropagation(); handleCloseClick(e); }}
            onTouchStart={(e) => { e.stopPropagation(); handleCloseClick(e); }}
            className="mw-close"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <WalletActions key={balance.accountName} accountName={balance.accountName} language={language} onForget={() => forgetLocalWallet()} />
      </Draggable>
    </>
  );
}

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
