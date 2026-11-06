'use client';

// MiniWallet order pulse (R3, extracted from app/menu/page.tsx; same behaviour as millewee's
// hooks/use-wallet-pulse.tsx). Polls /api/transfers/check-mine while an order is tracked in
// localStorage (written by storeMemoBeforeOrder), so it survives page reloads. The rules live in
// lib/innopay/pulse.ts; this hook only runs timers and storage.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FIRST_CHECK_MS, PULSE_KEYS, RETRY_MS, pulseAfterQuery, pulsePreCheck, type PulseState,
} from '@/lib/innopay/pulse';

export function useWalletPulse({ onOrderConfirmed }: {
  /** Once per order, when its transfer first shows up in the spoke DB: the order can no longer
   *  be withdrawn, so this is where the cart is cleared. */
  onOrderConfirmed: () => void;
}) {
  const [pulseState, setPulseState] = useState<PulseState>('none');
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest callback in a ref so the polling loop doesn't restart when the cart changes.
  const onConfirmedRef = useRef(onOrderConfirmed);
  useEffect(() => { onConfirmedRef.current = onOrderConfirmed; }, [onOrderConfirmed]);

  const checkRef = useRef<() => Promise<void>>(async () => {});
  const schedule = useCallback((ms: number) => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = setTimeout(() => { void checkRef.current(); }, ms);
  }, []);

  const clearKeys = (keys: (keyof typeof PULSE_KEYS)[]) => keys.forEach(k => localStorage.removeItem(PULSE_KEYS[k]));

  const check = useCallback(async () => {
    const pre = pulsePreCheck({
      memo: localStorage.getItem(PULSE_KEYS.memo),
      orderTime: parseInt(localStorage.getItem(PULSE_KEYS.orderTime) || '0'),
      fulfilledAt: parseInt(localStorage.getItem(PULSE_KEYS.fulfilledAt) || '0'),
      now: Date.now(),
    });
    if (pre.action === 'stop') { setPulseState('none'); return; }
    if (pre.action === 'cleanup') {
      clearKeys(['memo', 'orderTime', 'fulfilledAt', 'confirmedFor']);
      setPulseState('none');
      return;
    }
    if (pre.action === 'show') { setPulseState(pre.state); schedule(pre.nextMs); return; }

    try {
      const since = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); // 3 h window
      const res = await fetch(`/api/transfers/check-mine?memo_prefix=${encodeURIComponent(pre.memo)}&since=${since}`);
      if (!res.ok) { schedule(RETRY_MS); return; }
      const data = await res.json();

      if (data.found && localStorage.getItem(PULSE_KEYS.confirmedFor) !== pre.memo) {
        // Idempotent across reloads: a re-hydrated cart must not be wiped again.
        localStorage.setItem(PULSE_KEYS.confirmedFor, pre.memo);
        try { onConfirmedRef.current(); } catch (err) { console.warn('[PULSE] onOrderConfirmed threw:', err); }
      }

      const next = pulseAfterQuery(!!data.found, !!data.fulfilled, pre.ageMin);
      if (next.markFulfilled) localStorage.setItem(PULSE_KEYS.fulfilledAt, Date.now().toString());
      setPulseState(next.state);
      schedule(next.nextMs);
    } catch {
      schedule(RETRY_MS); // network error: retry soon instead of waiting a full interval
    }
  }, [schedule]);
  useEffect(() => { checkRef.current = check; }, [check]);

  // On mount: resume an order tracked before a reload. Re-check at once when the tab comes back
  // (typically from Keychain/Ecency or the hub): browsers throttle background timers.
  useEffect(() => {
    startTimer.current = setTimeout(() => { void checkRef.current(); }, FIRST_CHECK_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void checkRef.current(); };
    const onFocus = () => { void checkRef.current(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      if (startTimer.current) clearTimeout(startTimer.current);
      if (pollTimer.current) clearTimeout(pollTimer.current);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  /** Right after storeMemoBeforeOrder(): blue now, first server check after 9 s. The argument
   *  is ignored (the memo is read from localStorage); kept so existing call sites stay as they are. */
  const startOrderPulsing = useCallback((_memoPrefix?: string) => {
    clearKeys(['fulfilledAt', 'confirmedFor']);
    setPulseState('blue');
    if (pollTimer.current) { clearTimeout(pollTimer.current); pollTimer.current = null; }
    if (startTimer.current) clearTimeout(startTimer.current);
    startTimer.current = setTimeout(() => { startTimer.current = null; void checkRef.current(); }, FIRST_CHECK_MS);
  }, []);

  /** Long-press / double-tap reset on the wallet: forget the tracked order and stop. */
  const resetPulse = useCallback(() => {
    clearKeys(['memo', 'orderTime', 'fulfilledAt', 'confirmedFor']);
    setPulseState('none');
    if (pollTimer.current) { clearTimeout(pollTimer.current); pollTimer.current = null; }
    if (startTimer.current) { clearTimeout(startTimer.current); startTimer.current = null; }
  }, []);

  /** Wallet closed: stop showing the pulse; the next check brings it back if still relevant. */
  const hidePulse = useCallback(() => setPulseState('none'), []);

  return { pulseState, startOrderPulsing, resetPulse, hidePulse };
}
