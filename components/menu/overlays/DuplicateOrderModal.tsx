'use client';

// "Recent similar order" warning (extracted from app/menu/page.tsx in R2; markup unchanged).
import { useI18n } from '@/lib/i18n';

const buttonBase = { flex: 1, height: 44, borderRadius: 12, border: 'none', fontSize: 14, cursor: 'pointer' } as const;

export default function DuplicateOrderModal({ open, onOrderAnyway, onCancel }: {
  open: boolean;
  /** "Pas grave": place the order anyway. */
  onOrderAnyway: () => void;
  /** Backdrop / "Merci du rappel !". */
  onCancel: () => void;
}) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 10010 }} />
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: '10%',
          transform: 'translateX(-50%)',
          zIndex: 10011,
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
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#3a2e1e' }}>{t('duplicate.title')}</span>
        </div>

        {/* Message */}
        <div style={{ padding: '14px 20px 10px' }}>
          <p style={{ fontSize: 14, color: '#555', textAlign: 'center', margin: 0, lineHeight: 1.4 }}>
            {t('duplicate.body')}
          </p>
        </div>

        {/* Actions */}
        <div style={{ padding: '4px 20px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={onOrderAnyway} style={{ ...buttonBase, background: '#555', color: '#bbb', fontWeight: 600 }}>
            {t('duplicate.orderAnyway')}
          </button>
          <button
            onClick={onCancel}
            style={{
              ...buttonBase,
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#fff',
              fontWeight: 700,
              boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)',
            }}
          >
            {t('duplicate.cancel')}
          </button>
        </div>
      </div>
    </>
  );
}
