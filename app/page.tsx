'use client';
import { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Transfer {
  id: string;
  from_account?: string; // Optional, added for display
  symbol: string;
  amount: string;
  memo: string;
  parsedMemo: string | object;
}

interface PollResponse {
  transfers: Transfer[];
  latestId: number;
  error?: string;
}

export default function Home() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [lastId, setLastId] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pollHbd = async () => {
      try {
        const res = await fetch(`/api/poll-hbd?lastId=${lastId}`);
        const data: PollResponse = await res.json();
        if (res.ok && data.transfers?.length) {
          setTransfers(prev => [...data.transfers, ...prev].slice(0, 50)); // Limit to 50 transfers;
          setLastId(data.latestId);
          data.transfers.forEach(tx => {
            toast.info(
              `New HBD Transfer from ${tx.from_account || 'unknown'}: ${tx.amount} ${tx.symbol} (Memo: ${tx.memo})`,
              {
                autoClose: 5000,
                className: 'flash-toast',
              }
            );
          });
        }
      } catch (error) {
        console.error('Poll error:', error);
        toast.error('Failed to fetch transfers');
      }
    };

    const interval = setInterval(pollHbd, 5000); // Poll every 5 seconds
    pollHbd(); // Initial poll
    setLoading(false);
    return () => clearInterval(interval);
  }, [lastId]);

  const handleFulfill = (id: string) => {
    setTransfers(prev => {
      const fulfilled = prev.find(tx => tx.id === id);
      if (fulfilled) {
        localStorage.setItem(`archive_${id}`, JSON.stringify(fulfilled));
      }
      return prev.filter(tx => tx.id !== id);
    });
  };

  return (
    <div className="container">
      <ToastContainer />
      <h1>HBD Transfers to @indies-test</h1>
      {loading ? (
        <p>Loading...</p>
      ) : transfers.length === 0 ? (
        <p>No transfers found.</p>
      ) : (
        <ul>
          {transfers.map(tx => (
            <li key={tx.id}>
              <p>
                <strong>From:</strong> {tx.from_account || 'unknown'}
              </p>
              <p>
                <strong>Amount:</strong> {tx.amount} {tx.symbol}
              </p>
              <p>
                <strong>Memo:</strong>{' '}
                {typeof tx.parsedMemo === 'object'
                  ? JSON.stringify(tx.parsedMemo)
                  : tx.parsedMemo}
              </p>
              <p>
                <strong>Transfer ID:</strong> {tx.id}
              </p>
              <button onClick={() => handleFulfill(tx.id)}>Fulfill</button>
            </li>
          ))}
        </ul>
      )}
      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        ul {
          list-style: none;
          padding: 0;
        }
        li {
          border: 1px solid #ddd;
          padding: 10px;
          margin-bottom: 10px;
        }
        button {
          background: #0070f3;
          color: white;
          border: none;
          padding: 5px 10px;
          cursor: pointer;
        }
        button:hover {
          background: #005bb5;
        }
      `}</style>
      <style jsx global>{`
        .flash-toast {
          background: #ffcc00;
          color: #000;
          animation: flash 1s infinite;
        }
        @keyframes flash {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}