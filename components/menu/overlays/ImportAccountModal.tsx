'use client';

// Import an existing Innopay account by email + 6-digit code (extracted from app/menu/page.tsx
// in R2; markup unchanged). All state and requests stay in the page; this only draws.
import { Interpolate, useI18n } from '@/lib/i18n';

export interface ImportableAccount {
  accountName: string;
  creationDate: string;
  euroBalance: number;
}

interface Props {
  open: boolean;
  step: 'email' | 'code' | 'select';
  error: string;
  loading: boolean;
  email: string;
  onEmailChange: (email: string) => void;
  code: string;
  onCodeChange: (code: string) => void;
  attemptsLeft: number;
  accounts: ImportableAccount[];
  onClose: () => void;
  onRequestCode: () => void;
  onVerifyCode: () => void;
  onBackToEmail: () => void;
  onSelectAccount: (accountName: string) => void;
}

export default function ImportAccountModal(p: Props) {
  const { t } = useI18n();
  if (!p.open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl relative">
        {/* Close button */}
        <button onClick={p.onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl font-bold">
          ×
        </button>

        <h3 className="text-xl font-bold mb-4 text-gray-800 text-center">{t('import.title')}</h3>

        {/* Show appropriate content based on step and error state */}
        {p.error && p.step === 'email' ? (
          <div className="text-center py-8">
            <p className="text-red-600 font-semibold text-lg">{p.error}</p>
          </div>
        ) : (
          <>
            {/* Step 1: Email input */}
            {p.step === 'email' && (
              <>
                <p className="text-sm text-gray-600 mb-4 text-center">{t('import.emailPrompt')}</p>

                <input
                  type="email"
                  value={p.email}
                  onChange={(e) => p.onEmailChange(e.target.value)}
                  placeholder={t('import.emailPlaceholder')}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-blue-500 text-gray-800"
                  disabled={p.loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !p.loading) p.onRequestCode();
                  }}
                />

                <p className="text-xs text-gray-500 mb-4 text-center">
                  {t(p.attemptsLeft > 1 ? 'import.attemptsLeftMany' : 'import.attemptsLeftOne', { count: p.attemptsLeft })}
                </p>

                <button
                  onClick={p.onRequestCode}
                  disabled={p.loading || !p.email}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {p.loading ? t('import.searching') : t('import.retrieve')}
                </button>
              </>
            )}

            {/* Step 2: Code verification */}
            {p.step === 'code' && (
              <>
                <p className="text-sm text-gray-600 mb-4 text-center">
                  <Interpolate text={t('import.codeSent')} values={{ email: <strong>{p.email}</strong> }} />
                </p>

                <input
                  type="text"
                  value={p.code}
                  onChange={(e) => p.onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t('import.codePlaceholder')}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-blue-500 text-gray-800 text-center text-2xl font-mono tracking-widest"
                  disabled={p.loading}
                  maxLength={6}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !p.loading && p.code.length === 6) p.onVerifyCode();
                  }}
                />

                {p.error && <p className="text-xs text-red-600 mb-4 text-center">{p.error}</p>}

                <button
                  onClick={p.onVerifyCode}
                  disabled={p.loading || p.code.length !== 6}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mb-2"
                >
                  {p.loading ? t('import.verifying') : t('import.verify')}
                </button>

                <button onClick={p.onBackToEmail} className="w-full text-blue-600 hover:text-blue-800 text-sm">
                  {t('import.back')}
                </button>
              </>
            )}

            {/* Step 3: Multiple accounts selection */}
            {p.step === 'select' && (
              <>
                <p className="text-sm text-gray-600 mb-4 text-center">{t('import.selectPrompt')}</p>

                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                  {p.accounts.map((account) => (
                    <button
                      key={account.accountName}
                      onClick={() => p.onSelectAccount(account.accountName)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="font-semibold text-gray-800">{account.accountName}</div>
                      <div className="text-sm text-gray-600">
                        {t('import.accountLine', {
                          balance: account.euroBalance.toFixed(2),
                          date: new Date(account.creationDate).toLocaleDateString('fr-FR'),
                        })}
                      </div>
                    </button>
                  ))}
                </div>

                {p.error && <p className="text-xs text-red-600 mb-4 text-center">{p.error}</p>}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
