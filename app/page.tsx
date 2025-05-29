'use client';
import { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Transfer {
  id: string;
  from_account: string; // Optional, added for display
  amount: string;
  symbol: string;
  memo: string;
  parsedMemo: string | object;
}

interface PollResponse {
  transfers: Transfer[];
  latestId: string;
  error?: string;
}

export default function Home() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [lastId, setLastId] = useState('0');
  const [loading, setLoading] = useState(true);
  const [seenTransferIds, setSeenTransferIds] = useState<Set<string>>(new Set()); // Track seen IDs

  useEffect(() => {
    let isPolling = false; // Prevent overlapping polls
    const pollHbd = async () => {
      if (isPolling) return; // Skip if already polling
      isPolling = true;

      try {
        const res = await fetch(`/api/poll-hbd?lastId=${lastId}`);
        const data: PollResponse = await res.json();
        if (res.ok) {
          if (data.transfers?.length) {
            // Use local Set to track IDs for this poll
            const currentSeenIds = new Set(seenTransferIds);
            const newTransfers = data.transfers.filter(tx => !currentSeenIds.has(tx.id));
            // Identify new transfers
            // const newTransfers = data.transfers.filter(tx => !seenTransferIds.has(tx.id));

            // Update seen IDs
            // const updatedSeenIds = new Set(seenTransferIds);
            data.transfers.forEach(tx => currentSeenIds.add(tx.id));

            // setSeenTransferIds(updatedSeenIds);

            // Update state                        
            setTransfers(data.transfers);
            setLastId(data.latestId);
            setSeenTransferIds(currentSeenIds);

            // Show toasts only for new transfers
            newTransfers.forEach(tx => {
              toast.info(
               `${tx.memo} for ${tx.from_account || 'unknown'}: ${tx.amount} ${tx.symbol}`,
               {
                  autoClose: 5000,
                  className: 'flash-toast',
                  toastId: tx.id, // Unique toast ID to prevent duplicates
                  hideProgressBar: false,
                  closeOnClick: true,
                  pauseOnHover: true,
                  draggable: true,
               }
              );
            });
          }
        } else {
          //const error = data.error || 'Failed to fetch transfers';
          toast.error(`Poll error: ${data.error}`);
        }
      } catch (error) {
        console.error('Poll error:', error);
        toast.error('Failed to fetch transfers');
      } finally {
        isPolling = false;
      }
    };

    //const interval = setInterval(pollHbd, 5000); // Poll every 5 seconds
    //pollHbd(); // Initial poll
    // Run initial poll after a short delay to avoid overlap
    const initialPoll = setTimeout(pollHbd, 100);
    const interval = setInterval(pollHbd, 5000);
    setLoading(false);
    return () => { 
      clearTimeout(initialPoll);
      clearInterval(interval);
    };
  }, [lastId]);

  const handleFulfill = async (id: string) => {
    try {
      const res = await fetch('/api/fulfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }), // Send id as string
      });
      const data = await res.json();
      if (res.ok) {
        setTransfers(prev => prev.filter(tx => tx.id !== id));
        // Remove fulfilled transfer from seen IDs to allow re-toast if re-added
        setSeenTransferIds(prev => {
          const updated = new Set(prev);
          updated.delete(id);
          return updated;
        });
        toast.success('Order fulfilled!', {
          autoClose: 5000,
          toastId: `fulfill-${id}`,
        });
        // Explicitly dismiss the "New HBD Transfer" toast
        toast.dismiss(id);
      } else {
        toast.error(`Fulfill error: ${data.error}`);
      }
    } catch (error) {
      console.error('Fulfill error:', error);
      toast.error('Fulfill order command failed');
    }
  };

  return (
    <div className="container">
      <ToastContainer 
        autoClose={5000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
        limit={5} // Prevent toast overload
      />
      <h1>HBD Transfers to @indies-test</h1>
      {loading ? (
        <p>Loading...</p>
      ) : transfers.length === 0 ? (
        <p>No unfulfilled transfers found.</p>
      ) : (
        <ul>
          {transfers.map(tx => (
            <li key={tx.id.toString()}> {/* Convert to string for React key */}
              <p>
                Order:{' '}
                <strong>{typeof tx.parsedMemo === 'object'
                  ? JSON.stringify(tx.parsedMemo)
                  : tx.parsedMemo}</strong>
              </p>
              <p>
                For: <strong>{tx.from_account}</strong> 
              </p>
              <p>
                Prix en {tx.symbol}: <strong>{tx.amount}</strong> 
              </p>
              <p>
                <strong>Transfer ID:</strong> {tx.id.toString()}
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
          border-radius: 5px;
        }
        button {
          background: #0070f3;
          color: white;
          border: none;
          padding: 5px 10px;
          cursor: pointer;
          border-radius: 3px;
        }
        button:hover {
          background: #005bb5;
        }
      `}</style>
      <style jsx global>{`
        .flash-toast {
          background: #ffcc00;
          color: #000;
          animation: flash 2s;
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