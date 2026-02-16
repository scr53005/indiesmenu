'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lato } from 'next/font/google';

const lato = Lato({
  weight: ['300', '400', '700'],
  subsets: ['latin'],
});

interface Transaction {
  id: string;
  timestamp: string;
  from_account: string;
  amount: string;
  memo: string;
  block_num?: number;
}

interface ReportRow {
  date: string;
  time: string;
  id: string;
  from_account: string;
  amount_hbd: number;
  rate: number;
  amount_eur: number;
}

function getMerchantHubUrl(): string {
  return process.env.NEXT_PUBLIC_MERCHANT_HUB_URL || 'https://merchant-hub-theta.vercel.app';
}

function getHiveAccount(): string {
  // Determine account based on environment (same pattern as current_orders)
  const databaseUrl = process.env.NEXT_PUBLIC_DATABASE_URL || process.env.DATABASE_URL || '';
  const isDev = databaseUrl.includes('innopaydb');
  return isDev ? 'indies-test' : 'indies.cafe';
}

function formatDate(isoString: string): { date: string; time: string } {
  const d = new Date(isoString);
  const date = d.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return { date, time };
}

function getDefaultFrom(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getDefaultTo(): string {
  return new Date().toISOString().split('T')[0];
}

function exportCSV(rows: ReportRow[], from: string, to: string, account: string) {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel
  const header = 'Date;Heure;ID Transaction;Expediteur;Montant HBD;Taux EUR/USD;Montant EUR\n';
  const csvRows = rows.map(r =>
    `${r.date};${r.time};${r.id};${r.from_account};${r.amount_hbd.toFixed(3)};${r.rate.toFixed(4)};${r.amount_eur.toFixed(2)}`
  ).join('\n');

  // Totals row
  const totalHbd = rows.reduce((sum, r) => sum + r.amount_hbd, 0);
  const totalEur = rows.reduce((sum, r) => sum + r.amount_eur, 0);
  const totalsRow = `\n;;;TOTAL;;${totalHbd.toFixed(3)};;${totalEur.toFixed(2)}`;

  const blob = new Blob([BOM + header + csvRows + totalsRow], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rapport-${account}-${from}-${to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function exportPDF(rows: ReportRow[], from: string, to: string, account: string) {
  // Dynamic import to avoid loading jspdf on page load
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.text(`Rapport Comptable - ${account}`, 14, 18);
  doc.setFontSize(10);
  doc.text(`Periode: ${from} au ${to}`, 14, 26);
  doc.text(`Genere le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 32);

  const totalHbd = rows.reduce((sum, r) => sum + r.amount_hbd, 0);
  const totalEur = rows.reduce((sum, r) => sum + r.amount_eur, 0);

  autoTable(doc, {
    startY: 38,
    head: [['Date', 'Heure', 'ID Transaction', 'Expediteur', 'Montant HBD', 'Taux EUR/USD', 'Montant EUR']],
    body: rows.map(r => [
      r.date,
      r.time,
      r.id,
      r.from_account,
      r.amount_hbd.toFixed(3),
      r.rate.toFixed(4),
      r.amount_eur.toFixed(2),
    ]),
    foot: [['', '', '', 'TOTAL', totalHbd.toFixed(3), '', totalEur.toFixed(2)]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
    footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
  });

  doc.save(`rapport-${account}-${from}-${to}.pdf`);
}

export default function ReportingPage() {
  const [from, setFrom] = useState(getDefaultFrom());
  const [to, setTo] = useState(getDefaultTo());
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const account = getHiveAccount();

  const loadReport = async () => {
    setLoading(true);
    setError('');
    setRows([]);
    setTruncated(false);

    try {
      // Step 1: Fetch transactions from merchant-hub
      const hubUrl = getMerchantHubUrl();
      const txRes = await fetch(
        `${hubUrl}/api/reporting?account=${encodeURIComponent(account)}&from=${from}&to=${to}`
      );

      if (!txRes.ok) {
        const errData = await txRes.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur ${txRes.status}`);
      }

      const txData = await txRes.json();
      const transactions: Transaction[] = txData.transactions;
      setTruncated(txData.truncated || false);

      if (transactions.length === 0) {
        setRows([]);
        setLoaded(true);
        return;
      }

      // Step 2: Extract unique dates from transactions
      const uniqueDates = [...new Set(
        transactions
          .filter(tx => tx.timestamp)
          .map(tx => new Date(tx.timestamp).toISOString().split('T')[0])
      )];

      // Step 3: Fetch EUR/USD rates for those dates
      let rates: Record<string, number> = {};
      if (uniqueDates.length > 0) {
        const ratesRes = await fetch('/api/admin/rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dates: uniqueDates }),
        });

        if (ratesRes.ok) {
          const ratesData = await ratesRes.json();
          rates = ratesData.rates || {};
        } else {
          console.warn('Failed to fetch rates, using default 1.0');
        }
      }

      // Step 4: Merge transactions with rates
      const reportRows: ReportRow[] = transactions.map(tx => {
        const { date, time } = tx.timestamp
          ? formatDate(tx.timestamp)
          : { date: '?', time: '?' };

        const dateKey = tx.timestamp
          ? new Date(tx.timestamp).toISOString().split('T')[0]
          : '';

        const amountHbd = parseFloat(tx.amount) || 0;
        const rate = rates[dateKey] || 1.0;
        const amountEur = amountHbd / rate;

        return {
          date,
          time,
          id: tx.id,
          from_account: tx.from_account,
          amount_hbd: amountHbd,
          rate,
          amount_eur: amountEur,
        };
      });

      setRows(reportRows);
      setLoaded(true);
    } catch (err: any) {
      console.error('[REPORTING] Error:', err);
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const totalHbd = rows.reduce((sum, r) => sum + r.amount_hbd, 0);
  const totalEur = rows.reduce((sum, r) => sum + r.amount_eur, 0);

  return (
    <div className={`min-h-screen bg-gray-100 ${lato.className}`}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-6 shadow-lg">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="text-white hover:text-blue-200 transition-colors"
                title="Retour au tableau de bord"
              >
                <span className="text-3xl">←</span>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Rapport Comptable</h1>
                <p className="text-blue-100 text-sm">Compte: {account}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="container mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Du</label>
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Au</label>
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={loadReport}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {loading ? 'Chargement...' : 'Charger'}
            </button>

            {rows.length > 0 && (
              <>
                <button
                  onClick={() => exportCSV(rows, from, to, account)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-semibold transition-colors"
                >
                  Exporter CSV
                </button>
                <button
                  onClick={() => exportPDF(rows, from, to, account)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-semibold transition-colors"
                >
                  Exporter PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6">
            <p className="text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {/* Truncation warning */}
        {truncated && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-6">
            <p className="text-yellow-800">
              <strong>Attention:</strong> Les resultats sont limites a 5000 transactions.
              Reduisez la periode pour voir toutes les transactions.
            </p>
          </div>
        )}

        {/* Summary bar */}
        {loaded && rows.length > 0 && (
          <div className="bg-blue-50 rounded-xl p-4 mb-6 flex flex-wrap gap-8 items-center">
            <div>
              <span className="text-sm text-gray-600">Transactions</span>
              <p className="text-2xl font-bold text-gray-800">{rows.length}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Total HBD</span>
              <p className="text-2xl font-bold text-gray-800">{totalHbd.toFixed(3)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Total EUR</span>
              <p className="text-2xl font-bold text-emerald-700">{totalEur.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {loaded && rows.length === 0 && !loading && !error && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-gray-500 text-lg">Aucune transaction HBD pour cette periode.</p>
          </div>
        )}

        {/* Data table */}
        {rows.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Heure</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">ID Transaction</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Expediteur</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Montant HBD</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Taux EUR/USD</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Montant EUR</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-gray-800">{row.date}</td>
                      <td className="px-4 py-2 text-gray-800">{row.time}</td>
                      <td className="px-4 py-2 text-gray-600 font-mono text-xs">{row.id}</td>
                      <td className="px-4 py-2 text-gray-800">{row.from_account}</td>
                      <td className="px-4 py-2 text-right text-gray-800">{row.amount_hbd.toFixed(3)}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{row.rate.toFixed(4)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-emerald-700">{row.amount_eur.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300">
                    <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-800">TOTAL</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">{totalHbd.toFixed(3)}</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{totalEur.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
