'use client';

// Restaurant-closed popup and kitchen-closed banner (extracted from app/menu/page.tsx in R2;
// markup unchanged).
import { useEffect } from 'react';
import Draggable from '@/components/ui/Draggable';
import { Interpolate, useI18n } from '@/lib/i18n';

export interface NextOpenInfo { fr: string; en: string; openTime: string }

export function RestaurantClosedPopup({ info, onClose }: { info: NextOpenInfo | null; onClose: () => void }) {
  const { t } = useI18n();
  if (!info) return null;
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998 }}
      />
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          width: 300,
          borderRadius: 18,
          overflow: 'hidden',
          background: 'rgba(255, 252, 248, 0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          border: '1px solid rgba(180, 160, 130, 0.25)',
          padding: '24px 20px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚪</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#3a2e1e', marginBottom: 8 }}>
          {t('closed.title')}
        </div>
        <div style={{ fontSize: 13, color: '#5a4a3a', lineHeight: 1.5, marginBottom: 6 }}>
          <Interpolate text={t('closed.body')} values={{ day: <strong>{info.fr}</strong>, time: <strong>{info.openTime}</strong> }} />
        </div>
        <div style={{ fontSize: 12, color: '#8b7a6a', lineHeight: 1.5, fontStyle: 'italic', marginBottom: 16 }}>
          <Interpolate text={t('closed.bodyEn')} values={{ day: <strong>{info.en}</strong>, time: <strong>{info.openTime}</strong> }} />
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '10px 28px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #8b6e4e 0%, #a0845c 100%)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(139, 110, 78, 0.35)',
          }}
        >
          {t('common.ok')}
        </button>
      </div>
    </>
  );
}

interface KitchenProps {
  closeTime: string;
  minimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
}

/** Dine-in customers after kitchen hours: a draggable banner that shrinks to a pill after 5 s. */
export function KitchenClosedBanner({ closeTime, minimized, onMinimizedChange }: KitchenProps) {
  const { t } = useI18n();

  // Auto-minimise 5 s after the banner opens. (It used a ref callback before, which restarted
  // the timer on every page re-render; an effect keyed on `minimized` runs once per opening.)
  useEffect(() => {
    if (minimized) return;
    const timer = setTimeout(() => onMinimizedChange(true), 5000);
    return () => clearTimeout(timer);
  }, [minimized, onMinimizedChange]);

  if (minimized) {
    // Minimized: small red pill in lower-left corner
    return (
      <div className="fixed bottom-5 left-5 z-[9010] cursor-pointer" onClick={() => onMinimizedChange(false)}>
        <div className="bg-gradient-to-r from-red-800 to-red-900 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-semibold hover:from-red-700 hover:to-red-800 transition-all">
          <span>🍳</span>
          <span>{t('kitchen.closedPill')}</span>
        </div>
      </div>
    );
  }

  // Maximized: draggable blood-red banner
  return (
    <Draggable
      className="z-[9010]"
      initialPosition={{ x: 16, y: 0 }}
      style={{ bottom: '80px', left: '0px', top: 'auto', maxWidth: '340px' }}
    >
      <div className="bg-gradient-to-br from-red-800 to-red-950 text-white rounded-xl shadow-2xl border border-red-700/50 overflow-hidden">
        {/* Header — entire row is tap target to minimize */}
        <div
          className="flex items-center justify-between px-4 pt-3 pb-2 cursor-pointer active:bg-white/10"
          onClick={() => onMinimizedChange(true)}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <span className="text-white opacity-50 text-xs flex-shrink-0">⋮⋮</span>
            <span className="text-lg">🍳</span>
            <span className="font-bold text-sm">{t('kitchen.closedTitle')}</span>
          </div>
          <span className="text-white/60 text-lg font-bold ml-2 leading-none">▾</span>
        </div>
        {/* Bilingual message */}
        <div className="px-4 pb-3 pt-1 space-y-2">
          <p className="text-sm text-red-100 italic leading-snug">{t('kitchen.closedBody', { time: closeTime })}</p>
          <p className="text-xs text-red-200/70 italic leading-snug">{t('kitchen.closedBodyEn', { time: closeTime })}</p>
        </div>
      </div>
    </Draggable>
  );
}
