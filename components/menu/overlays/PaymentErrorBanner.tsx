'use client';

// Grey banner for a payment that failed (R4, INDIESMENU-REFACTOR-PLAN.md §5b): the machine's
// 'error' state with reason 'failed'. The message is already customer-facing (customerFacingError
// or a t() string). The Stripe "paid but not transmitted" case keeps its own banner in
// PaymentProgressBanners.
import { useI18n } from '@/lib/i18n';

export default function PaymentErrorBanner({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  const { t } = useI18n();
  if (!message) return null;
  return (
    <div role="alert" className="fixed top-0 left-0 right-0 z-[9020] bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-4 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
        <p className="font-semibold text-base md:text-lg">{message}</p>
        <button
          onClick={onDismiss}
          className="bg-white text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors ml-4 flex-shrink-0"
        >
          {t('common.ok')}
        </button>
      </div>
    </div>
  );
}
