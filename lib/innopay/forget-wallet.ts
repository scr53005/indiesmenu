import { clearCredentials } from './keystore';

/** Explicit allowlist: never clear the cart, table, language or unrelated site data. */
const WALLET_STORAGE_KEYS = [
  'innopay_accountName', 'innopayAccountName', 'innopay_activePrivate', 'innopay_memoPrivate',
  'innopay_masterPassword', 'innopayMasterPassword', 'innopay_seed', 'innopaySeed',
  'innopay_postingPrivate', 'innopay_postingPublic', 'innopay_activePublic', 'innopay_memoPublic',
  'innopay_ownerPrivate', 'innopay_ownerPublic', 'innopay_email', 'innopay_accounts',
  'innopay_wallet_credentials', 'innopay_credentialToken', 'innopay_import_attempts',
  'innopay_lastBalance', 'innopay_lastBalance_timestamp', 'innopay_balance_trustUntil',
  'innopay_flow6_cooldown_until', 'innopay_latestMemoContent', 'innopay_latestMemoDateTime',
  'innopay_fulfilledDetectedAt', 'innopay_orderConfirmedForMemo', 'innopay_pending_order',
  'innopay_debug_last_params',
  'innopay_flow_pending', 'innopay_wallet_hidden',
] as const;

export function clearWalletStorage(storage: Pick<Storage, 'removeItem'>): void {
  for (const key of WALLET_STORAGE_KEYS) storage.removeItem(key);
}

/** A stale hub return must not re-import credentials or replay payment handling after reload. */
export function walletReloadUrl(href: string): string {
  const url = new URL(href);
  for (const key of [
    'credential_token', 'session_id', 'account_created', 'existing_account',
    'order_success', 'topup_success', 'payment', 'flow', 'balance', 'optimistic_balance',
  ]) url.searchParams.delete(key);
  return url.href;
}

type WalletBrowser = {
  localStorage: Pick<Storage, 'removeItem'>;
  sessionStorage: Pick<Storage, 'removeItem'>;
  location: Pick<Location, 'href' | 'replace'>;
};

export function forgetLocalWallet(browser: WalletBrowser = window): void {
  const destination = walletReloadUrl(browser.location.href);
  clearCredentials();
  clearWalletStorage(browser.localStorage);
  clearWalletStorage(browser.sessionStorage);
  // Full navigation drops React/query caches and mounted payment listeners as well.
  browser.location.replace(destination);
}
