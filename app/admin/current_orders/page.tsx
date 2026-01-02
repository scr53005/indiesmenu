'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { getTable, hydrateMemo, HydratedOrderLine } from '@/lib/utils';
import { MenuData } from '@/lib/data/menu';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';

// Get merchant-hub URL based on environment
function getMerchantHubUrl(): string {
  if (typeof window === 'undefined') return '';

  const hostname = window.location.hostname;

  // Production: https://merchant-hub.vercel.app or similar
  if (hostname === 'indies.innopay.lu') {
    return process.env.NEXT_PUBLIC_MERCHANT_HUB_URL || 'https://merchant-hub.vercel.app';
  }

  // Development: localhost or 192.168.*
  // Assume merchant-hub runs on same host, different port
  const protocol = window.location.protocol;
  return `${protocol}//${hostname}:3002`; // Adjust port as needed
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

      const res = await fetch(url, {
        credentials: 'include', // For CORS
      });

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
                    `New order: ${getOrderDisplayContent(transfer.parsedMemo || [])} for ${getTable(transfer.memo) || 'unknown'} - ${transfer.amount} ${transfer.symbol}`,
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
              credentials: 'include',
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

  // Mark transfer as fulfilled
  const handleFulfill = async (transferId: string) => {
    try {
      const res = await fetch(`/api/transfers/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transferId }),
      });

      if (res.ok) {
        setTransfers(prev =>
          prev.map(t =>
            t.id === transferId
              ? { ...t, fulfilled_at: new Date().toISOString() }
              : t
          )
        );
        toast.success('Order marked as fulfilled!');
      }
    } catch (err) {
      console.error('Failed to mark as fulfilled:', err);
      toast.error('Failed to mark order as fulfilled');
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
    <div className="min-h-screen bg-gray-50 p-6">
      <ToastContainer position="top-right" />

      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Current Orders</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        {loading && <p>Loading orders...</p>}

        <div className="bg-white rounded-lg shadow">
          {unfulfilledOrders.length === 0 ? (
            <p className="p-6 text-gray-500">No pending orders</p>
          ) : (
            <div className="divide-y">
              {unfulfilledOrders.map(transfer => (
                <div key={transfer.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">
                        {getTable(transfer.memo) || 'Table Unknown'}
                      </div>
                      <div className="text-gray-700 mt-1">
                        {transfer.parsedMemo && transfer.parsedMemo.length > 0 ? (
                          <div>
                            {transfer.parsedMemo.map((line, idx) => (
                              <div key={idx}>
                                {line.type === 'item' && (
                                  <span>
                                    {line.quantity > 0 ? `${line.quantity}x ` : ''}
                                    {line.description}
                                  </span>
                                )}
                                {line.type === 'separator' && <hr className="my-1" />}
                                {line.type === 'raw' && <span>{line.content}</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span>{transfer.memo}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-2">
                        {transfer.amount} {transfer.symbol} from {transfer.from_account}
                        <br />
                        {new Date(transfer.received_at).toLocaleString('en-GB', {
                          timeZone: 'Europe/Luxembourg',
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => handleFulfill(transfer.id)}
                      className="ml-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Mark Fulfilled
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
