'use client';

// Call-waiter modal (reason input) and the red "Serveur demandé" strip shown while a guest
// decides how to pay. Extracted from app/menu/page.tsx in R2; markup unchanged.
import { useI18n } from '@/lib/i18n';

const roundButton = {
  borderRadius: '50%',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
} as const;

export function CallWaiterModal({ open, reason, onReasonChange, onConfirm, onCancel }: {
  open: boolean;
  reason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 9998 }} />
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          width: 280,
          borderRadius: 18,
          overflow: 'hidden',
          background: 'rgba(255, 252, 248, 0.95)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.22), 0 1.5px 4px rgba(0,0,0,0.08)',
          border: '1px solid rgba(180, 160, 130, 0.25)',
          colorScheme: 'light',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px 16px 10px',
            borderBottom: '1px solid rgba(180, 160, 130, 0.15)',
            gap: 7,
          }}
        >
          <span style={{ fontSize: 18 }}>🔔</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#3a2e1e' }}>{t('waiter.title')}</span>
        </div>

        {/* Reason input */}
        <div style={{ padding: '14px 20px 10px' }}>
          <input
            type="text"
            placeholder={t('waiter.reasonPlaceholder')}
            maxLength={80}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1.5px solid #999',
              fontSize: 15,
              color: '#000',
              background: '#fff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#dc3545'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(220,53,69,0.15)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#999'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Actions: Confirm + red X cancel on same row */}
        <div style={{ padding: '4px 20px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(220, 53, 69, 0.35)',
            }}
          >
            {t('waiter.call')}
          </button>
          <button
            onClick={onCancel}
            style={{
              ...roundButton,
              width: 38,
              height: 38,
              border: 'none',
              background: '#dc3545',
              fontSize: 18,
              lineHeight: 1,
              boxShadow: '0 2px 6px rgba(220, 53, 69, 0.35)',
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}

export function WaiterRequestedStrip({ show, reason, top, onCancel }: {
  show: boolean;
  reason: string;
  /** px from the top of the screen (below the cart and the dishes/drinks bar). */
  top: number;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  if (!show) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        top: `${top}px`,
        zIndex: 9997,
        width: '90%',
        maxWidth: 400,
        borderRadius: 12,
        background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
        color: '#fff',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 4px 20px rgba(220, 53, 69, 0.4)',
        colorScheme: 'light',
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0 }}>🔔</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{t('waiter.requested')}</div>
        {reason.trim() && (
          <div style={{ fontSize: 12, opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {reason.trim()}
          </div>
        )}
      </div>
      <button
        onClick={onCancel}
        style={{
          ...roundButton,
          width: 28,
          height: 28,
          border: '1.5px solid rgba(255,255,255,0.5)',
          background: 'transparent',
          fontSize: 14,
        }}
      >
        ✕
      </button>
    </div>
  );
}
