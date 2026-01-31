'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to new CO page after 10 seconds
    const timer = setTimeout(() => {
      router.push('/admin/current_orders');
    }, 10000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        maxWidth: '600px',
        textAlign: 'center',
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '20px',
        }}>
          Page déplacée
        </h1>

        <p style={{
          fontSize: '18px',
          color: '#666',
          marginBottom: '30px',
          lineHeight: '1.6',
        }}>
          La page de suivi de commandes a migré vers le nouveau tableau de bord
        </p>

        <div style={{
          padding: '15px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          <p style={{
            fontSize: '14px',
            color: '#1976d2',
            margin: 0,
          }}>
            Redirection automatique dans 10 secondes...
          </p>
        </div>

        <Link
          href="/admin/current_orders"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '16px',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#005bb5'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0070f3'}
        >
          Aller au nouveau tableau de bord
        </Link>
      </div>
    </div>
  );
}

/*
================================================================================
ANCIEN CODE DU KITCHEN BACKEND - COMMENTÉ LE 2026-01-25
================================================================================
Ce code a été remplacé par le nouveau tableau de bord: /admin/current_orders

L'ancien système utilisait:
- Polling direct HAF (poll-hbd, poll-euro)
- État local avec useState
- Sons d'alerte avec Audio elements
- Hydratation des menus en temps réel

Le nouveau système utilise:
- Merchant-hub centralisé avec Redis Streams
- Sync depuis merchant-hub (/api/transfers/sync-from-merchant-hub)
- Groupement des transferts dual-currency (EURO + HBD)
- Layout modernisé en deux colonnes

================================================================================

'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { getTable, hydrateMemo, HydratedOrderLine, getLatestEurUsdRate } from '@/lib/utils';
import { MenuData } from '@/lib/data/menu';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';
import Image from 'next/image';


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

... [RESTE DU CODE ANCIEN SUPPRIMÉ POUR PLUS DE CLARTÉ]

================================================================================
FIN DE L'ANCIEN CODE
================================================================================
*/
