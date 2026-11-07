'use client';

// Green flow-success and blue waiter-called banners (extracted from app/menu/page.tsx in R2;
// markup unchanged). The top-up banner went in R4b: a spoke never does a pure top-up.
import { useI18n } from '@/lib/i18n';

/** Flows 4–7. `walletReady` = flow 4 (account created, no order); `orderSent` = flows 5/6/7. */
export function FlowSuccessBanner({ kind, onDismiss }: { kind: 'walletReady' | 'orderSent' | null; onDismiss: () => void }) {
  const { t } = useI18n();
  if (!kind) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[9020] bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-4 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✓</span>
          <div>
            <p className="font-semibold text-base md:text-lg">
              {t(kind === 'walletReady' ? 'success.walletReady' : 'success.orderSent')}
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="bg-white text-green-700 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors ml-4"
        >
          {t('common.ok')}
        </button>
      </div>
    </div>
  );
}

export function WaiterCalledBanner({ show, onDismiss }: { show: boolean; onDismiss: () => void }) {
  const { t } = useI18n();
  if (!show) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[9020] bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-4 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔔</span>
          <div>
            <p className="font-semibold text-base md:text-lg">{t('waiter.coming')}</p>
            <p className="text-sm opacity-90">{t('waiter.comingEn')}</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="bg-white text-blue-700 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors ml-4"
        >
          {t('common.ok')}
        </button>
      </div>
    </div>
  );
}
