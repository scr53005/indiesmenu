import { PrivateKey, cryptoUtils } from '@hiveio/dhive';

// Secure wallet hand-off, SPOKE → HUB (SPOKE-DOCUMENTATION.md "SECURE WALLET HAND-OFF"; same as
// millewee/lib/innopay/handoff.ts). Flow 7 needs the customer's wallet on wallet.innopay.lu. The
// spoke proves it holds the account's ACTIVE key by signing a self-timestamped, single-use
// challenge; the hub checks the signature against the account's on-chain active authority, then
// imports active + memo from its own database. No key ever rides in the URL: only the public
// account name, a timestamp, a nonce and a one-time signature.
// R4d (2026-11-08) replaces indies' old `?source=indiesmenu&account=` landing, where the hub
// handed out an account's keys to anyone who named it.

const HANDOFF_PREFIX = 'innopay-wallet-handoff';

export interface HandoffProof {
  account: string;
  ts: number; // ms epoch, for freshness (the hub accepts 2 minutes)
  nonce: string; // single-use (the hub stores it)
  sig: string; // active-key signature over handoffMessage()
}

/** The exact string that is signed; the hub rebuilds it identically to verify. */
export function handoffMessage(account: string, ts: number, nonce: string): string {
  return `${HANDOFF_PREFIX}:${account}:${ts}:${nonce}`;
}

/** 128 random bits as hex. getRandomValues: crypto.randomUUID is missing on http LAN pages. */
function newNonce(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Sign a hand-off proof with the account's ACTIVE key (WIF). Client-side: the key stays here. */
export function buildHandoffProof(account: string, activeWif: string, now: number = Date.now()): HandoffProof {
  const nonce = newNonce();
  const sig = PrivateKey.fromString(activeWif).sign(cryptoUtils.sha256(handoffMessage(account, now, nonce))).toString();
  return { account, ts: now, nonce, sig };
}

/** The proof as URL params for /wallet-handoff. */
export function handoffParams(proof: HandoffProof): Record<string, string> {
  return {
    handoff_account: proof.account,
    handoff_ts: String(proof.ts),
    handoff_nonce: proof.nonce,
    handoff_sig: proof.sig,
  };
}
