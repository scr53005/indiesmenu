'use client';
import { useState, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { getTable } from '@/lib/utils';
import 'react-toastify/dist/ReactToastify.css';

interface Transfer {
  id: string;
  from_account: string; 
  amount: string;
  symbol: string;
  memo: string;
  parsedMemo: string | object;
  received_at: string; 
}

interface PollResponse {
  transfers: Transfer[];
  latestId: string;
  error?: string;
}

function order(memo: string): string {
  return memo.substring(0, memo.lastIndexOf('TABLE ') === -1 ? memo.length : memo.lastIndexOf('TABLE '));
}

export default function Home() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [lastId, setLastId] = useState('0');
  const [loading, setLoading] = useState(true);
  const [seenTransferIds, setSeenTransferIds] = useState<Set<string>>(new Set()); // Track seen IDs
  const [canPlayAudio, setCanPlayAudio] = useState(false);
  const bell1Ref = useRef<HTMLAudioElement | null>(null);
  const bell2Ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio in browser only
    if (typeof window !== 'undefined') {
      bell1Ref.current = new Audio('/sounds/doorbell.mp3');
      bell2Ref.current = new Audio('/sounds/chime-2.mp3');
      bell1Ref.current.load();
      bell2Ref.current.load();
      console.log('Audio files preloaded');
    }
    return () => {
      // Cleanup
      if (bell1Ref.current) {
        bell1Ref.current.pause();
        bell1Ref.current = null;
      }
      if (bell2Ref.current) {
        bell2Ref.current.pause();
        bell2Ref.current = null;
      }
    };
  }, []);    

  const playBellSounds = () => {
    if (canPlayAudio && bell1Ref.current && bell2Ref.current) {
      console.log('Playing bell sounds');
      bell1Ref.current.currentTime = 0; // Reset to start
      bell1Ref.current.play().catch(error => console.error('Doorbell playback error:', error));
      setTimeout(() => {
        bell2Ref.current!.currentTime = 0;
        bell2Ref.current!.play().catch(error => console.error('Chime-2 playback error:', error));
      }, 2000); // 2-second delay
    } else {
      console.log('Audio not unlocked or not initialized; skipping bell sounds');
    }
  };

    // Unlock audio on first user interaction
    const unlockAudio = () => {
      if (!canPlayAudio) {
        setCanPlayAudio(true);
        console.log('Audio unlocked via button');
        playBellSounds(); // Play at page load after unlock
      }
    };

  useEffect(() => {
    let isPolling = false; // Prevent overlapping polls

    // Initial fetch to get the latest transfers
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

            data.transfers.forEach(tx => currentSeenIds.add(tx.id));

            // Update state                        
            setTransfers(data.transfers);
            setLastId(data.latestId);
            setSeenTransferIds(currentSeenIds);

            if (newTransfers.length > 0) {
              playBellSounds(); // Play for new orders
              // Show toasts only for new transfers
              newTransfers.forEach(tx => {
                const receivedDateTime = new Date(tx.received_at).toLocaleString('en-GB', {
                  timeZone: 'Europe/Paris', // CEST
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                toast.info(
                `${order(tx.memo)} for ${getTable(tx.memo) || 'unknown'}; ${tx.amount} ${tx.symbol} (Order received: ${receivedDateTime})`,
                {
                    autoClose: 5000,
                    className: 'flash-toast',
                    toastId: tx.id, // Unique toast ID to prevent duplicates
                    hideProgressBar: false,
                    closeButton: true,
                    position: 'top-right',
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    onOpen: () => {
                      setTimeout(() => toast.dismiss(tx.id), 6000);
                    },
                }
                );
              });
            }
          }
          // If no new transfers, just update lastId
        } else {
          //const error = data.error || 'Failed to fetch transfers';
          toast.error(`Poll error: ${data.error}`, {
            autoClose: 5000,
          });
        }
      } catch (error) {
        console.error('Poll error:', error);
        toast.error('Failed to fetch transfers', {
          autoClose: 5000,
        });
      } finally {
        isPolling = false;
      }
    };

    // Run initial poll after a short delay to avoid overlap
    const initialPoll = setTimeout(pollHbd, 100);
    const interval = setInterval(pollHbd, 5000);
    setLoading(false);

    return () => { 
      clearTimeout(initialPoll);
      clearInterval(interval);
    };
  }, [lastId, canPlayAudio]);

  const handleFulfill = async (id: string) => {
    console.log(`Attempting to fulfill transfer ID: ${id}`);
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
        toast.success('Commande satisfaite!', {
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
      toast.error('Fulfill order command failed', {
        autoClose: 5000,
      });
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
      <h1>Commandes pour @{ process.env.NEXT_PUBLIC_HIVE_ACCOUNT }</h1>
      <br/>
      {!canPlayAudio && (
        <button onClick={unlockAudio} className="unlock-audio-button">
          Unlock Audio
        </button>
      )} 
      <br/>    
      {loading ? (
        <p>Chargement...</p>
      ) : transfers.length === 0 ? (
        <p>Pas de commandes en attente</p>
      ) : (
        <ul>
          {transfers.map(tx => { 
          // Format received_at as CEST
          const receivedDateTime = new Date(tx.received_at).toLocaleString('en-GB', {
            timeZone: 'Europe/Paris',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });

           // Compute time difference in seconds
            const now = new Date();
            const receivedTime = new Date(tx.received_at);
            const timeDiffSeconds = (now.getTime() - receivedTime.getTime()) / 1000;
            const isLate = timeDiffSeconds > 600; // 600 seconds = 10 minutes

          return (
            <li key={tx.id.toString()}> {/* Convert to string for React key */}
              <p>
                Commande:{' '}
                <strong>{typeof tx.parsedMemo === 'object'
                  ? order(JSON.stringify(tx.parsedMemo))
                  : order(tx.parsedMemo)}</strong>
              </p>
              <p>
                Pour la table: <strong>{typeof tx.parsedMemo === 'object'
                  ? getTable(JSON.stringify(tx.parsedMemo))
                  : getTable(tx.parsedMemo)}</strong> 
              </p>
              <p>
                Client: <strong>{tx.from_account || 'unknown'}</strong>
              </p>
              <p>
                Prix en {tx.symbol}: <strong>{tx.amount}</strong> 
              </p>
              <p className={isLate ? 'late-order' : ''}>
                Ordre recu le:<strong> {receivedDateTime}</strong>
              </p>              
              <button onClick={() => handleFulfill(tx.id.toString())}>Fulfill</button>
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
        .late-order {
          color: red;
          font-weight: bold;
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