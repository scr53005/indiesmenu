'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { getTable, hydrateMemo, HydratedOrderLine } from '@/lib/utils';
import { MenuData } from '@/lib/data/menu';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';

interface Transfer {
  id: string;
  from_account: string;
  amount: string;
  symbol: string;
  memo: string;
  parsedMemo?: HydratedOrderLine[];
  isCallWaiter?: boolean;
  received_at: string;
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

  // Fetch menu data for hydration
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
          parsedMemo = hydrateMemo(orderContent, menuData);
        } catch {
          parsedMemo = [{ type: 'raw', content: orderContent }];
        }
      } else {
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

    } catch (err: any) {
      console.error('[SYNC] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadTransfers]);

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

  // Mark transfer as fulfilled
  const handleFulfill = async (transferId: string) => {
    try {
      const res = await fetch(`/api/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transferId }),
      });

      if (res.ok) {
        setTransfers(prev => prev.filter(t => t.id !== transferId));
        setTransmittedToKitchen(prev => {
          const updated = new Map(prev);
          updated.delete(transferId);
          return updated;
        });
        toast.success('Commande satisfaite!', { autoClose: 3000 });
      }
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

  return (
    <div className="container">
      <ToastContainer position="top-right" />

      <h1>Commandes en cours</h1>

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

      {loading && <p>Chargement des commandes...</p>}

      {!loading && transfers.length === 0 ? (
        <p>Pas de commandes en attente</p>
      ) : (
        <ul>
          {transfers.map(transfer => {
            // Format received_at as CEST
            const receivedDateTime = new Date(transfer.received_at).toLocaleString('en-GB', {
              timeZone: 'Europe/Paris',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });

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

            return (
              <li key={transfer.id} className={transfer.isCallWaiter ? 'call-waiter-item' : ''}>
                <p>Commande:</p>
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

                {/* Show kitchen transmission timestamp if transmitted */}
                {hasDishes && isTransmittedToKitchen && (
                  <p className="kitchen-transmitted">
                    Transmis en cuisine a <strong>{kitchenTransmitTime}</strong>
                  </p>
                )}

                <p>
                  Pour la table: <strong>{getTable(transfer.memo) || 'inconnue'}</strong>
                </p>
                <p>
                  Client: <strong>{transfer.from_account || 'inconnu'}</strong>
                </p>
                <p>
                  Prix en {transfer.symbol}: <strong>{transfer.amount}</strong>
                </p>
                <p className={isLate ? 'late-order' : ''}>
                  Ordre recu le: <strong>{receivedDateTime}</strong>
                </p>
                <p className="debug-info">
                  ID: <strong>{transfer.id}</strong>
                </p>

                {/* Kitchen transmission button (only for orders with dishes that haven't been transmitted) */}
                {hasDishes && !isTransmittedToKitchen && (
                  <button
                    onClick={() => handleTransmitToKitchen(transfer.id)}
                    className="kitchen-button"
                  >
                    Transmettre en cuisine
                  </button>
                )}
                {' '}
                {/* Fulfill button - disabled if has dishes and not transmitted to kitchen */}
                <button
                  onClick={() => handleFulfill(transfer.id)}
                  disabled={hasDishes && !isTransmittedToKitchen}
                  className={hasDishes && !isTransmittedToKitchen ? 'fulfill-button disabled-button' : 'fulfill-button'}
                >
                  C'est parti !
                </button>
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
        }
        h1 {
          margin-bottom: 20px;
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
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 5px;
          background: #fff;
        }
        button {
          background: #0070f3;
          color: white;
          border: none;
          padding: 8px 16px;
          cursor: pointer;
          border-radius: 3px;
          font-size: 14px;
        }
        button:hover {
          background: #005bb5;
        }
        .fulfill-button {
          background: #0070f3;
        }
        .fulfill-button:hover {
          background: #005bb5;
        }
        .kitchen-button {
          background: #ff8c00;
          color: white;
          margin-right: 10px;
        }
        .kitchen-button:hover {
          background: #e67e00;
        }
        .disabled-button {
          background: #ccc !important;
          cursor: not-allowed;
          opacity: 0.6;
        }
        .disabled-button:hover {
          background: #ccc !important;
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
