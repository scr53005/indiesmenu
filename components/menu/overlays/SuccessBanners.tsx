'use client';

// Green flow-success, blue waiter-called and green top-up banners (extracted from
// app/menu/page.tsx in R2; markup unchanged).
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

export function TopupSuccessBanner({ show, onDismiss }: { show: boolean; onDismiss: () => void }) {
  const { t } = useI18n();
  if (!show) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[9010] bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-4 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✓</span>
          <div>
            <p className="font-semibold text-base md:text-lg">{t('topup.success')}</p>
            <p className="text-sm opacity-90">{t('topup.updatingBalance')}</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-white hover:bg-white/20 rounded-full p-1 transition-colors flex-shrink-0"
          aria-label={t('common.dismiss')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
