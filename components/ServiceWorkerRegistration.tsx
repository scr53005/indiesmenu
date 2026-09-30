'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    console.log('[SW] Checking for service worker support...');
    if ('serviceWorker' in navigator) {
      // Turbopack reuses dev chunk URLs. A production-style cache-first service
      // worker can therefore serve old client code after a source edit.
      if (process.env.NODE_ENV !== 'production') {
        const clearDevelopmentCaches = async () => {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));

          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames
                .filter((name) => name.startsWith('indies-menu'))
                .map((name) => caches.delete(name)),
            );
          }

          console.log('[SW] Development service workers and caches cleared');
        };

        clearDevelopmentCaches().catch((error) => {
          console.error('[SW] Failed to clear development service worker state:', error);
        });
        return;
      }

      console.log('[SW] Service Worker supported');
      window.addEventListener('load', () => {
        console.log('[SW] Window loaded, attempting to register service worker');
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[SW] Service Worker registered successfully:', registration.scope);

            // Check for updates periodically
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000); // Check every hour

            // Listen for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker available
                    console.log('[SW] New service worker available');
                    // Optionally notify user about update
                    if (confirm('Une nouvelle version du menu est disponible. Rafraîchir maintenant?')) {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                      window.location.reload();
                    }
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error('[SW] Service Worker registration failed:', error);
            console.error('[SW] Error details:', {
              message: error.message,
              name: error.name,
              stack: error.stack
            });
            // Try to fetch sw.js to see if it's accessible
            fetch('/sw.js')
              .then(res => {
                console.log('[SW] sw.js fetch status:', res.status);
                return res.text();
              })
              .then(text => console.log('[SW] sw.js content length:', text.length))
              .catch(fetchError => console.error('[SW] Cannot fetch sw.js:', fetchError));
          });

        // Listen for controller change (new SW activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[SW] Controller changed - reloading page');
          window.location.reload();
        });
      });
    } else {
      console.log('[SW] Service Workers not supported in this browser');
    }
  }, []);

  return null; // This component doesn't render anything
}
