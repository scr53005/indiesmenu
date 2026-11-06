'use client';

// Guest checkout warning, two variants: calling a waiter without an account (1.00 €) and ordering
// without an account (+5 %, discount lost). Extracted from app/menu/page.tsx in R2; markup unchanged.
import type { ReactNode } from 'react';
import { Interpolate, useI18n } from '@/lib/i18n';

interface Props {
  open: boolean;
  waiterFlow: boolean;
  processing: boolean;
  seconds: number;
  /** Order variant: guest total (no discount, +5 %), formatted "12.34". */
  guestTotal: string;
  /** Order variant: discount the guest gives up, formatted "1.23" ("0.00" hides the line). */
  discountLost: string;
  onProceed: () => void;
  onBack: () => void;
}

export default function GuestCheckoutModal({ open, waiterFlow, processing, seconds, guestTotal, discountLost, onProceed, onBack }: Props) {
  const { t } = useI18n();
  if (!open) return null;

  const proceedButton = (amount: ReactNode) => (
    <button
      disabled={processing}
      onClick={onProceed}
      className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
        processing ? 'bg-gray-500 text-gray-400 cursor-not-allowed animate-pulse' : 'bg-black text-gray-300 hover:bg-gray-900'
      }`}
    >
      {processing
        ? <>{t('guest.redirecting', { seconds })}<span className="inline-block ml-1 animate-bounce">...</span></>
        : <Interpolate text={t('guest.continuePay')} values={{ amount: <span className="text-red-500">{amount}</span> }} />}
    </button>
  );

  const backButton = (label: string) => !processing && (
    <button onClick={onBack} className="bg-white text-blue-600 px-4 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-gray-700 text-gray-300 rounded-lg p-6 max-w-md mx-4 shadow-xl">
        {waiterFlow ? (
          <>
            <h3 className="text-lg font-semibold mb-4 text-center">{t('guest.waiterTitle')}</h3>
            <p className="text-sm mb-3">
              <Interpolate text={t('guest.waiterCost')} values={{ fee: <span className="text-red-500 font-bold">1.00€</span> }} />
            </p>
            <p className="text-sm mb-4">
              <Interpolate
                text={t('guest.waiterFree')}
                values={{
                  free: <span className="text-green-400 font-semibold">{t('guest.free')}</span>,
                  fee: <span className="text-green-400 font-bold">0.02€</span>,
                }}
              />
            </p>
            <div className="flex flex-col gap-3 mt-6">
              {proceedButton('1.00€')}
              {backButton(t('guest.waiterCreateAccount'))}
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-4 text-center">{t('guest.orderTitle')}</h3>
            <p className="text-sm mb-3">
              <Interpolate
                text={t('guest.orderSurcharge')}
                values={{
                  surcharge: (
                    <span className="text-red-600 font-semibold">
                      <Interpolate text={t('guest.surcharge')} values={{ percent: <span className="text-red-500 font-bold">5%</span> }} />
                    </span>
                  ),
                }}
              />
            </p>
            {parseFloat(discountLost) > 0 && (
              <p className="text-sm mb-4">
                <Interpolate
                  text={t('guest.discountLost')}
                  values={{
                    lost: (
                      <span className="text-red-600 font-semibold">
                        <Interpolate
                          text={t('guest.discountLostAmount')}
                          values={{ amount: <span className="text-red-500 font-bold">{discountLost} €</span> }}
                        />
                      </span>
                    ),
                  }}
                />
              </p>
            )}
            <div className="flex flex-col gap-3 mt-6">
              {proceedButton(`${guestTotal} €`)}
              {backButton(t('guest.goBack'))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
