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
  memo: string; // The raw memo from Hive
  parsedMemo: HydratedOrderLine[]; // <-- NEW: Now an array of structured lines
  isCallWaiter: boolean; // <--- NEW: Flag to indicate if it's a "Call a waiter" memo
  received_at: string; 
}

interface PollResponse {
  transfers: Transfer[];
  latestId: string;
  error?: string;
}

// Helper function to extract the 'order' part of the memo for display in toasts
// This function needs to be aware of the potentially hydrated memo format.
function getOrderDisplayContent(memoLines: HydratedOrderLine[]): string {
  if (memoLines.length === 0) return '';
  // If it's a raw memo, return its content directly
  if (memoLines[0].type === 'raw') return memoLines[0].content;

  // For structured memos, format them for toast display
  return memoLines.map(line => {
    if (line.type === 'item') {
      // Include quantity if greater than 0, otherwise just description
      return `${line.quantity > 0 ? line.quantity + ' ' : ''}${line.description}`;
    } else if (line.type === 'separator') {
      return '---'; // Text representation for separator in toast
    }
    return ''; // Should not happen with defined types
  }).filter(Boolean).join(', '); // Join with comma and space, filter out empty strings
}

/*function order(memo: string): string {
  return memo.substring(0, memo.lastIndexOf('TABLE ') === -1 ? memo.length : memo.lastIndexOf('TABLE '));
}*/

export default function Home() {
  const [canPlayAudio, setCanPlayAudio] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [lastId, setLastId] = useState('0');
  const [loading, setLoading] = useState(true);
  const [seenTransferIds, setSeenTransferIds] = useState<Set<string>>(new Set()); // Track seen IDs
  const bell1Ref = useRef<HTMLAudioElement | null>(null);
  const bell2Ref = useRef<HTMLAudioElement | null>(null);
  const [menuData, setMenuData] = useState<MenuData | null>(null);

// Refs to hold the *latest* state values that pollHbd needs without re-triggering effects
  const lastIdRef = useRef(lastId);
  const menuDataRef = useRef(menuData);
  const seenTransferIdsRef = useRef(seenTransferIds);
  const isPollingActiveRef = useRef(false); // To prevent concurrent poll executions

  // Update refs whenever the corresponding state changes
  useEffect(() => { lastIdRef.current = lastId; }, [lastId]);
  useEffect(() => { menuDataRef.current = menuData; }, [menuData]);
  useEffect(() => { seenTransferIdsRef.current = seenTransferIds; }, [seenTransferIds]);

  // Initialize audio elements once
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!bell1Ref.current) {
        bell1Ref.current = new Audio('/sounds/doorbell.mp3');
        bell1Ref.current.load();
        console.log('Doorbell file preloaded');
      }
      if (!bell2Ref.current) {
        bell2Ref.current = new Audio('/sounds/chime-2.mp3');
        bell2Ref.current.load();
        console.log('Chime file preloaded');
      }
    }
  }, []);  // Empty dependency array ensures this runs only once on mount

  // Make playBellSounds a stable function using useCallback
  const playBellSounds = useCallback(() => {
    if (!canPlayAudio) { // Only attempt to unlock if not already unlocked
      if (bell1Ref.current) {
        // Playing and immediately pausing/resetting is a common trick to unlock browser audio context
        bell1Ref.current.play()
          .then(() => {
            bell1Ref.current!.pause();
            bell1Ref.current!.currentTime = 0;
            setCanPlayAudio(true); // Update state to reflect unlocked status
            console.log('page.tsx: Audio unlocked via button'); // Corresponds to your line 268
          })
          .catch(error => {
            console.error('Failed to unlock audio with bell sound, trying chime:', error);
            // Fallback: Try unlocking with the chime sound if bell failed
            if (bell2Ref.current) {
                bell2Ref.current.play()
                    .then(() => {
                        bell2Ref.current!.pause();
                        bell2Ref.current!.currentTime = 0;
                        setCanPlayAudio(true);
                        console.log('page.tsx: Audio unlocked via button (chime fallback)');
                    })
                    .catch(e => console.error("Failed to unlock audio with chime sound:", e));
            }
          });
      } else {
        console.warn('Audio references not yet available for unlock. Please wait for preload.');
      }
    }
  }, [canPlayAudio]); // Dependency: canPlayAudio to prevent unnecessary re-creations of this callback

  // --- Functions to Play Specific Sounds ---
  const playBell1Sound = useCallback(() => {
    // This is the check that was logging "Audio not unlocked or not initialized..." (line 102)
    if (canPlayAudio && bell1Ref.current) {
      bell1Ref.current.currentTime = 0; // Reset to start for immediate playback
      bell1Ref.current.play().catch(e => console.error("Error playing bell sound:", e));
    } else {
      console.log('page.tsx: Audio not unlocked or not initialized; skipping doorbell sounds (canPlayAudio:', canPlayAudio, ', bellSoundRef.current:', bell1Ref.current, ')');
    }
  }, [canPlayAudio, bell1Ref]); // Depend on isAudioUnlocked to get its latest value

  const playChimeSound = useCallback(() => {
    if (canPlayAudio && bell2Ref.current) {
      bell2Ref.current.currentTime = 0;
      bell2Ref.current.play().catch(e => console.error("Error playing chime sound:", e));
    } else {
      console.log('page.tsx: Audio not unlocked or not initialized; skipping chime sounds (canPlayAudio:', canPlayAudio, ', chimeSoundRef.current:', bell2Ref.current, ')');
    }
  }, [canPlayAudio, bell2Ref]); // Depend on isAudioUnlocked to get its latest value


  // Make pollHbd a stable function using useCallback
  const pollHbd = useCallback(async () => {
    // Use a ref to prevent multiple concurrent poll requests
    if (isPollingActiveRef.current) {
      console.log('Poll already active, skipping.');
      return;
    }
    isPollingActiveRef.current = true; // Set flag to indicate polling is in progress

    try {
      // Use refs to get the latest state values without recreating pollHbd
      const res = await fetch(`/api/poll-hbd?lastId=${lastIdRef.current}`);
      const data: PollResponse = await res.json();
      if (res.ok) {
        if (data.transfers?.length) {
          const currentSeenIds = new Set(seenTransferIdsRef.current); // Use ref for current seen IDs
          
          // First, process all transfers from the API response to ensure parsedMemo is an array
          const newlyProcessedTransfers = data.transfers.map(tx => {
            let parsedMemo: HydratedOrderLine[]; // Declare it here  = [{ type: 'raw', content: tx.memo }];
            let isCallWaiter = false;

            const tableIndexInMemo = tx.memo.lastIndexOf('TABLE ');
            const memoPrefix = tableIndexInMemo !== -1 ? tx.memo.substring(0, tableIndexInMemo).trim().toLowerCase() : tx.memo.toLowerCase();
            if (memoPrefix.includes('appel')) {
                isCallWaiter = true;
                // alert('Un serveur est appelé!'); // Alert for "Call a Waiter" memo
            }

            const orderContentToHydrate = tableIndexInMemo !== -1 ? tx.memo.substring(0, tableIndexInMemo).trim() : tx.memo;

            // If it's a "Call a Waiter" memo, or if menuData is not available,
            // keep parsedMemo as a single raw line.
            if (isCallWaiter || !menuDataRef.current) {
                parsedMemo = [{ type: 'raw', content: orderContentToHydrate }];
            } else {
                // Otherwise, attempt to hydrate it with menu data
                try {
                    parsedMemo = hydrateMemo(orderContentToHydrate, menuDataRef.current);
                } catch (e) {
                    console.error(`Error hydrating memo for TX ${tx.id}:`, e);
                    parsedMemo = [{ type: 'raw', content: orderContentToHydrate }];
                }
            }
            return { ...tx, parsedMemo, isCallWaiter };
          });

          // Now, filter these processed transfers to find the *actually new* ones (not seen before)
          const newTransfersToDisplay = newlyProcessedTransfers.filter(tx => !currentSeenIds.has(tx.id));

          // Update seen IDs and lastId
          // Mark all newly processed transfers as seen (even if not displayed as a new toast)
          newlyProcessedTransfers.forEach(tx => currentSeenIds.add(tx.id));
          setSeenTransferIds(currentSeenIds);
          lastIdRef.current = data.latestId;
          setLastId(data.latestId);

          if (newTransfersToDisplay.length > 0) {
            if (canPlayAudio) { playBellSounds(); }
            // Iterate over the correctly processed and new transfers for toasts
            newTransfersToDisplay.forEach(tx => {
              const receivedDateTime = new Date(tx.received_at).toLocaleString('en-GB', {
                timeZone: 'Europe/Paris',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });
              toast.info(
              `${getOrderDisplayContent(tx.parsedMemo)} for ${getTable(tx.memo) || 'unknown'}; ${tx.amount} ${tx.symbol} (Order received: ${receivedDateTime})`,
              {
                  autoClose: 5000,
                  className: tx.isCallWaiter ? 'flash-toast call-waiter-toast' : 'flash-toast',
                  toastId: tx.id,
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
          // Always update the main transfers state with all processed transfers
          setTransfers(newlyProcessedTransfers);
        }
      } else {
        toast.error(`Poll error: ${data.error}`, { autoClose: 5000 });
      }
    } catch (error) {
      console.error('Poll error:', error);
      toast.error('Failed to fetch transfers', { autoClose: 5000 });
    } finally {
      isPollingActiveRef.current = false; // Reset flag after poll completes
    }
  }, [playBellSounds, setTransfers, setLastId, setSeenTransferIds]); // Dependencies for useCallback



  // Fetch menu data once on component mount
   useEffect(() => {
     const fetchMenu = async () => {
      try {
        const res = await fetch('/api/menu');
        if (!res.ok) {
          throw new Error(`Failed to fetch menu: ${res.statusText}`);
        }
        const data: MenuData = await res.json(); // Use imported MenuData type
        setMenuData(data);
        console.log('Menu data fetched for memo hydration:', data);
      } catch (err) {
        console.error('Error fetching menu data for memo hydration:', err);
        toast.error('Failed to load menu data for memo hydration.', { autoClose: 8000 });
      }
    };
    fetchMenu();
  }, []); // Empty dependency array means it runs once on mount

  // Effect to set up the polling interval (runs once on mount)
  useEffect(() => {
    // Initial poll immediately when the component mounts
    pollHbd();
    // Then set up the interval for subsequent polls every 5 seconds
    const intervalId = setInterval(pollHbd, 5000);

    setLoading(false); // Set loading to false once polling is initiated

    // Cleanup function: Clear the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, [pollHbd]); // Dependency: pollHbd is stable because of useCallback


  const unlockAudio = () => {
    if (!canPlayAudio) {
      setCanPlayAudio(true);
      // Show a toast to indicate audio is unlocked
      setTimeout(() => {
        toast.info('Audio unlocked! You can now hear the doorbell and chime sounds.', {
          autoClose: 5000,  
          toastId: 'audio-unlocked',
          className: 'flash-toast', 
        });
      }, 5000); // Delay to ensure the button click is registered before playing sounds
      console.log('Audio unlocked via button: ' + canPlayAudio);
      playBellSounds();
      playBell1Sound();
      playChimeSound();
    }
  };
  
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
      {canPlayAudio && (
        <> {/* Use React.Fragment shorthand here */}
          &nbsp; {/* You can keep &nbsp; for spacing, but inside the fragment */}
          <button onClick={playBell1Sound} className="unlock-audio-button">
            Play Bell Sound
          </button>
          &nbsp; {/* Another &nbsp; */}
          <button onClick={playChimeSound} className="unlock-audio-button">
            Play Chime Sound
          </button>
        </> /* Close the Fragment */
      )}
      <br/><br/> 
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
            // const memoClasses = `order-memo ${tx.isCallWaiter ? 'call-waiter-memo' : ''}`;

          return (
            <li key={tx.id.toString()}> {/* Convert to string for React key */}
              <p>Commande:</p> {/* "Commande:" label is now a separate <p> */}
              {/* Order details container: apply call-waiter styling here */}
              <div className={`order-details-container ${tx.isCallWaiter ? 'call-waiter-item' : ''}`}>
                {tx.parsedMemo.map((line, index) => (
                  <React.Fragment key={index}>
                    {line.type === 'item' ? (
                      <div className="order-item-line">
                        <span className="order-item-quantity">{line.quantity}</span>
                        <span className="order-item-description">{line.description}</span>
                      </div>
                    ) : line.type === 'separator' ? (
                      <hr className="order-separator" />
                    ) : ( // type === 'raw'
                      <div className="order-item-description full-width-raw">{line.content}</div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <p>
                Pour la table: <strong>{getTable(tx.memo) || 'unknown'}</strong>
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
              <button onClick={() => handleFulfill(tx.id.toString())}>C'est parti !</button>
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
          color:rgb(160, 10, 10); /* Bootstrap danger color */
          font-weight: bold;
        }
        /* --- New styles for order details alignment and HR fix --- */
        .order-details-container {
          margin-left: 10px; /* Indent the order items slightly */
          margin-bottom: 10px; /* Space before next section */
        }
        .order-item-line {
          display: grid;
          grid-template-columns: 30px 1fr; /* Fixed width for quantity, rest for description */
          gap: 5px; /* Space between columns */
          align-items: baseline;
          margin-bottom: 2px; /* Small space between lines */
        }
        .order-item-quantity {
          font-weight: bold;
          color: #555; /* Lighter color for quantity */
          text-align: right; /* Align quantity to the right */
        }
        .order-item-description {
          font-weight: bold;
          color: #333; /* Darker color for better contrast */
        }
        .full-width-raw {
          grid-column: span 2; /* Raw content spans both columns */
        }
        .order-separator {
          border: none;
          border-top: 1px dashed #ccc;
          margin: 10px 0;
          grid-column: span 2; /* Separator spans both columns in the grid */
        }

        /* --- Styles for CALL WAITER MEMO --- */
        .call-waiter-item {
          background-color: #ffe0e0; /* Light red background for the whole li container */
          border-color: red;
          animation: pulse-red 1.5s infinite alternate; /* Pulsating animation */
        }
        /* Target children within call-waiter-item to make them red and bold */
        .call-waiter-item .order-item-quantity,
        .call-waiter-item .order-item-description,
        .call-waiter-item .full-width-raw {
          color: red; /* Make text red */
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
      <style jsx global>{`
        .flash-toast {
          background: #ffcc00;
          color: #000;
          animation: flash 2s;
        }
        .call-waiter-toast {
            background-color: #ff4d4d !important; /* Red background for toast */
            color: white !important;
            animation: flash-red-toast 1s infinite alternate; /* Pulsating red for toast */
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
        @keyframes flash-red-toast {
            0%, 100% { background-color: #ff4d4d; }
            50% { background-color: #ff8080; }
        }         
      `}</style>
    </div>
  );
}