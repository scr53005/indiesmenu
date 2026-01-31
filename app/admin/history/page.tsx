'use client';
import { useState, useEffect } from 'react';
import { getTable, hydrateMemo, HydratedOrderLine } from '@/lib/utils';
import { MenuData } from '@/lib/data/menu';
import { Lato } from 'next/font/google';

const lato = Lato({
  weight: ['300', '400', '700'],
  subsets: ['latin'],
});

interface HistoryOrder {
  id: string;
  from_account: string;
  amount: string;
  symbol: string;
  memo: string;
  parsed_memo: string | null;
  fulfilled_at: string | null;
  hydratedMemo: HydratedOrderLine[];
}

interface GroupedOrders {
  [date: string]: HistoryOrder[];
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [groupedOrders, setGroupedOrders] = useState<GroupedOrders>({});
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [daysLoaded, setDaysLoaded] = useState(0);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [totalDaysWithOrders, setTotalDaysWithOrders] = useState<number | null>(null);
  const [latestOrderId, setLatestOrderId] = useState<string | null>(null);

  // Fetch menu data once on component mount
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch('/api/menu');
        if (!res.ok) {
          throw new Error(`Failed to fetch menu: ${res.statusText}`);
        }
        const data: MenuData = await res.json();
        setMenuData(data);
        console.log('Menu data fetched for history hydration:', data);
      } catch (err) {
        console.error('Error fetching menu data for history hydration:', err);
      }
    };
    fetchMenu();
  }, []);

  // Helper function to hydrate a single order
  const hydrateOrder = (order: any): HistoryOrder => {
    let hydratedMemo: HydratedOrderLine[] = [];

    if (menuData) {
      const tableIndex = order.memo.lastIndexOf('TABLE ');
      const orderContent = tableIndex !== -1
        ? order.memo.substring(0, tableIndex).trim()
        : order.memo;

      try {
        hydratedMemo = hydrateMemo(orderContent, menuData);
      } catch (e) {
        console.error(`Error hydrating memo for order ${order.id}:`, e);
        hydratedMemo = [{ type: 'raw', content: orderContent }];
      }
    } else {
      const tableIndex = order.memo.lastIndexOf('TABLE ');
      const orderContent = tableIndex !== -1
        ? order.memo.substring(0, tableIndex).trim()
        : order.memo;
      hydratedMemo = [{ type: 'raw', content: orderContent }];
    }

    return {
      ...order,
      hydratedMemo,
    };
  };

  // Fetch order history
  const fetchOrders = async (skipDays: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/history?skip=${skipDays}&days=3`);
      const data = await res.json();

      if (res.ok) {
        if (data.totalDaysWithOrders === 0) {
          // No fulfilled orders at all
          setTotalDaysWithOrders(0);
          setHasMore(false);
          setLoading(false);
          return;
        }

        if (data.orders && data.orders.length > 0) {
          // Hydrate memos for each order
          const hydratedOrders = data.orders.map(hydrateOrder);

          setOrders(prev => [...prev, ...hydratedOrders]);
          setHasMore(data.hasMore);
          setDaysLoaded(prev => prev + (data.daysReturned || 0));

          // Track the latest order ID
          if (hydratedOrders.length > 0) {
            const sortedByTime = [...hydratedOrders].sort((a, b) =>
              new Date(b.fulfilled_at || 0).getTime() - new Date(a.fulfilled_at || 0).getTime()
            );
            setLatestOrderId(sortedByTime[0].id);
          }

          groupOrdersByDate([...orders, ...hydratedOrders]);
        } else {
          setHasMore(data.hasMore);
          setTotalDaysWithOrders(data.totalDaysWithOrders || -1);
        }
      }
    } catch (error) {
      console.error('Failed to fetch order history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Poll for new fulfilled orders
  const pollForNewOrders = async () => {
    if (!menuData) return;

    try {
      // Fetch only the most recent day's orders (skip=0, days=1)
      const res = await fetch(`/api/orders/history?skip=0&days=1`);
      const data = await res.json();

      if (res.ok && data.orders && data.orders.length > 0) {
        const hydratedOrders = data.orders.map(hydrateOrder);

        // Find truly new orders (not already in our list)
        const newOrders = hydratedOrders.filter(
          (newOrder: HistoryOrder) => !orders.some(existingOrder => existingOrder.id === newOrder.id)
        );

        if (newOrders.length > 0) {
          console.log(`Found ${newOrders.length} new fulfilled orders`);

          // Prepend new orders to the beginning
          const updatedOrders = [...newOrders, ...orders];
          setOrders(updatedOrders);

          // Update latest order ID
          const sortedByTime = [...newOrders].sort((a, b) =>
            new Date(b.fulfilled_at || 0).getTime() - new Date(a.fulfilled_at || 0).getTime()
          );
          setLatestOrderId(sortedByTime[0].id);

          // Re-group orders by date
          groupOrdersByDate(updatedOrders);
        }
      }
    } catch (error) {
      console.error('Failed to poll for new orders:', error);
    }
  };

  // Group orders by date
  const groupOrdersByDate = (ordersList: HistoryOrder[]) => {
    const grouped: GroupedOrders = {};

    ordersList.forEach(order => {
      if (order.fulfilled_at) {
        const date = new Date(order.fulfilled_at).toLocaleDateString('fr-FR', {
          timeZone: 'Europe/Paris',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(order);
      }
    });

    setGroupedOrders(grouped);
  };

  // Initial load of orders
  useEffect(() => {
    if (menuData) {
      fetchOrders(0);
    }
  }, [menuData]);

  // Set up polling for new orders every 10 seconds
  useEffect(() => {
    if (!menuData) return;

    const intervalId = setInterval(() => {
      pollForNewOrders();
    }, 10000); // Poll every 10 seconds

    // Cleanup function: Clear the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, [menuData, orders]); // Re-create interval when menuData or orders change

  const toggleDay = (date: string) => {
    setExpandedDays(prev => {
      const updated = new Set(prev);
      if (updated.has(date)) {
        updated.delete(date);
      } else {
        updated.add(date);
      }
      return updated;
    });
  };

  const loadMore = () => {
    fetchOrders(daysLoaded);
  };

  // Format hydrated memo for display
  const formatHydratedMemo = (hydratedMemo: HydratedOrderLine[]): string => {
    return hydratedMemo
      .map(line => {
        if (line.type === 'item') {
          return `${line.quantity > 0 ? line.quantity + ' ' : ''}${line.description}`;
        } else if (line.type === 'separator') {
          return '---';
        }
        return line.content;
      })
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className={`container ${lato.className}`}>
      {/* Navigation Header */}
      <div className="nav-header">
        <h1>Historique des ordres</h1>
        <div className="nav-buttons">
          <a href="/admin" className="nav-button dashboard-button">
            🏠 Tableau de bord
          </a>
          <a href="/admin/current_orders" className="nav-button orders-button">
            🛎️ Commandes en cours
          </a>
        </div>
      </div>

      {loading && daysLoaded === 0 ? (
        <p>Chargement...</p>
      ) : Object.keys(groupedOrders).length === 0 && !hasMore ? (
        <p>
          {totalDaysWithOrders === 0
            ? "Aucun ordre dans l'historique"
            : "Aucun ordre dans les trois derniers jours"}
        </p>
      ) : (
        <>
          {Object.keys(groupedOrders).length === 0 && hasMore && (
            <p>Aucun ordre dans les trois derniers jours</p>
          )}

          {Object.keys(groupedOrders).length > 0 && (
            <>
              {Object.keys(groupedOrders)
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                .map(date => (
                  <div key={date} className="day-section">
                    <h2 onClick={() => toggleDay(date)} className="day-header">
                      {date} ({groupedOrders[date].length} ordres) {expandedDays.has(date) ? '▼' : '▶'}
                    </h2>

                    {expandedDays.has(date) && (
                      <table className="orders-table">
                        <thead>
                          <tr>
                            <th>Commande</th>
                            <th>Client</th>
                            <th>Table</th>
                            <th>Heure</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedOrders[date].map(order => {
                            const fulfilledTime = order.fulfilled_at
                              ? new Date(order.fulfilled_at).toLocaleTimeString('fr-FR', {
                                  timeZone: 'Europe/Paris',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'N/A';

                            return (
                              <tr key={order.id}>
                                <td className="memo-cell">
                                  {order.hydratedMemo.map((line, index) => (
                                    <div key={index}>
                                      {line.type === 'item' ? (
                                        <span>
                                          <span className="quantity">{line.quantity}</span>
                                          <span
                                            className={
                                              line.categoryType === 'drink'
                                                ? 'drink-item'
                                                : line.categoryType === 'dish'
                                                ? 'dish-item'
                                                : ''
                                            }
                                          >
                                            {line.description}
                                          </span>
                                        </span>
                                      ) : line.type === 'separator' ? (
                                        <hr className="separator" />
                                      ) : (
                                        <span>{line.content}</span>
                                      )}
                                    </div>
                                  ))}
                                </td>
                                <td>{order.from_account}</td>
                                <td>{getTable(order.memo) || 'N/A'}</td>
                                <td>{fulfilledTime}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
            </>
          )}

          {hasMore && (
            <button onClick={loadMore} className="load-more-btn" disabled={loading}>
              {loading ? 'Chargement...' : 'Charger plus'}
            </button>
          )}
        </>
      )}

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
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

        .orders-button {
          background: #28a745;
        }

        .orders-button:hover {
          background: #218838;
        }

        .day-section {
          margin-bottom: 20px;
        }

        .day-header {
          cursor: pointer;
          background: #f0f0f0;
          padding: 10px 15px;
          margin: 0;
          border-radius: 5px;
          user-select: none;
        }

        .day-header:hover {
          background: #e0e0e0;
        }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        .orders-table th,
        .orders-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }

        .orders-table th {
          background-color: #f8f8f8;
          font-weight: bold;
        }

        .orders-table tr:nth-child(even) {
          background-color: #fafafa;
        }

        .memo-cell {
          max-width: 400px;
        }

        .quantity {
          font-weight: bold;
          margin-right: 5px;
          color: #555;
        }

        .drink-item {
          color: #008000;
          font-weight: bold;
        }

        .dish-item {
          color: #8B0000;
          font-weight: bold;
        }

        .separator {
          border: none;
          border-top: 1px dashed #ccc;
          margin: 5px 0;
        }

        .load-more-btn {
          background: #0070f3;
          color: white;
          border: none;
          padding: 10px 20px;
          cursor: pointer;
          border-radius: 5px;
          margin-top: 20px;
        }

        .load-more-btn:hover:not(:disabled) {
          background: #005bb5;
        }

        .load-more-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}