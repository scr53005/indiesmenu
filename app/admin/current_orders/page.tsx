'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { getTable, hydrateMemo, HydratedOrderLine } from '@/lib/utils';
import { MenuData } from '@/lib/data/menu';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';

// Get merchant-hub URL - always use production instance
function getMerchantHubUrl(): string {
  if (typeof window === 'undefined') return '';

  const url = process.env.NEXT_PUBLIC_MERCHANT_HUB_URL || 'https://merchant-hub-theta.vercel.app';
  // Strip trailing slash to avoid double-slash issues
  return url.replace(/\/$/, '');
}

interface Transfer {
  messageId: string; // Redis Stream message ID (for ACK)
  id: string; // HAF operation ID
  restaurant_id: string;
  account: string;
  from_account: string;
  amount: string;
  symbol: string;
  memo: string;
  parsedMemo?: HydratedOrderLine[];
  isCallWaiter?: boolean;
  received_at: string;
  block_num?: number;
  fulfilled_at?: string | null;
}

interface ConsumeResponse {
  transfers: Transfer[];
  consumerId?: string;
  streamKey?: string;
  groupName?: string;
  pending?: number;
}

export default function CurrentOrdersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transmittedToKitchen, setTransmittedToKitchen] = useState<Map<string, string>>(new Map());
  const consumerId = useRef(`admin-${Date.now()}`);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

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

  // Poll merchant-hub for new transfers
  const pollTransfers = useCallback(async () => {
    try {
      const merchantHubUrl = getMerchantHubUrl();
      if (!merchantHubUrl) {
        console.warn('Merchant hub URL not configured');
        return;
      }

      const url = `${merchantHubUrl}/api/transfers/consume?restaurantId=indies&consumerId=${consumerId.current}&count=50`;

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Failed to fetch transfers: ${res.statusText}`);
      }

      const data: ConsumeResponse = await res.json();

      if (data.transfers && data.transfers.length > 0) {
        console.log(`[POLL] Received ${data.transfers.length} new transfers`);

        // Hydrate memos and prepare transfers
        const hydratedTransfers = data.transfers.map(tx => {
          let parsedMemo: HydratedOrderLine[] = [];
          let isCallWaiter = false;

          const tableIndex = tx.memo.lastIndexOf('TABLE ');
          const memoPrefix = tableIndex !== -1
            ? tx.memo.substring(0, tableIndex).trim().toLowerCase()
            : tx.memo.toLowerCase();

          if (memoPrefix.includes('appel')) {
            isCallWaiter = true;
          }

          const orderContent = tableIndex !== -1
            ? tx.memo.substring(0, tableIndex).trim()
            : tx.memo;

          if (isCallWaiter || !menuData) {
            parsedMemo = [{ type: 'raw', content: orderContent }];
          } else {
            try {
              parsedMemo = hydrateMemo(orderContent, menuData);
            } catch (e) {
              console.error(`Error hydrating memo for TX ${tx.id}:`, e);
              parsedMemo = [{ type: 'raw', content: orderContent }];
            }
          }

          return { ...tx, parsedMemo, isCallWaiter };
        });

        // Insert into PostgreSQL using same logic as /api/poll-hbd
        const messagesToAck: string[] = [];

        for (const transfer of hydratedTransfers) {
          try {
            // Check if transfer already exists (reusing poll-hbd logic)
            const checkRes = await fetch(`/api/transfers/check?id=${transfer.id}`);

            if (checkRes.ok) {
              const { exists } = await checkRes.json();

              if (!exists) {
                // Insert new transfer (reusing poll-hbd insert logic)
                const insertRes = await fetch('/api/transfers/insert-from-merchant-hub', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: transfer.id,
                    from_account: transfer.from_account,
                    amount: transfer.amount,
                    symbol: transfer.symbol,
                    memo: transfer.memo,
                    parsed_memo: JSON.stringify(transfer.parsedMemo),
                    received_at: transfer.received_at,
                  }),
                });

                if (insertRes.ok) {
                  console.log(`[INSERT] Successfully inserted transfer ${transfer.id}`);
                  // Success! Mark for ACK
                  messagesToAck.push(transfer.messageId);

                  // Add to UI
                  setTransfers(prev => [...prev, transfer]);

                  // Show toast
                  toast.info(
                    `Nouvelle commande: ${getOrderDisplayContent(transfer.parsedMemo || [])} pour ${getTable(transfer.memo) || 'inconnue'} - ${transfer.amount} ${transfer.symbol}`,
                    { autoClose: false }
                  );
                } else {
                  console.error(`Failed to insert transfer ${transfer.id}:`, await insertRes.text());
                }
              } else {
                // Already exists - ACK it anyway (idempotent)
                messagesToAck.push(transfer.messageId);
                console.log(`[INSERT] Transfer ${transfer.id} already exists, ACKing`);
              }
            }
          } catch (err) {
            console.error(`Error processing transfer ${transfer.id}:`, err);
            // Don't ACK - message will stay pending
          }
        }

        // ACK successfully inserted messages
        if (messagesToAck.length > 0) {
          try {
            await fetch(`${merchantHubUrl}/api/transfers/ack`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                restaurantId: 'indies',
                messageIds: messagesToAck,
              }),
            });
            console.log(`[ACK] Acknowledged ${messagesToAck.length} messages`);
          } catch (err) {
            console.error('Failed to ACK messages:', err);
          }
        }
      }
    } catch (err: any) {
      console.error('[POLL] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [menuData]);

  // Start polling on mount
  useEffect(() => {
    pollTransfers(); // Initial poll

    // Poll every 6 seconds
    pollInterval.current = setInterval(pollTransfers, 6000);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [pollTransfers]);

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

  // Helper to format order content
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

  // Filter unfulfilled orders
  const unfulfilledOrders = transfers.filter(t => !t.fulfilled_at);

  return (
    <div className="container">
      <ToastContainer position="top-right" />

      <h1>Commandes en cours</h1>

      {error && (
        <div className="error-box">
          Erreur: {error}
        </div>
      )}

      {loading && <p>Chargement des commandes...</p>}

      {!loading && unfulfilledOrders.length === 0 ? (
        <p>Pas de commandes en attente</p>
      ) : (
        <ul>
          {unfulfilledOrders.map(transfer => {
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
