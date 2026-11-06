'use client';

// External wallet warning + FreeNow recovery (extracted from app/menu/page.tsx in R2; markup
// unchanged). Some Android phones open the FreeNow taxi app for `hive://` links.
import { useI18n } from '@/lib/i18n';

interface Props {
  open: boolean;
  /** FreeNow (or nothing) opened instead of the wallet: show the recovery options. */
  freeNowOpened: boolean;
  onProceed: () => void;
  onCopyLink: () => void;
  /** Close and drop the pending transaction (×, "Payer avec Innopay"). */
  onClose: () => void;
  /** "Annuler" in the first step. */
  onCancel: () => void;
}

export default function ExternalWalletModal({ open, freeNowOpened, onProceed, onCopyLink, onClose, onCancel }: Props) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-2xl relative">
        {/* Close button */}
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl font-bold">
          ×
        </button>

        {!freeNowOpened ? (
          // Initial warning state
          <>
            <div className="text-center mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <h3 className="text-lg font-bold mb-3 text-gray-800 text-center">{t('external.title')}</h3>
            <p className="text-sm text-gray-600 mb-4 text-center">{t('external.body')}</p>
            <p className="text-xs text-orange-600 mb-4 text-center bg-orange-50 p-2 rounded">
              <strong>{t('external.noteLabel')}</strong> {t('external.note')}
            </p>
            <div className="space-y-2">
              <button
                onClick={onProceed}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                {t('external.open')}
              </button>
              <button
                onClick={onCancel}
                className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
              >
                {t('external.cancel')}
              </button>
            </div>
          </>
        ) : (
          // FreeNow opened / recovery state
          <>
            <div className="text-center mb-4">
              <span className="text-4xl">🚕</span>
            </div>
            <h3 className="text-lg font-bold mb-3 text-gray-800 text-center">{t('external.freeNowTitle')}</h3>
            <p className="text-sm text-gray-600 mb-4 text-center">{t('external.freeNowBody')}</p>
            <div className="space-y-2">
              <button
                onClick={onClose /* the customer uses the Innopay flow instead */}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                {t('external.payWithInnopay')}
              </button>
              <button
                onClick={onCopyLink}
                className="w-full bg-gray-600 text-white py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm"
              >
                {t('external.copyLink')}
              </button>
              <button
                onClick={onProceed}
                className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
              >
                {t('external.retry')}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">{t('external.tip')}</p>
          </>
        )}
      </div>
    </div>
  );
}
