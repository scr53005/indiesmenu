'use client';

// Green "Connecté: @account" strip with the disconnect button (extracted from app/menu/page.tsx
// in R2; markup unchanged).
import { useI18n } from '@/lib/i18n';

export default function WalletStatusBar({ username, onDisconnect }: {
  username: string | null;
  /** Called after the customer confirmed. */
  onDisconnect: () => void;
}) {
  const { t } = useI18n();
  if (!username) return null;
  return (
    <div className="fixed top-[80px] left-0 right-0 z-[8990] bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">✓</span>
          <div>
            <p className="font-semibold text-sm md:text-base">{t('wallet.connected', { username })}</p>
            <p className="text-xs opacity-90">{t('wallet.active')}</p>
          </div>
        </div>
        <button
          onClick={() => { if (confirm(t('wallet.disconnectConfirm'))) onDisconnect(); }}
          className="text-white hover:text-green-200 transition-colors px-3 py-1 text-sm border border-white rounded"
        >
          {t('wallet.disconnect')}
        </button>
      </div>
    </div>
  );
}
