'use client';

import React, { useRef, useCallback } from 'react';
import Draggable from './Draggable';
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
  initialPosition,
  balanceSource,
  pulseState = 'none',
  onPulseReset,
}: MiniWalletProps) {
  if (!visible) return null;

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
      <Draggable
        className={`z-[9998] bg-gradient-to-r ${gradientClass} text-white px-4 py-3 rounded-lg shadow-lg transition-colors duration-700`}
        initialPosition={initialPosition || defaultPosition}
        style={{
          minWidth: '200px',
          maxWidth: '300px',
          ...pulseAnimation,
        }}
      >
        <div
          className="flex items-center justify-between gap-3"
          onClick={handleDoubleTap}
          onTouchStart={handleLongPressStart}
          onTouchEnd={handleLongPressEnd}
          onTouchCancel={handleLongPressEnd}
          onMouseDown={handleLongPressStart}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
        >
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
                <a
                  href={`${getInnopayUrl()}/user`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs opacity-75 font-mono underline hover:opacity-100 transition-opacity"
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
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
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
