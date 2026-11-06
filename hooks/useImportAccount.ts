'use client';

// Import an existing Innopay account into this phone: email → 6-digit code → (choice of account)
// → keys saved → reload (Flow 8, SPOKE-KEY-SECURITY.md §4: only active + memo are stored).
// Extracted from app/menu/page.tsx in R3; same requests, messages and 3-second error display.
// Draws nothing: components/menu/overlays/ImportAccountModal takes `modalProps`.
import { useCallback, useEffect, useState } from 'react';
import { getInnopayUrl } from '@/lib/utils';
import { saveKeys } from '@/lib/innopay/keystore';
import { useI18n } from '@/lib/i18n';
import { ATTEMPTS_KEY, normalizeImportEmail, readImportAttempts } from '@/lib/innopay/import-account';
import type { ImportableAccount } from '@/components/menu/overlays/ImportAccountModal';

type Step = 'email' | 'code' | 'select';
const ERROR_MS = 3000;

export function useImportAccount() {
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(5);
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const [code, setCode] = useState('');
  const [accounts, setAccounts] = useState<ImportableAccount[]>([]);

  // Attempts left survive reloads (no retrying the email lookup forever).
  useEffect(() => {
    const stored = readImportAttempts(localStorage);
    if (stored !== null) {
      setAttempts(stored);
      if (stored <= 0) setDisabled(true);
    }
  }, []);

  /** Show `message` for 3 s, then clear it and end the loading state (as before R3). */
  const flashError = useCallback((message: string, then?: () => void) => {
    setError(message);
    setTimeout(() => { setError(''); setLoading(false); then?.(); }, ERROR_MS);
  }, []);

  const openImport = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setEmail('');
    setError('');
    setStep('email');
    setCode('');
    setAccounts([]);
  }, [disabled]);

  const saveAndReload = async (data: { accountName: string; keys?: { active?: string; memo?: string } }) => {
    // Awaited so the encrypted store + cache are populated before the reload.
    await saveKeys({ accountName: data.accountName, activeKey: data.keys?.active, memoKey: data.keys?.memo });
    window.location.reload();
  };

  const requestCode = useCallback(async () => {
    const sanitized = normalizeImportEmail(email);
    if (!sanitized) {
      setError(t('import.invalidEmail'));
      setTimeout(() => setError(''), ERROR_MS);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${getInnopayUrl()}/api/verify/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sanitized, language }),
      });
      const data = await response.json();
      if (data.found === true) {
        setStep('code');
        setLoading(false);
      } else if (data.found === false) {
        const left = attempts - 1;
        setAttempts(left);
        localStorage.setItem(ATTEMPTS_KEY, left.toString());
        if (left <= 0) {
          setDisabled(true);
          flashError(t('import.notFoundFinal'), () => setOpen(false));
        } else {
          flashError(t('import.maybeOtherEmail', { count: left }));
        }
      } else if (data.error) {
        flashError(data.error);
      }
    } catch (err) {
      console.error('[VERIFY] Network error:', err);
      flashError(t('import.connectionError'));
    }
  }, [email, attempts, language, t, flashError]);

  const verifyCode = useCallback(async () => {
    if (code.length !== 6) {
      setError(t('import.enterCode'));
      setTimeout(() => setError(''), ERROR_MS);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${getInnopayUrl()}/api/verify/check-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
      });
      const data = await response.json();
      if (data.success === true) {
        if (data.single === true) {
          await saveAndReload(data);
        } else {
          setAccounts(data.accounts);
          setStep('select');
          setLoading(false);
        }
      } else if (data.error) {
        flashError(data.error);
      }
    } catch (err) {
      console.error('[VERIFY] Network error:', err);
      flashError(t('import.connectionError'));
    }
  }, [code, email, t, flashError]);

  const selectAccount = useCallback(async (accountName: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${getInnopayUrl()}/api/verify/get-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountName, email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      if (data.accountName) await saveAndReload(data);
      else if (data.error) flashError(data.error);
    } catch (err) {
      console.error('[VERIFY] Network error:', err);
      flashError(t('import.connectionError'));
    }
  }, [email, t, flashError]);

  return {
    importDisabled: disabled,
    openImport,
    modalProps: {
      open,
      step,
      error,
      loading,
      email,
      onEmailChange: setEmail,
      code,
      onCodeChange: setCode,
      attemptsLeft: attempts,
      accounts,
      onClose: () => setOpen(false),
      onRequestCode: requestCode,
      onVerifyCode: verifyCode,
      onBackToEmail: () => { setStep('email'); setCode(''); setError(''); },
      onSelectAccount: selectAccount,
    },
  };
}
