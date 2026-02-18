'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { getTable, hydrateMemo, HydratedOrderLine } from '@/lib/utils';
import { MenuData } from '@/lib/data/menu';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';
import { Lato } from 'next/font/google';

const lato = Lato({
  weight: ['300', '400', '700'],
  subsets: ['latin'],
});

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

// Grouped order for display (handles dual-currency transfers from Flows 5, 6, 7)
interface GroupedOrder {
  memo: string;
  transfers: Transfer[];
  primaryTransfer: Transfer; // EURO transfer (preferred) or first transfer
  hbdTransfer?: Transfer; // HBD transfer if present
  allTransferIds: string[]; // All transfer IDs for this order
}

function getMerchantHubUrl(): string {
  return process.env.NEXT_PUBLIC_MERCHANT_HUB_URL || 'https://merchant-hub-theta.vercel.app';
}

export default function CurrentOrdersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transmittedToKitchen, setTransmittedToKitchen] = useState<Map<string, string>>(new Map());
  const [lastSyncInfo, setLastSyncInfo] = useState<string>('');
  const [isPoller, setIsPoller] = useState(false);
  const [pollerStatus, setPollerStatus] = useState<string>('');
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const pollerInterval = useRef<NodeJS.Timeout | null>(null);

  // Audio state and refs
  const [canPlayAudio, setCanPlayAudio] = useState(false);
  const bell1Ref = useRef<HTMLAudioElement | null>(null);
  const bell2Ref = useRef<HTMLAudioElement | null>(null);
  const canPlayAudioRef = useRef(canPlayAudio);
  const reminderIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Keep audio ref in sync
  useEffect(() => { canPlayAudioRef.current = canPlayAudio; }, [canPlayAudio]);

  // Initialize audio elements once
  useEffect(() => {
    if (typeof window !== 'undefined') {
      bell1Ref.current = new Audio('/sounds/police-siren.mp3');
      bell1Ref.current.load();
      console.log('[AUDIO] Police siren file preloaded');
      bell2Ref.current = new Audio('/sounds/chime-2.mp3');
      bell2Ref.current.load();
      console.log('[AUDIO] Chime file preloaded');
    }
  }, []);

  // Unlock audio function
  const unlockAudio = () => {
    if (!canPlayAudio) {
      setCanPlayAudio(true);
      console.log('[AUDIO] Audio unlocked');
    }
  };

  // Play both bell sounds
  const playBellSounds = useCallback(() => {
    if (canPlayAudio && bell1Ref.current && bell2Ref.current) {
      bell1Ref.current.currentTime = 0;
      bell1Ref.current.play().catch(e => console.error('[AUDIO] Error playing police siren:', e));
      bell2Ref.current.currentTime = 0;
      bell2Ref.current.play().catch(e => console.error('[AUDIO] Error playing chime:', e));
      console.log('[AUDIO] Playing bell sounds for new order');
    } else {
      console.log('[AUDIO] Audio not unlocked or not initialized');
    }
  }, [canPlayAudio]);

  // Play individual sounds for testing
  const playBell1Sound = useCallback(() => {
    if (canPlayAudio && bell1Ref.current) {
      bell1Ref.current.currentTime = 0;
      bell1Ref.current.play().catch(e => console.error('[AUDIO] Error playing bell:', e));
    }
  }, [canPlayAudio]);

  const playChimeSound = useCallback(() => {
    if (canPlayAudio && bell2Ref.current) {
      bell2Ref.current.currentTime = 0;
      bell2Ref.current.play().catch(e => console.error('[AUDIO] Error playing chime:', e));
    }
  }, [canPlayAudio]);

  // Fetch menu data for hydration
  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch('/api/menu');
        const data = await res.json();
        console.log('[MENU] Menu data loaded:', data ? `${data.dishes?.length || 0} dishes` : 'null');
        setMenuData(data);
      } catch (err) {
        console.error('Failed to fetch menu:', err);
      }
    }
    fetchMenu();
  }, []);

  // Re-hydrate transfers when menuData loads (only runs once when menuData first becomes available)
  useEffect(() => {
    if (menuData && transfers.length > 0) {
      console.log('[MENU] Re-hydrating', transfers.length, 'transfers now that menuData is available');
      const rehydrated = hydrateTransfers(transfers);
      setTransfers(rehydrated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuData]); // Intentionally only depends on menuData, not transfers or hydrateTransfers

  // Hydrate transfers with menu data
  const hydrateTransfers = useCallback((rawTransfers: any[]): Transfer[] => {
    return rawTransfers.map(tx => {
      let parsedMemo: HydratedOrderLine[] = [];
      let isCallWaiter = false;

      const tableIndex = tx.memo?.lastIndexOf('TABLE ') ?? -1;
      const memoPrefix = tableIndex !== -1
        ? tx.memo.substring(0, tableIndex).trim().toLowerCase()
        : (tx.memo || '').toLowerCase();

      if (memoPrefix.includes('appel')) {
        isCallWaiter = true;
      }

      const orderContent = tableIndex !== -1
        ? tx.memo.substring(0, tableIndex).trim()
        : (tx.memo || '');

      // Try to parse existing parsedMemo or hydrate fresh
      if (tx.parsedMemo) {
        try {
          parsedMemo = typeof tx.parsedMemo === 'string'
            ? JSON.parse(tx.parsedMemo)
            : tx.parsedMemo;
        } catch {
          if (menuData && !isCallWaiter) {
            try {
              parsedMemo = hydrateMemo(orderContent, menuData);
            } catch {
              parsedMemo = [{ type: 'raw', content: orderContent }];
            }
          } else {
            parsedMemo = [{ type: 'raw', content: orderContent }];
          }
        }
      } else if (menuData && !isCallWaiter) {
        try {
          console.log('[HYDRATE] Attempting to hydrate:', orderContent, 'with menuData:', !!menuData);
          parsedMemo = hydrateMemo(orderContent, menuData);
          console.log('[HYDRATE] Success:', parsedMemo);
        } catch (err) {
          console.error('[HYDRATE] Failed to hydrate:', orderContent, 'Error:', err);
          parsedMemo = [{ type: 'raw', content: orderContent }];
        }
      } else {
        console.log('[HYDRATE] Skipping hydration - menuData:', !!menuData, 'isCallWaiter:', isCallWaiter);
        parsedMemo = [{ type: 'raw', content: orderContent }];
      }

      return { ...tx, parsedMemo, isCallWaiter };
    });
  }, [menuData]);

  // Load unfulfilled transfers from database
  const loadTransfers = useCallback(async () => {
    try {
      const res = await fetch('/api/transfers/unfulfilled');
      if (res.ok) {
        const data = await res.json();
        const hydrated = hydrateTransfers(data.transfers || []);
        setTransfers(hydrated);
        console.log(`[LOAD] ${hydrated.length} unfulfilled transfers from DB`);
      }
    } catch (err) {
      console.error('Failed to load transfers:', err);
    }
  }, [hydrateTransfers]);

  // Group transfers by memo to handle dual-currency transfers (EURO + HBD)
  // One order can have multiple blockchain transfers (e.g., Flow 6: EURO + HBD)
  const groupedOrders = useMemo((): GroupedOrder[] => {
    const groups = new Map<string, Transfer[]>();

    // Group transfers by memo (unique order identifier)
    transfers.forEach(transfer => {
      const key = transfer.memo || `no-memo-${transfer.id}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(transfer);
    });

    // Convert groups to array of GroupedOrder objects
    return Array.from(groups.entries()).map(([memo, transfers]) => {
      // Prefer EURO as primary display, fallback to first transfer
      const primaryTransfer = transfers.find(t => t.symbol === 'EURO') || transfers[0];
      const hbdTransfer = transfers.find(t => t.symbol === 'HBD');

      return {
        memo,
        transfers,
        primaryTransfer,
        hbdTransfer,
        allTransferIds: transfers.map(t => t.id),
      };
    });
  }, [transfers]);

  // Trigger HAF poll on merchant-hub (only called if this page is the elected poller)
  const triggerPoll = useCallback(async () => {
    const merchantHubUrl = getMerchantHubUrl().replace(/\/$/, '');
    try {
      const pollRes = await fetch(`${merchantHubUrl}/api/poll`);
      if (pollRes.ok) {
        const pollData = await pollRes.json();
        console.log(`[POLL] HAF poll: ${pollData.transfersFound} transfers found`);
      } else {
        console.warn(`[POLL] HAF poll failed: ${pollRes.status}`);
      }
    } catch (err: any) {
      console.error('[POLL] HAF poll error:', err.message);
    }
  }, []);

  // Ref to track previous transfers for new order detection
  const previousTransfersRef = useRef<Set<string>>(new Set());

  // Sync from merchant-hub and reload (consume from Redis stream, insert to DB, ACK)
  const syncAndReload = useCallback(async () => {
    try {
      // Consume from Redis stream, insert to DB, ACK
      const syncRes = await fetch('/api/transfers/sync-from-merchant-hub', {
        method: 'POST',
      });

      if (syncRes.ok) {
        const syncData = await syncRes.json();
        if (syncData.inserted > 0) {
          toast.info(`${syncData.inserted} nouvelle(s) commande(s)!`, { autoClose: 3000 });
        }
        setLastSyncInfo(`Sync: ${syncData.inserted || 0} new, ${syncData.acked || 0} acked`);
        console.log(`[SYNC]`, syncData);
      }

      // Reload from database
      await loadTransfers();

      // After loading, check for truly new transfers and play sounds
      setTransfers(prev => {
        const newTransfers = prev.filter(t => !previousTransfersRef.current.has(t.id));

        if (newTransfers.length > 0 && canPlayAudioRef.current) {
          console.log(`[AUDIO] ${newTransfers.length} new transfer(s) detected, playing bells`);
          playBellSounds();

          // Start 30-second reminder intervals for each new transfer
          newTransfers.forEach(tx => {
            const intervalId = setInterval(() => {
              if (canPlayAudioRef.current) {
                playBellSounds();
                console.log(`[AUDIO] Reminder bell for order ${tx.id}`);
              }
            }, 30000); // 30 seconds
            reminderIntervalsRef.current.set(tx.id, intervalId);
            console.log(`[AUDIO] Started reminder interval for order ${tx.id}`);
          });
        }

        // Update previousTransfersRef with current transfer IDs
        previousTransfersRef.current = new Set(prev.map(t => t.id));

        return prev;
      });

    } catch (err: any) {
      console.error('[SYNC] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadTransfers, playBellSounds]);

  // Wake-up: Attempt to become the poller on mount
  useEffect(() => {
    const merchantHubUrl = getMerchantHubUrl().replace(/\/$/, '');
    const shopId = 'indies-current-orders';

    async function wakeUp() {
      try {
        console.log('[WAKE-UP] Attempting to register as poller...');
        const res = await fetch(`${merchantHubUrl}/api/wake-up`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopId }),
        });

        if (res.ok) {
          const data = await res.json();
          console.log('[WAKE-UP] Response:', data);

          if (data.shouldStartPolling) {
            // This page won the election - start polling HAF every 6 seconds
            setIsPoller(true);
            setPollerStatus(`Poller actif (${shopId})`);
            toast.success('Cette page est le poller actif!', { autoClose: 3000 });

            // Start polling HAF immediately
            triggerPoll();

            // Continue polling every 6 seconds
            pollerInterval.current = setInterval(triggerPoll, 6000);
          } else {
            // Another page is polling - just consume from stream
            setIsPoller(false);
            setPollerStatus(`Poller: ${data.poller || 'inconnu'}`);
            console.log(`[WAKE-UP] Another page is polling: ${data.poller}`);
          }
        } else {
          console.error('[WAKE-UP] Failed:', res.status);
          setPollerStatus('Wake-up échoué');
        }
      } catch (err: any) {
        console.error('[WAKE-UP] Error:', err.message);
        setPollerStatus('Erreur wake-up');
      }
    }

    wakeUp();

    // Cleanup poller interval on unmount
    return () => {
      if (pollerInterval.current) {
        clearInterval(pollerInterval.current);
      }
    };
  }, [triggerPoll]);

  // Sync from Redis stream every 6 seconds (all pages do this, regardless of poller status)
  useEffect(() => {
    syncAndReload(); // Initial sync and load

    // Sync every 6 seconds
    pollInterval.current = setInterval(syncAndReload, 6000);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
      // Clear all reminder intervals to prevent memory leaks
      if (reminderIntervalsRef.current) {
        reminderIntervalsRef.current.forEach((intervalId) => {
          clearInterval(intervalId);
        });
        reminderIntervalsRef.current.clear();
        console.log('[AUDIO] Cleared all reminder intervals on unmount');
      }
    };
  }, [syncAndReload]);

  // Transmit to kitchen (local state only)
  const handleTransmitToKitchen = (id: string) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
    });

    setTransmittedToKitchen(prev => {
      const updated = new Map(prev);
      updated.set(id, timestamp);
      return updated;
    });

    toast.success('Transmis en cuisine!', {
      autoClose: 3000,
      toastId: `kitchen-${id}`,
    });
  };

  // Mark order as fulfilled (fulfills ALL transfers with the same memo)
  const handleFulfill = async (memo: string, allTransferIds: string[]) => {
    console.log(`[FULFILL] Marking ${allTransferIds.length} transfer(s) as fulfilled for memo:`, memo);

    try {
      // Fulfill all transfers with this memo (handles dual-currency EURO + HBD)
      for (const transferId of allTransferIds) {
        const res = await fetch(`/api/fulfill`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: transferId }),
        });

        if (!res.ok) {
          throw new Error(`Failed to fulfill transfer ${transferId}`);
        }

        // Clear reminder interval for this transfer
        const intervalId = reminderIntervalsRef.current.get(transferId);
        if (intervalId) {
          clearInterval(intervalId);
          reminderIntervalsRef.current.delete(transferId);
          console.log(`[AUDIO] Cleared reminder interval for order ${transferId}`);
        }
      }

      // Remove all fulfilled transfers from state
      setTransfers(prev => prev.filter(t => !allTransferIds.includes(t.id)));

      // Remove all transfer IDs from transmitted tracking
      setTransmittedToKitchen(prev => {
        const updated = new Map(prev);
        allTransferIds.forEach(id => updated.delete(id));
        return updated;
      });

      toast.success(`Commande satisfaite! (${allTransferIds.length} transfert(s))`, { autoClose: 3000 });
    } catch (err) {
      console.error('Failed to mark as fulfilled:', err);
      toast.error('Erreur lors de la satisfaction de la commande');
    }
  };

  // Helper to format order content for display
  function getOrderDisplayContent(memoLines: HydratedOrderLine[]): string {
    if (memoLines.length === 0) return '';
    if (memoLines[0].type === 'raw') return memoLines[0].content;

    return memoLines
      .map(line => {
        if (line.type === 'item') {
          return `${line.quantity > 0 ? line.quantity + ' ' : ''}${line.description}`;
        }
        return '';
      })
      .filter(Boolean)
      .join(', ');
  }

  // Extract distriate identifier from memo (e.g., "kcs-inno-xxxx-yyyy")
  function getIdentifier(memo: string): string | null {
    const identifierMatch = memo.match(/[a-z]{3}-inno-[a-z0-9]{4}-[a-z0-9]{4}/i);
    return identifierMatch ? identifierMatch[0] : null;
  }

  // Format date and time separately
  function formatDateTime(timestamp: string): { date: string; time: string } {
    const dateObj = new Date(timestamp);
    const date = dateObj.toLocaleDateString('fr-FR', {
      timeZone: 'Europe/Paris',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const time = dateObj.toLocaleTimeString('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
    });
    return { date, time };
  }

  return (
    <div className={`container ${lato.className}`}>
      <ToastContainer position="top-right" />

      {/* Navigation Header */}
      <div className="nav-header">
        <h1>Commandes en cours</h1>
        <div className="nav-buttons">
          <a href="/admin" className="nav-button dashboard-button">
            🏠 Tableau de bord
          </a>
          <a href="/admin/history" className="nav-button history-button">
            📜 Historique
          </a>
        </div>
      </div>

      {error && (
        <div className="error-box">
          Erreur: {error}
        </div>
      )}

      {(lastSyncInfo || pollerStatus) && (
        <div className="sync-info">
          {pollerStatus && <span className={isPoller ? 'poller-active' : 'poller-passive'}>{pollerStatus}</span>}
          {pollerStatus && lastSyncInfo && ' | '}
          {lastSyncInfo}
        </div>
      )}

      {/* Audio control buttons */}
      <br/>
      {!canPlayAudio && (
        <button onClick={unlockAudio} className="unlock-audio-button">
          Unlock Audio
        </button>
      )}
      {canPlayAudio && (
        <>
          &nbsp;
          <button onClick={playBell1Sound} className="unlock-audio-button">
            Play Bell Sound
          </button>
          &nbsp;
          <button onClick={playChimeSound} className="unlock-audio-button">
            Play Chime Sound
          </button>
        </>
      )}
      <br/><br/>

      {loading && <p>Chargement des commandes...</p>}

      {!loading && groupedOrders.length === 0 ? (
        <p>Pas de commandes en attente</p>
      ) : (
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
          {groupedOrders.length} commande(s) en attente
          {groupedOrders.length !== transfers.length && (
            <span style={{ marginLeft: '8px', color: '#0070f3' }}>
              ({transfers.length} transfert(s) total)
            </span>
          )}
        </p>
      )}
      {!loading && groupedOrders.length > 0 && (
        <ul>
          {groupedOrders.map(groupedOrder => {
            const { memo, primaryTransfer, hbdTransfer, allTransferIds } = groupedOrder;
            const transfer = primaryTransfer; // Use primaryTransfer for compatibility with existing code

            // Compute time difference
            const now = new Date();
            const receivedTime = new Date(transfer.received_at);
            const timeDiffSeconds = (now.getTime() - receivedTime.getTime()) / 1000;
            const isLate = timeDiffSeconds > 600; // 10 minutes

            // Check if order contains dishes
            const hasDishes = !transfer.isCallWaiter && transfer.parsedMemo?.some(
              line => line.type === 'item' && line.categoryType === 'dish'
            );
            const isTransmittedToKitchen = transmittedToKitchen.has(transfer.id);
            const kitchenTransmitTime = transmittedToKitchen.get(transfer.id);

            // Extract identifier
            const identifier = getIdentifier(memo);
            const { date, time } = formatDateTime(transfer.received_at);

            return (
              <li key={primaryTransfer.id} className={transfer.isCallWaiter ? 'call-waiter-item' : (isLate ? 'late-order-card' : '')}>
                {/* Order content */}
                <div className="order-section">
                  <p className="section-label">Commande:</p>
                  <div className={`order-details-container ${transfer.isCallWaiter ? 'call-waiter-content' : ''}`}>
                    {transfer.parsedMemo && transfer.parsedMemo.length > 0 ? (
                      transfer.parsedMemo.map((line, idx) => (
                        <React.Fragment key={idx}>
                          {line.type === 'item' ? (
                            <div className="order-item-line">
                              <span className="order-item-quantity">{line.quantity}</span>
                              <span
                                className={`order-item-description ${
                                  line.categoryType === 'drink' ? 'drink-item' : line.categoryType === 'dish' ? 'dish-item' : ''
                                }`}
                              >
                                {line.description}
                              </span>
                            </div>
                          ) : line.type === 'separator' ? (
                            <hr className="order-separator" />
                          ) : (
                            <div className="order-item-description full-width-raw">{line.content}</div>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <div className="order-item-description">{transfer.memo}</div>
                    )}
                  </div>

                  {/* Kitchen transmission timestamp */}
                  {hasDishes && isTransmittedToKitchen && (
                    <p className="kitchen-transmitted">
                      Transmis en cuisine a <strong>{kitchenTransmitTime}</strong>
                    </p>
                  )}
                </div>

                {/* Order details - Two column grid */}
                <div className="order-info-grid">
                  <div className="info-item">
                    <span className="info-label">Table:</span>
                    <strong>{getTable(transfer.memo) || '-'}</strong>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Client:</span>
                    <strong className="account-name">@{transfer.from_account || 'inconnu'}</strong>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Montant:</span>
                    <div>
                      <strong>{transfer.amount} {transfer.symbol}</strong>
                      {hbdTransfer && (
                        <div className="secondary-amount">
                          + {hbdTransfer.amount} {hbdTransfer.symbol}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`info-item ${isLate ? 'late-order' : ''}`}>
                    <span className="info-label">Reçu:</span>
                    <div>
                      <strong>{date}</strong>
                      <span className="time-separator"> </span>
                      <strong className={isLate ? 'late-time' : 'normal-time'}>{time}</strong>
                    </div>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Compte destinataire:</span>
                    <strong className="account-name">@{transfer.to_account || '-'}</strong>
                  </div>
                  {identifier && (
                    <div className="info-item">
                      <span className="info-label">Identifiant:</span>
                      <strong className="identifier-text">{identifier}</strong>
                    </div>
                  )}
                </div>

                {/* Transfer IDs (debug info) */}
                <p className="debug-info">
                  ID: <strong>{allTransferIds.join(', ')}</strong>
                  {allTransferIds.length > 1 && (
                    <span className="grouped-label">
                      ({allTransferIds.length} transferts groupés)
                    </span>
                  )}
                </p>

                {/* Action buttons */}
                <div className="action-buttons">
                  {hasDishes && !isTransmittedToKitchen && (
                    <button
                      onClick={() => handleTransmitToKitchen(transfer.id)}
                      className="kitchen-button"
                    >
                      Transmettre en cuisine
                    </button>
                  )}
                  <button
                    onClick={() => handleFulfill(memo, allTransferIds)}
                    disabled={hasDishes && !isTransmittedToKitchen}
                    className={hasDishes && !isTransmittedToKitchen ? 'fulfill-button disabled-button' : 'fulfill-button'}
                  >
                    C'est parti !
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        .nav-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        h1 {
          margin: 0;
          color: #111;
        }
        .nav-buttons {
          display: flex;
          gap: 8px;
        }
        .nav-button {
          background: #0070f3;
          color: white;
          border: none;
          padding: 8px 16px;
          cursor: pointer;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          display: inline-block;
          transition: all 0.2s;
        }
        .nav-button:hover {
          background: #005bb5;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .dashboard-button {
          background: #666;
        }
        .dashboard-button:hover {
          background: #444;
        }
        .history-button {
          background: #28a745;
        }
        .history-button:hover {
          background: #218838;
        }
        .error-box {
          background: #fee;
          border: 1px solid #f00;
          color: #900;
          padding: 10px;
          margin-bottom: 15px;
          border-radius: 5px;
        }
        .sync-info {
          font-size: 12px;
          color: #666;
          margin-bottom: 10px;
        }
        .poller-active {
          color: #008000;
          font-weight: bold;
        }
        .poller-passive {
          color: #666;
        }
        ul {
          list-style: none;
          padding: 0;
        }
        li {
          border: 1px solid #ddd;
          padding: 20px;
          margin-bottom: 15px;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .late-order-card {
          background: #fee;
          border: 2px solid #f44;
          animation: pulse-late 2s infinite alternate;
        }
        @keyframes pulse-late {
          from { border-color: #f44; }
          to { border-color: #f88; }
        }
        .order-section {
          margin-bottom: 16px;
        }
        .section-label {
          font-size: 14px;
          font-weight: 600;
          color: #666;
          margin-bottom: 8px;
        }
        .order-info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px 16px;
          margin-bottom: 12px;
          font-size: 14px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .info-label {
          color: #666;
          font-size: 13px;
        }
        .account-name {
          font-family: monospace;
          font-size: 12px;
          color: #0070f3;
        }
        .identifier-text {
          font-family: monospace;
          font-size: 11px;
          color: #e67e00;
        }
        .secondary-amount {
          font-size: 12px;
          color: #666;
          margin-top: 2px;
        }
        .time-separator {
          margin: 0 8px;
        }
        .late-time {
          color: #dc3c3c;
        }
        .normal-time {
          color: #28a745;
        }
        .grouped-label {
          margin-left: 8px;
          color: #0070f3;
          font-weight: normal;
        }
        .action-buttons {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        button {
          background: #0070f3;
          color: white;
          border: none;
          padding: 8px 16px;
          cursor: pointer;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        button:hover {
          background: #005bb5;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .fulfill-button {
          flex: 1;
          background: #0070f3;
        }
        .fulfill-button:hover {
          background: #005bb5;
        }
        .kitchen-button {
          flex: 1;
          background: #ff8c00;
          color: white;
        }
        .kitchen-button:hover {
          background: #e67e00;
        }
        .disabled-button {
          background: #ccc !important;
          cursor: not-allowed;
          opacity: 0.6;
          transform: none !important;
          box-shadow: none !important;
        }
        .disabled-button:hover {
          background: #ccc !important;
        }
        .unlock-audio-button {
          background: #28a745;
          margin: 4px;
        }
        .unlock-audio-button:hover {
          background: #218838;
        }
        .kitchen-transmitted {
          color: #ff6600;
          font-weight: bold;
          margin: 10px 0;
          margin-left: 10px;
        }
        .late-order {
          color: rgb(220, 60, 60);
          font-weight: bold;
        }
        .debug-info {
          font-size: 12px;
          color: #888;
          margin-top: 5px;
        }

        /* Order details styling */
        .order-details-container {
          margin-left: 10px;
          margin-bottom: 10px;
        }
        .order-item-line {
          display: grid;
          grid-template-columns: 30px 1fr;
          gap: 5px;
          align-items: baseline;
          margin-bottom: 2px;
        }
        .order-item-quantity {
          font-weight: bold;
          color: #555;
          text-align: right;
        }
        .order-item-description {
          font-weight: bold;
          color: #333;
        }
        .drink-item {
          color: #008000;
        }
        .dish-item {
          color: #8B0000;
        }
        .full-width-raw {
          grid-column: span 2;
        }
        .order-separator {
          border: none;
          border-top: 1px dashed #ccc;
          margin: 10px 0;
          grid-column: span 2;
        }

        /* Call waiter styling */
        .call-waiter-item {
          background-color: #ffe0e0;
          border-color: red;
          animation: pulse-red 1.5s infinite alternate;
        }
        .call-waiter-content .order-item-quantity,
        .call-waiter-content .order-item-description,
        .call-waiter-content .full-width-raw {
          color: red;
          font-weight: bold;
        }

        @keyframes pulse-red {
          0% {
            box-shadow: 0 0 5px rgba(255, 0, 0, 0.5);
            transform: scale(1);
          }
          100% {
            box-shadow: 0 0 20px rgba(255, 0, 0, 1);
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  );
}
