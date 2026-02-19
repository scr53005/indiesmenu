'use client';

import { useEffect } from 'react';

export default function ErudaDebug() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/eruda';
    script.onload = () => {
      if ((window as any).eruda) {
        (window as any).eruda.init();
        console.log('Eruda mobile debugger loaded');
      }
    };
    document.body.appendChild(script);

    return () => {
      if ((window as any).eruda) {
        (window as any).eruda.destroy();
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return null;
}
