'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { getTable, hydrateMemo, HydratedOrderLine, getOrderTiming, OrderTiming } from '@/lib/utils';
import { MenuData } from '@/lib/data/menu';
import { generateReceiptHtml } from '@/lib/print-utils';
import { isRestaurantOpen } from '@/lib/config/kitchen-hours';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';
import { Lato } from 'next/font/google';

const lato = Lato({
  weight: ['300', '400', '700'],
  subsets: ['latin'],
});

const FR_MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jui', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
/** Format ISO date "2026-03-02" as "02-Mar" */
function formatDateShortFr(isoDate: string): string {
  const [, m, d] = isoDate.split('-');
  return `${d}-${FR_MONTHS[parseInt(m, 10) - 1]}`;
}
/** Local today as YYYY-MM-DD (avoids UTC shift from toISOString) */
function localToday(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

interface Transfer {
  id: string;
  from_account: string;
  to_account: string;
  amount: string;
  symbol: string;
  memo: string;
  parsedMemo?: HydratedOrderLine[];
  isCallWaiter?: boolean;
  received_at: string;
}

interface GroupedOrder {
  memo: string;
  transfers: Transfer[];
  primaryTransfer: Transfer;
  hbdTransfer?: Transfer;
  allTransferIds: string[];
}

const POLL_MS = 6000;
const POLL_MS_SLOW = 30_000;
const POLL_MS_SLOWER = 60_000;
const IDLE_SLOW_AFTER = 50;    // 50 × 6s = 5 min → switch to 30s
const IDLE_SLOWER_AFTER = 150;  // ~15 min total → switch to 60s
const HOURS_CHECK_MS = 60_000;
const WAKE_UP_MS = 30_000;

type PauseReason = 'none' | 'closed' | 'hidden';

function isRestaurantOpenNow(): boolean {
  const now = new Date();
  return isRestaurantOpen(now.getDay(), now.getHours() * 60 + now.getMinutes());
}

function getMerchantHubUrl(): string {
  return process.env.NEXT_PUBLIC_MERCHANT_HUB_URL || 'https://merchant-hub-theta.vercel.app';
}

function getIdentifier(memo: string): string | null {
  const identifierMatch = memo.match(/[a-z]{3}-inno-[a-z0-9]{4}-[a-z0-9]{4}/i);
  return identifierMatch ? identifierMatch[0] : null;
}

export default function CurrentOrdersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncInfo, setLastSyncInfo] = useState<string>('');
  const [isPoller, setIsPoller] = useState(false);
  const [pollerStatus, setPollerStatus] = useState<string>('');
  const [pauseReason, setPauseReason] = useState<PauseReason>('none');

  const pollInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollerInterval = useRef<NodeJS.Timeout | null>(null);
  const wakeUpInterval = useRef<NodeJS.Timeout | null>(null);
  const hoursCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousTransfersRef = useRef<Set<string>>(new Set());
  const printedRef = useRef<Set<string>>(new Set());
  const previouslyDelayedRef = useRef<Set<string>>(new Set());
  const idleCyclesRef = useRef(0);
  const currentIntervalRef = useRef(POLL_MS);
  const pausedRef = useRef(false);

  const isDev = process.env.NODE_ENV === 'development';

  const [canPlayAudio, setCanPlayAudio] = useState(false);
  const bell1Ref = useRef<HTMLAudioElement | null>(null);
  const bell2Ref = useRef<HTMLAudioElement | null>(null);
  const canPlayAudioRef = useRef(canPlayAudio);
  const reminderIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const printIframeRef = useRef<HTMLIFrameElement>(null);
  const printQueueRef = useRef<Promise<void>>(Promise.resolve());
  const playBellSoundsRef = useRef<() => void>(() => {});
  const printOrderRef = useRef<(transfer: Transfer) => boolean>(() => false);

  useEffect(() => { canPlayAudioRef.current = canPlayAudio; }, [canPlayAudio]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      bell1Ref.current = new Audio('/sounds/police-siren.mp3');
      bell1Ref.current.load();
      bell2Ref.current = new Audio('/sounds/chime-2.mp3');
      bell2Ref.current.load();
    }
  }, []);

  const toggleAudio = () => {
    setCanPlayAudio(prev => !prev);
  };

  const playBellSounds = useCallback(() => {
    if (canPlayAudio && bell1Ref.current && bell2Ref.current) {
      bell1Ref.current.currentTime = 0;
      bell1Ref.current.play().catch(e => console.error('[AUDIO] Error playing police siren:', e));
      bell2Ref.current.currentTime = 0;
      bell2Ref.current.play().catch(e => console.error('[AUDIO] Error playing chime:', e));
    }
  }, [canPlayAudio]);

  // Sequential print queue: each job waits for the previous one to fully spool
  // before writing to the shared iframe. Prevents the race where a second
  // doc.write() overwrites the iframe content before the first print() is captured.
  const enqueuePrint = (html: string) => {
    printQueueRef.current = printQueueRef.current.then(() => new Promise<void>((resolve) => {
      if (!printIframeRef.current) { resolve(); return; }
      const iframe = printIframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc || !iframe.contentWindow) { resolve(); return; }

      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        const win = iframe.contentWindow;
        if (!win) { resolve(); return; }

        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          win.removeEventListener('afterprint', done);
          resolve();
        };

        win.addEventListener('afterprint', done);
        setTimeout(done, 3000); // fallback if afterprint never fires
        win.focus();
        win.print();
      }, 500);
    }));
  };

  const printOrder = useCallback((transfer: Transfer) => {
    // Determine hydration state
    const isHydrated = transfer.parsedMemo && transfer.parsedMemo.length > 0 && transfer.parsedMemo[0].type !== 'raw';
    
    // Safety check: Don't print if it's not hydrated yet (unless it's a simple raw memo)
    if (!isHydrated && transfer.memo.includes(':')) {
      console.warn('[PRINT] Skipping print for unhydrated codified order:', transfer.id);
      return false;
    }

    if (!transfer.parsedMemo || transfer.parsedMemo.length === 0) return false;

    const dishes = transfer.parsedMemo.filter(item => item.type === 'item' && item.categoryType === 'dish');
    const drinks = transfer.parsedMemo.filter(item => item.type === 'item' && item.categoryType === 'drink');

    console.log('[PRINT] Printing order:', transfer.id);

    if (dishes.length > 0) {
      enqueuePrint(generateReceiptHtml({
        id: transfer.id,
        from_account: transfer.from_account,
        memo: transfer.memo,
        received_at: transfer.received_at,
        items: dishes,
        ticketType: 'CUISINE'
      }));
    }

    if (drinks.length > 0) {
      enqueuePrint(generateReceiptHtml({
        id: transfer.id,
        from_account: transfer.from_account,
        memo: transfer.memo,
        received_at: transfer.received_at,
        items: drinks,
        ticketType: 'BAR'
      }));
    }

    if (dishes.length === 0 && drinks.length === 0) {
      enqueuePrint(generateReceiptHtml({
        id: transfer.id,
        from_account: transfer.from_account,
        memo: transfer.memo,
        received_at: transfer.received_at,
        items: transfer.parsedMemo,
        ticketType: 'CUISINE'
      }));
    }
    
    return true;
  }, []);

  // Keep refs in sync so syncAndReload doesn't need these as dependencies
  useEffect(() => { playBellSoundsRef.current = playBellSounds; }, [playBellSounds]);
  useEffect(() => { printOrderRef.current = printOrder; }, [printOrder]);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch('/api/menu');
        const data = await res.json();
        setMenuData(data);
      } catch (err) {
        console.error('Failed to fetch menu:', err);
      }
    }
    fetchMenu();
  }, []);

  const hydrateTransfers = useCallback((rawTransfers: any[]): Transfer[] => {
    return rawTransfers.map(tx => {
      let parsedMemo: HydratedOrderLine[] = [];
      let isCallWaiter = false;
      const tableIndex = tx.memo?.lastIndexOf('TABLE ') ?? -1;
      const memoPrefix = tableIndex !== -1 ? tx.memo.substring(0, tableIndex).trim().toLowerCase() : (tx.memo || '').toLowerCase();
      if (memoPrefix.includes('appel')) isCallWaiter = true;
      const orderContent = tableIndex !== -1 ? tx.memo.substring(0, tableIndex).trim() : (tx.memo || '');

      // Single hydration path for all memo types (orders and call-waiter)
      // hydrateMemo handles non-codified memos (like call-waiter) as raw with n: decoding
      if (tx.parsedMemo) {
        try {
          parsedMemo = typeof tx.parsedMemo === 'string' ? JSON.parse(tx.parsedMemo) : tx.parsedMemo;
        } catch {
          if (menuData) {
            try { parsedMemo = hydrateMemo(orderContent, menuData); } catch { parsedMemo = [{ type: 'raw', content: orderContent }]; }
          } else { parsedMemo = [{ type: 'raw', content: orderContent }]; }
        }
      } else if (menuData) {
        try { parsedMemo = hydrateMemo(orderContent, menuData); } catch { parsedMemo = [{ type: 'raw', content: orderContent }]; }
      } else { parsedMemo = [{ type: 'raw', content: orderContent }]; }

      return { ...tx, parsedMemo, isCallWaiter };
    });
  }, [menuData]);

  // Re-hydrate and trigger pending prints when menuData loads
  useEffect(() => {
    if (menuData && transfers.length > 0) {
      console.log('[MENU] Data arrived, hydrating and checking for pending prints...');
      const rehydrated = hydrateTransfers(transfers);
      setTransfers(rehydrated);
      
      // Auto-print any that were missed
      rehydrated.forEach(tx => {
        if (!tx.isCallWaiter && !printedRef.current.has(tx.id)) {
          const success = printOrder(tx);
          if (success) printedRef.current.add(tx.id);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuData]);

  const fetchTransfers = useCallback(async (): Promise<Transfer[]> => {
    try {
      const res = await fetch('/api/transfers/unfulfilled');
      if (res.ok) {
        const data = await res.json();
        return hydrateTransfers(data.transfers || []);
      }
    } catch (err) {
      console.error('Failed to load transfers:', err);
    }
    return [];
  }, [hydrateTransfers]);

  const groupedOrders = useMemo((): GroupedOrder[] => {
    const groups = new Map<string, Transfer[]>();
    transfers.forEach(transfer => {
      // Call-waiter transfers are always individual (no grouping)
      // Otherwise group by identifier (kcs-inno-xxxx-yyyy), fall back to full memo
      const key = transfer.isCallWaiter
        ? `call-waiter-${transfer.id}`
        : getIdentifier(transfer.memo) || transfer.memo || `no-memo-${transfer.id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(transfer);
    });
    return Array.from(groups.entries()).map(([, transfers]) => {
      const primaryTransfer = transfers.find(t => t.symbol === 'EURO') || transfers[0];
      return { memo: primaryTransfer.memo, transfers, primaryTransfer, hbdTransfer: transfers.find(t => t.symbol === 'HBD'), allTransferIds: transfers.map(t => t.id) };
    });
  }, [transfers]);

  // Split orders into immediate vs delayed based on timing token
  const { immediateOrders, delayedOrders } = useMemo(() => {
    const immediate: GroupedOrder[] = [];
    const delayed: (GroupedOrder & { timing: OrderTiming; targetMs: number })[] = [];

    groupedOrders.forEach(order => {
      const timing = getOrderTiming(order.memo);
      if (timing) {
        const [h, m] = timing.time.split('h').map(Number);
        const now = new Date();

        // Build full target datetime
        let target: Date;
        if (timing.date) {
          // New format with date: P@2026-03-02@12h30
          const [y, mo, d] = timing.date.split('-').map(Number);
          target = new Date(y, mo - 1, d, h, m, 0);
        } else {
          // Legacy format (same-day assumption): P@12h30
          target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
        }

        const diffMinutes = (target.getTime() - now.getTime()) / 60000;

        // Promote to immediate if within 30 minutes of target (or past)
        if (diffMinutes <= 30) {
          immediate.push(order);
        } else {
          delayed.push({ ...order, timing, targetMs: target.getTime() });
        }
      } else {
        immediate.push(order);
      }
    });

    // Sort delayed by target time ascending (soonest on top)
    delayed.sort((a, b) => a.targetMs - b.targetMs);

    return { immediateOrders: immediate, delayedOrders: delayed };
  }, [groupedOrders]);

  // Promotion detection: trigger bell + print when delayed orders move to immediate
  useEffect(() => {
    immediateOrders.forEach(order => {
      const orderId = order.primaryTransfer.id;
      if (previouslyDelayedRef.current.has(orderId)) {
        previouslyDelayedRef.current.delete(orderId);
        if (canPlayAudioRef.current) playBellSoundsRef.current();
        if (!printedRef.current.has(orderId)) {
          const success = printOrderRef.current(order.primaryTransfer);
          if (success) printedRef.current.add(orderId);
        }
        if (!reminderIntervalsRef.current.has(orderId)) {
          const intervalId = setInterval(() => { if (canPlayAudioRef.current) playBellSoundsRef.current(); }, 30000);
          reminderIntervalsRef.current.set(orderId, intervalId);
        }
      }
    });
    previouslyDelayedRef.current = new Set(delayedOrders.map(o => o.primaryTransfer.id));
  }, [immediateOrders, delayedOrders]);

  const triggerPoll = useCallback(async () => {
    const merchantHubUrl = getMerchantHubUrl().replace(/\/$/, '');
    try {
      const pollRes = await fetch(`${merchantHubUrl}/api/poll`);
      if (pollRes.ok) {
        const pollData = await pollRes.json();
        console.log(`[POLL] HAF poll: ${pollData.transfersFound} transfers found`);
      }
    } catch (err: any) { console.error('[POLL] HAF poll error:', err.message); }
  }, []);

  const syncAndReload = useCallback(async () => {
    try {
      // 1. Sync from merchant-hub (Redis -> local DB)
      const syncRes = await fetch('/api/transfers/sync-from-merchant-hub', { method: 'POST' });
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        if (syncData.inserted > 0) toast.info(`${syncData.inserted} nouvelle(s) commande(s)!`, { autoClose: 3000 });
        setLastSyncInfo(`Sync: ${syncData.inserted || 0} new, ${syncData.acked || 0} acked`);
      }

      // 2. Fetch the current unfulfilled transfers from DB (single source of truth)
      const hydrated = await fetchTransfers();

      // 3. Detect new transfers by comparing with previous set
      const newTransfers = hydrated.filter(t => !previousTransfersRef.current.has(t.id));

      // Only bell/print for immediate orders (no timing, or within 30 min of target)
      const newImmediateTransfers = newTransfers.filter(tx => {
        const timing = getOrderTiming(tx.memo);
        if (!timing) return true; // No timing = immediate
        const [h, m] = timing.time.split('h').map(Number);
        const now = new Date();
        let target: Date;
        if (timing.date) {
          const [y, mo, d] = timing.date.split('-').map(Number);
          target = new Date(y, mo - 1, d, h, m, 0);
        } else {
          target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
        }
        return (target.getTime() - now.getTime()) / 60000 <= 30;
      });

      // Adaptive backoff: reset on any new transfer (immediate or not)
      if (newTransfers.length > 0) {
        idleCyclesRef.current = 0;
        currentIntervalRef.current = POLL_MS;
      }

      if (newImmediateTransfers.length > 0) {
        if (canPlayAudioRef.current) playBellSoundsRef.current();
        newImmediateTransfers.forEach(tx => {
          if (!tx.isCallWaiter && !printedRef.current.has(tx.id)) {
            const success = printOrderRef.current(tx);
            if (success) printedRef.current.add(tx.id);
          }
          if (!reminderIntervalsRef.current.has(tx.id)) {
            const intervalId = setInterval(() => { if (canPlayAudioRef.current) playBellSoundsRef.current(); }, 30000);
            reminderIntervalsRef.current.set(tx.id, intervalId);
          }
        });
      }

      // 4. Update state and tracking ref in one go
      previousTransfersRef.current = new Set(hydrated.map(t => t.id));
      setTransfers(hydrated);

      // Adaptive backoff: if no new orders, progressively slow down
      if (newTransfers.length === 0) {
        idleCyclesRef.current++;
        if (idleCyclesRef.current >= IDLE_SLOWER_AFTER) {
          currentIntervalRef.current = POLL_MS_SLOWER;
        } else if (idleCyclesRef.current >= IDLE_SLOW_AFTER) {
          currentIntervalRef.current = POLL_MS_SLOW;
        }
      }
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }, [fetchTransfers]);

  const triggerWakeUp = useCallback(async () => {
    const merchantHubUrl = getMerchantHubUrl().replace(/\/$/, '');
    const shopId = 'indies-current-orders';
    try {
      const res = await fetch(`${merchantHubUrl}/api/wake-up`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId }) });
      if (res.ok) {
        const data = await res.json();
        if (data.shouldStartPolling) {
          setIsPoller(true);
          setPollerStatus(`Poller actif (${shopId})`);
          if (!pollerInterval.current) { triggerPoll(); pollerInterval.current = setInterval(triggerPoll, 6000); }
        } else {
          setIsPoller(false);
          setPollerStatus(`Poller: ${data.poller || 'inconnu'}`);
          if (pollerInterval.current) { clearInterval(pollerInterval.current); pollerInterval.current = null; }
        }
      }
    } catch (err: any) { console.error('[WAKE-UP] Error:', err.message); }
  }, [triggerPoll]);

  // --- Polling orchestrator: start/stop all loops based on pause state ---

  const clearAllTimers = useCallback(() => {
    if (pollInterval.current) { clearTimeout(pollInterval.current); pollInterval.current = null; }
    if (pollerInterval.current) { clearInterval(pollerInterval.current); pollerInterval.current = null; }
    if (wakeUpInterval.current) { clearInterval(wakeUpInterval.current); wakeUpInterval.current = null; }
    reminderIntervalsRef.current.forEach((id) => clearInterval(id));
    reminderIntervalsRef.current.clear();
  }, []);

  const startPolling = useCallback(() => {
    if (pausedRef.current) return;
    triggerWakeUp();
    wakeUpInterval.current = setInterval(triggerWakeUp, WAKE_UP_MS);
    function scheduleNext() {
      pollInterval.current = setTimeout(async () => {
        await syncAndReload();
        if (!pausedRef.current) scheduleNext();
      }, currentIntervalRef.current);
    }
    syncAndReload();
    scheduleNext();
  }, [triggerWakeUp, syncAndReload]);

  const pausePolling = useCallback((reason: PauseReason) => {
    pausedRef.current = true;
    setPauseReason(reason);
    clearAllTimers();
    console.warn(`[CO] Polling paused: ${reason}`);
  }, [clearAllTimers]);

  const resumePolling = useCallback(() => {
    pausedRef.current = false;
    setPauseReason('none');
    idleCyclesRef.current = 0;
    currentIntervalRef.current = POLL_MS;
    console.warn('[CO] Polling resumed');
    startPolling();
  }, [startPolling]);

  // Layer 1: Opening-hours gate
  useEffect(() => {
    function checkHours() {
      const open = isRestaurantOpenNow();
      if (!open && !pausedRef.current) {
        pausePolling('closed');
      } else if (open && pausedRef.current && pauseReason === 'closed') {
        resumePolling();
      }
    }
    checkHours();
    hoursCheckTimerRef.current = setInterval(checkHours, HOURS_CHECK_MS);
    return () => { if (hoursCheckTimerRef.current) clearInterval(hoursCheckTimerRef.current); };
  }, [pausePolling, resumePolling, pauseReason]);

  // Layer 3: Page Visibility API
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        if (!pausedRef.current) pausePolling('hidden');
      } else {
        if (pauseReason === 'hidden') {
          if (isRestaurantOpenNow()) {
            resumePolling();
          } else {
            setPauseReason('closed');
          }
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [pausePolling, resumePolling, pauseReason]);

  // Initial start
  useEffect(() => {
    if (isRestaurantOpenNow() && !document.hidden) {
      startPolling();
    } else if (!isRestaurantOpenNow()) {
      pausedRef.current = true;
      setPauseReason('closed');
    } else {
      pausedRef.current = true;
      setPauseReason('hidden');
    }
    return () => clearAllTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFulfill = async (_memo: string, allTransferIds: string[]) => {
    try {
      for (const transferId of allTransferIds) {
        const res = await fetch(`/api/fulfill`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: transferId }) });
        // 404 = already fulfilled or not in local DB (e.g. grouped EURO transfer) — not an error
        if (!res.ok && res.status !== 404) {
          console.warn(`[FULFILL] Unexpected response ${res.status} for transfer ${transferId}`);
          toast.warn('La réponse du serveur est inattendue, il s\'agit probablement d\'une erreur temporaire, veuillez attendre quelques secondes et réessayer', { autoClose: 8000 });
          return;
        }
        const intervalId = reminderIntervalsRef.current.get(transferId);
        if (intervalId) { clearInterval(intervalId); reminderIntervalsRef.current.delete(transferId); }
      }
      setTransfers(prev => prev.filter(t => !allTransferIds.includes(t.id)));
      toast.success(`Commande satisfaite! (${allTransferIds.length} transfert(s))`, { autoClose: 3000 });
    } catch (err) { console.error('Failed to mark as fulfilled:', err); toast.error('Erreur lors de la satisfaction de la commande'); }
  };

  function formatDateTime(timestamp: string): { date: string; time: string } {
    const dateObj = new Date(timestamp);
    const date = dateObj.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: '2-digit' });
    const time = dateObj.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
    return { date, time };
  }

  return (
    <div className={`container ${lato.className}`}>
      <ToastContainer position="top-right" />
      <iframe ref={printIframeRef} style={{ position: 'absolute', top: '-1000px', left: '-1000px', width: '0', height: '0' }} title="print-frame" />
      <div className="nav-header">
        <h1>Commandes en cours</h1>
        <button onClick={toggleAudio} className={`nav-button ${canPlayAudio ? 'audio-off-button' : 'unlock-audio-button'}`}>
          {canPlayAudio ? '🔇 Couper le son' : '🔔 Activer le son'}
        </button>
        <div className="nav-buttons">
          <a href="/admin" className="nav-button dashboard-button">🏠 Tableau de bord</a>
          <a href="/admin/history" className="nav-button history-button">📜 Historique</a>
        </div>
      </div>
      {pauseReason === 'closed' && (
        <div className="pause-banner pause-closed">
          <strong>Restaurant ferm&eacute;</strong> &mdash; le polling est en pause.
          Il reprendra automatiquement &agrave; l&rsquo;ouverture.
        </div>
      )}
      {pauseReason === 'hidden' && (
        <div className="pause-banner pause-hidden">
          <strong>Onglet en arri&egrave;re-plan</strong> &mdash; le polling est en pause.
          Il reprendra quand cet onglet redeviendra visible.
        </div>
      )}
      {error && <div className="error-box">Erreur: {error}</div>}
      {isDev && (lastSyncInfo || pollerStatus) && (
        <div className="sync-info">
          {pollerStatus && <span className={isPoller ? 'poller-active' : 'poller-passive'}>{pollerStatus}</span>}
          {pollerStatus && lastSyncInfo && ' | '}
          {lastSyncInfo}
        </div>
      )}
      {loading && <p>Chargement des commandes...</p>}
      {!loading && (
        <div className="order-count-prominent">
          {groupedOrders.length === 0 ? "Pas de commandes en attente" : (
            <>{immediateOrders.length} commande{immediateOrders.length !== 1 ? 's' : ''} en cours
              {delayedOrders.length > 0 && <span className="delayed-count"> + {delayedOrders.length} différée{delayedOrders.length !== 1 ? 's' : ''}</span>}
              {isDev && groupedOrders.length !== transfers.length && <span className="dev-transfers-total">({transfers.length} transferts)</span>}
            </>
          )}
        </div>
      )}
      {!loading && groupedOrders.length > 0 && (
        <div className="orders-layout">
          {/* Main column — immediate orders */}
          <div className="orders-main">
            <ul>
              {immediateOrders.map(groupedOrder => {
                const { memo, primaryTransfer, hbdTransfer, allTransferIds } = groupedOrder;
                const transfer = primaryTransfer;
                const now = new Date();
                const { date, time } = formatDateTime(transfer.received_at);
                const timing = getOrderTiming(memo);

                // For delayed orders: baseline is the target time, not received_at
                let isLate = false;
                if (timing?.time) {
                  const [th, tm] = timing.time.split('h').map(Number);
                  let target: Date;
                  if (timing.date) {
                    const [y, mo, d] = timing.date.split('-').map(Number);
                    target = new Date(y, mo - 1, d, th, tm, 0);
                  } else {
                    target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), th, tm, 0);
                  }
                  isLate = (now.getTime() - target.getTime()) / 1000 > 600;
                } else {
                  const receivedTime = new Date(transfer.received_at);
                  isLate = (now.getTime() - receivedTime.getTime()) / 1000 > 600;
                }

                return (
                  <li key={primaryTransfer.id} className={transfer.isCallWaiter ? 'call-waiter-item' : (isLate ? 'late-order-card' : '')}>
                    {timing && <div className={`promoted-badge ${timing.type === 'pickup' ? 'promoted-pickup' : 'promoted-dinein'}`}>⏰ {timing.type === 'pickup' ? 'À emporter' : 'Sur place'} {timing.time}</div>}
                    <div className="order-section">
                      <p className="section-label">Commande:</p>
                      <div className={`order-details-container ${transfer.isCallWaiter ? 'call-waiter-content' : ''}`}>
                        {transfer.parsedMemo && transfer.parsedMemo.length > 0 ? (
                          transfer.parsedMemo.map((line, idx) => (
                            <React.Fragment key={idx}>
                              {line.type === 'item' ? (
                                <div className="order-item-line">
                                  <span className="order-item-quantity">{line.quantity}</span>
                                  <span className={`order-item-description ${line.categoryType === 'drink' ? 'drink-item' : line.categoryType === 'dish' ? 'dish-item' : ''}`}>
                                    {line.description}
                                    {line.comment && <span className="order-item-comment"> — {line.comment}</span>}
                                  </span>
                                </div>
                              ) : line.type === 'separator' ? <hr className="order-separator" /> : (
                                <div className="order-item-description full-width-raw">{line.content}</div>
                              )}
                            </React.Fragment>
                          ))
                        ) : <div className="order-item-description">{transfer.memo}</div>}
                      </div>
                    </div>
                    <div className="order-info-grid">
                      <div className="info-item"><span className="info-label">Table:</span><strong>{getTable(transfer.memo) || '-'}</strong></div>
                      <div className={`info-item ${isLate ? 'late-order' : ''}`}><span className="info-label">Heure:</span><strong className={isLate ? 'late-time' : 'normal-time'}>{time}</strong></div>
                      <div className="info-item"><span className="info-label">Client:</span><strong className="account-name">@{transfer.from_account || 'inconnu'}</strong></div>
                      {isDev && (
                        <>
                          <div className="info-item"><span className="info-label">Montant:</span><div><strong>{transfer.amount} {transfer.symbol}</strong>{hbdTransfer && <div className="secondary-amount">+ {hbdTransfer.amount} {hbdTransfer.symbol}</div>}</div></div>
                          <div className="info-item"><span className="info-label">Identifiant:</span><strong className="identifier-text">{getIdentifier(memo) || '-'}</strong></div>
                          <div className="info-item"><span className="info-label">Compte destinataire:</span><strong className="account-name">@{transfer.to_account || '-'}</strong></div>
                        </>
                      )}
                    </div>
                    {isDev && (
                      <p className="debug-info">ID: <strong>{allTransferIds.join(', ')}</strong>{allTransferIds.length > 1 && <span className="grouped-label">({allTransferIds.length} transferts groupés)</span>}</p>
                    )}
                    {!isDev && <p className="debug-info"><span className="date-label">Date: {date}</span></p>}
                    <div className="action-buttons">
                      <button onClick={() => printOrder(transfer)} className="print-button">🖨️ Imprimer</button>
                      <button onClick={() => handleFulfill(memo, allTransferIds)} className="fulfill-button">Servi !</button>
                    </div>
                  </li>
                );
              })}
              {immediateOrders.length === 0 && <li className="no-immediate">Aucune commande immédiate</li>}
            </ul>
          </div>

          {/* Sidebar — delayed orders */}
          {delayedOrders.length > 0 && (
            <div className="orders-delayed">
              <div className="delayed-header">⏳ En attente ({delayedOrders.length})</div>
              {delayedOrders.map(delayedOrder => {
                const { memo, primaryTransfer, allTransferIds, timing, targetMs } = delayedOrder;
                const transfer = primaryTransfer;
                const isPickup = timing.type === 'pickup';
                const table = getTable(memo);
                const minutesUntil = Math.round((targetMs - Date.now()) / 60000);

                return (
                  <div key={primaryTransfer.id} className={`delayed-card ${isPickup ? 'delayed-pickup' : 'delayed-dinein'}`}>
                    <div className="delayed-card-header">
                      <span className="delayed-time-badge">{isPickup ? '📦' : '🍽️'} {timing.date && timing.date !== localToday() ? formatDateShortFr(timing.date) + ' ' : ''}{timing.time}</span>
                      <span className="delayed-countdown">{minutesUntil <= 0 ? 'bientôt' : minutesUntil < 120 ? `${minutesUntil}min` : minutesUntil < 1440 ? `${Math.round(minutesUntil / 60)}h` : `${Math.round(minutesUntil / 1440)}j`}</span>
                    </div>
                    <div className="delayed-type">{isPickup ? 'À emporter' : 'Sur place'}</div>
                    <div className="delayed-items">
                      {transfer.parsedMemo && transfer.parsedMemo.map((line, idx) => (
                        line.type === 'item' ? (
                          <div key={idx} className="delayed-item-line">
                            <span>{line.quantity}</span> <span>{line.description}{line.comment && <em> — {line.comment}</em>}</span>
                          </div>
                        ) : null
                      ))}
                    </div>
                    {!isPickup && table && (
                      <div className="delayed-table">Table {table} <span className="delayed-table-hint">?</span></div>
                    )}
                    <div className="delayed-client">@{transfer.from_account}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <style jsx>{`
        .container { max-width: 900px; margin: 0 auto; padding: 10px 20px; color: #333; background: #f9f9f9; color-scheme: light; }
        .nav-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 12px; }
        h1 { margin: 0; color: #111; font-size: 1.5rem; }
        .nav-buttons { display: flex; gap: 8px; }
        .nav-button { background: #0070f3; color: white; border: none; padding: 6px 12px; cursor: pointer; border-radius: 6px; font-size: 13px; font-weight: 500; text-decoration: none; display: inline-block; transition: all 0.2s; }
        .nav-button:hover { background: #005bb5; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .unlock-audio-button { background: #8B0000; }
        .unlock-audio-button:hover { background: #600000; }
        .audio-off-button { background: #6c757d; }
        .audio-off-button:hover { background: #5a6268; }
        .dashboard-button { background: #666; }
        .dashboard-button:hover { background: #444; }
        .history-button { background: #28a745; }
        .history-button:hover { background: #218838; }
        .order-count-prominent { font-size: 16px; font-weight: bold; color: #000; margin-bottom: 8px; }
        .dev-transfers-total { margin-left: 8px; font-size: 12px; font-weight: normal; color: #0070f3; }
        .pause-banner { padding: 10px 14px; margin-bottom: 10px; border-radius: 6px; font-size: 13px; }
        .pause-closed { background: #fff8e1; border: 1px solid #ffcc02; color: #7a6100; }
        .pause-hidden { background: #e3f2fd; border: 1px solid #90caf9; color: #1565c0; }
        .error-box { background: #fee; border: 1px solid #f00; color: #900; padding: 8px; margin-bottom: 10px; border-radius: 5px; font-size: 14px; }
        .sync-info { font-size: 11px; color: #666; margin-bottom: 8px; padding: 4px 8px; background: #f8f9fa; border-radius: 4px; display: inline-block; }
        .poller-active { color: #008000; font-weight: bold; }
        .poller-passive { color: #666; }
        ul { list-style: none; padding: 0; }
        li { border: 1px solid #ddd; padding: 12px 16px; margin-bottom: 12px; border-radius: 8px; background: #fff; color: #333; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .late-order-card { background: #fee; border: 2px solid #f44; animation: pulse-late 2s infinite alternate; }
        @keyframes pulse-late { from { border-color: #f44; } to { border-color: #f88; } }
        .order-section { margin-bottom: 8px; }
        .section-label { font-size: 13px; font-weight: 600; color: #666; margin-bottom: 4px; }
        .order-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 12px; margin-bottom: 8px; font-size: 13px; }
        .info-item { display: flex; flex-direction: column; gap: 1px; }
        .info-label { color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .account-name { font-family: monospace; font-size: 12px; color: #0070f3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .identifier-text { font-family: monospace; font-size: 11px; color: #e67e00; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .secondary-amount { font-size: 11px; color: #666; }
        .late-time { color: #dc3c3c; }
        .normal-time { color: #28a745; }
        .grouped-label, .date-label { margin-left: 8px; color: #888; font-weight: normal; font-size: 10px; }
        .action-buttons { display: flex; gap: 8px; margin-top: 8px; }
        button { background: #0070f3; color: white; border: none; padding: 6px 12px; cursor: pointer; border-radius: 6px; font-size: 13px; font-weight: 500; transition: all 0.2s; }
        button:hover { background: #005bb5; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .fulfill-button { flex: 1; background: #0070f3; }
        .fulfill-button:hover { background: #005bb5; }
        .print-button { background: #6c757d; }
        .print-button:hover { background: #5a6268; }
        .late-order { color: rgb(220, 60, 60); font-weight: bold; }
        .debug-info { font-size: 10px; color: #aaa; margin-top: 4px; border-top: 1px solid #eee; padding-top: 4px; }
        .order-details-container { margin-left: 5px; margin-bottom: 4px; }
        .order-item-line { display: grid; grid-template-columns: 25px 1fr; gap: 5px; align-items: baseline; margin-bottom: 1px; }
        .order-item-quantity { font-weight: bold; color: #555; text-align: right; font-size: 14px; }
        .order-item-description { font-weight: bold; color: #333; font-size: 14px; }
        .order-item-comment { font-weight: normal; font-style: italic; color: #666; font-size: 12px; }
        .drink-item { color: #008000; }
        .dish-item { color: #8B0000; }
        .full-width-raw { grid-column: span 2; }
        .order-separator { border: none; border-top: 1px dashed #ccc; margin: 6px 0; grid-column: span 2; }
        .call-waiter-item { background-color: #ffe0e0; border-color: red; animation: pulse-red 1.5s infinite alternate; }
        .call-waiter-content .order-item-quantity, .call-waiter-content .order-item-description, .call-waiter-content .full-width-raw { color: red; font-weight: bold; }
        @keyframes pulse-red { 0% { box-shadow: 0 0 5px rgba(255, 0, 0, 0.5); transform: scale(1); } 100% { box-shadow: 0 0 20px rgba(255, 0, 0, 1); transform: scale(1.02); } }

        /* Two-column layout */
        .orders-layout { display: flex; gap: 16px; align-items: flex-start; }
        .orders-main { flex: 3; min-width: 0; }
        .orders-delayed { flex: 1; min-width: 200px; max-width: 260px; position: sticky; top: 10px; }
        .delayed-count { color: #6b7c3f; font-size: 13px; font-weight: 600; }
        .delayed-header { font-size: 14px; font-weight: 700; color: #444; background: #eee; margin-bottom: 10px; padding: 6px 10px; border-radius: 6px; text-align: center; }
        .no-immediate { text-align: center; color: #777; font-style: italic; padding: 20px; border: 1px dashed #ccc; border-radius: 8px; background: #fff; }

        /* Promoted delayed orders badge (now in main column) */
        .promoted-badge { font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 4px; margin-bottom: 6px; display: inline-block; color: #fff; }
        .promoted-pickup { background: #6b7c3f; }
        .promoted-dinein { background: #6b3fa0; }

        /* Delayed order cards — explicit colors on every element for theme safety */
        .delayed-card { border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
        .delayed-pickup { background: #6b7c3f; color: #fff; }
        .delayed-dinein { background: #6b3fa0; color: #fff; }
        .delayed-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; color: #fff; }
        .delayed-time-badge { font-size: 16px; font-weight: 800; color: #fff; }
        .delayed-countdown { font-size: 11px; color: #fff; opacity: 0.85; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 10px; }
        .delayed-type { font-size: 11px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .delayed-items { font-size: 12px; color: #fff; margin-bottom: 6px; }
        .delayed-item-line { margin-bottom: 2px; color: #fff; }
        .delayed-item-line em { color: rgba(255,255,255,0.8); font-size: 11px; }
        .delayed-table { font-size: 12px; color: rgba(255,255,255,0.9); margin-bottom: 4px; }
        .delayed-table-hint { display: inline-block; background: rgba(255,255,255,0.3); color: #fff; font-weight: 800; font-size: 10px; width: 16px; height: 16px; line-height: 16px; text-align: center; border-radius: 50%; margin-left: 4px; }
        .delayed-client { font-size: 11px; font-family: monospace; color: rgba(255,255,255,0.75); margin-bottom: 6px; }
        .delayed-actions { display: flex; gap: 6px; }
        .delayed-print-btn { background: rgba(255,255,255,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.3); padding: 3px 8px; font-size: 12px; border-radius: 4px; cursor: pointer; }
        .delayed-print-btn:hover { background: rgba(255,255,255,0.35); color: #fff; transform: none; box-shadow: none; }
        .delayed-fulfill-btn { flex: 1; background: rgba(255,255,255,0.25); color: #fff; border: 1px solid rgba(255,255,255,0.4); padding: 3px 8px; font-size: 12px; font-weight: 600; border-radius: 4px; cursor: pointer; }
        .delayed-fulfill-btn:hover { background: rgba(255,255,255,0.4); color: #fff; transform: none; box-shadow: none; }

        /* Responsive: stack vertically on narrow screens, delayed at bottom */
        @media (max-width: 768px) {
          .orders-layout { flex-direction: column; }
          .orders-delayed { order: 1; max-width: none; position: static; }
          .orders-main { order: 0; }
        }
      `}</style>
    </div>
  );
}
