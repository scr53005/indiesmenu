'use client';

// Yellow "payment in progress" banners and the grey transmission-error banner (extracted from
// app/menu/page.tsx in R2; markup unchanged). Since R4b they follow the payment state machine
// (progressOf) instead of five flags.
import { useI18n } from '@/lib/i18n';
import type { PaymentState } from '@/lib/innopay/paymentStateMachine';

/** Which yellow banner a state shows. */
export type PaymentProgress = 'guestPaid' | 'accountCreating' | 'transmissionError' | null;

export function progressOf(state: PaymentState): PaymentProgress {
  if (state.status === 'processing') {
    if (state.step === 'awaitingChain') return 'guestPaid';
    if (state.step === 'accountCreating') return 'accountCreating';
  }
  if (state.status === 'error' && state.reason === 'transmission') return 'transmissionError';
  return null;
}

interface Props {
  progress: PaymentProgress;
  onShowOrder: () => void;
  onClearOrder: () => void;
}

function Spinner() {
  return <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>;
}

export default function PaymentProgressBanners({ progress, onShowOrder, onClearOrder }: Props) {
  const { t } = useI18n();
  return (
    <>
      {/* Guest paid at Stripe, order on its way to the chain */}
      {progress === 'guestPaid' && (
        <div className="fixed top-0 left-0 right-0 z-[9000] bg-gradient-to-r from-yellow-500 to-yellow-600 text-blue-700 px-4 py-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <Spinner />
              <div>
                <p className="font-semibold text-base md:text-lg">{t('payment.success')}</p>
                <p className="text-sm opacity-90">{t('payment.transmitting')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transmission Error Banner - Shows below yellow payment success */}
      {progress === 'transmissionError' && (
        <>
          {/* Yellow payment success banner (stays visible) */}
          <div className="fixed top-0 left-0 right-0 z-[9000] bg-gradient-to-r from-yellow-500 to-yellow-600 text-blue-700 px-4 py-3 shadow-lg">
            <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✓</span>
                <p className="font-semibold text-base md:text-lg">{t('payment.success')}</p>
              </div>
            </div>
          </div>

          {/* Grey error banner below */}
          <div className="fixed left-0 right-0 z-[8990] bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-4 shadow-lg" style={{ top: '60px' }}>
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col items-center gap-3">
                <div className="text-center">
                  <p className="font-semibold text-base md:text-lg">{t('payment.transmissionError')}</p>
                  <p className="text-sm opacity-90">{t('payment.callWaiterApology')}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onShowOrder}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-md opacity-80 hover:opacity-100"
                  >
                    {t('payment.showOrder')}
                  </button>
                  <button
                    onClick={onClearOrder}
                    className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors shadow-md opacity-80 hover:opacity-100"
                  >
                    {t('payment.clearOrder')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Account Creation Success - Yellow Banner (Processing) */}
      {progress === 'accountCreating' && (
        <div className="fixed top-0 left-0 right-0 z-[9000] bg-gradient-to-r from-yellow-500 to-yellow-600 text-blue-700 px-4 py-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <Spinner />
              <div>
                <p className="font-semibold text-base md:text-lg">{t('payment.accountCreatedPaid')}</p>
                <p className="text-sm opacity-90">{t('payment.transmitting')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
