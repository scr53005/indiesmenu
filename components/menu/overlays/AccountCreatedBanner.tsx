'use client';

// Blue "account created" banner with the new credentials (extracted from app/menu/page.tsx in
// R2; markup unchanged).
import { useI18n } from '@/lib/i18n';

export interface NewAccountCredentials {
  accountName: string;
  masterPassword: string;
  euroBalance: number;
}

export default function AccountCreatedBanner({ credentials, onDismiss }: {
  credentials: NewAccountCredentials | null;
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  if (!credentials) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[9000] bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-4 shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <p className="font-semibold text-base md:text-lg">{t('account.createdTitle')}</p>
              <p className="text-sm opacity-90">{t('account.orderPreparing')}</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="bg-white text-blue-700 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            {t('common.ok')}
          </button>
        </div>
        <div className="bg-white/10 rounded-lg p-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <span className="opacity-75">{t('account.name')}</span>
              <span className="ml-2 font-mono font-bold">{credentials.accountName}</span>
            </div>
            <div>
              <span className="opacity-75">{t('account.balance')}</span>
              <span className="ml-2 font-bold">{credentials.euroBalance.toFixed(2)} EURO</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="opacity-75">{t('account.password')}</span>
            <span className="ml-2 font-mono text-xs break-all">{credentials.masterPassword}</span>
          </div>
          <p className="mt-2 text-xs opacity-75">{t('account.savedHint')}</p>
        </div>
      </div>
    </div>
  );
}
