import { HydratedOrderLine } from '@/lib/utils';

interface PrintData {
  id: string;
  from_account: string;
  memo: string;
  received_at: string;
  items: HydratedOrderLine[];
  ticketType: 'CUISINE' | 'BAR';
}

/**
 * Extracts a clean table identifier from the memo.
 * Removes the distriator identifier if present.
 */
function getCleanTable(memo: string): string {
  const tableIndex = memo.lastIndexOf('TABLE ');
  if (tableIndex === -1) return 'A EMPORTER';

  const sub = memo.substring(tableIndex + 'TABLE '.length);
  const match = sub.match(/^\s?(\d+)(?:\s+|$)/);

  if (match && match[1]) {
    return `TABLE ${match[1]}`;
  }
  return 'A EMPORTER';
}

/**
 * Generates the HTML content for a thermal receipt.
 * Optimized for 80mm width.
 */
export function generateReceiptHtml(data: PrintData): string {
  const dateObj = new Date(data.received_at);
  const date = dateObj.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit',
    year: '2-digit' 
  });
  const time = dateObj.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const table = getCleanTable(data.memo);

  // Build items list with HUGE fonts (32px for quantities, 28px for descriptions)
  const itemsHtml = data.items.map(line => {
    if (line.type === 'separator') {
      return '<div style="border-bottom: 2px solid #000; margin: 8px 0;"></div>';
    }
    if (line.type === 'item') {
      return `
        <div style="display: flex; margin-bottom: 10px; align-items: flex-start; line-height: 1.1;">
          <div style="font-weight: 900; font-size: 32px; min-width: 40px;">${line.quantity > 0 ? line.quantity : ''}</div>
          <div style="font-weight: 900; font-size: 28px; flex: 1;">${line.description}</div>
        </div>
      `;
    }
    return `<div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">${line.content}</div>`;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page { size: 80mm auto; margin: 0; }
        body {
          font-family: 'Arial', sans-serif;
          width: 72mm;
          margin: 0;
          padding: 4mm;
          color: #000;
          background: #fff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          font-size: 22px;
          font-weight: bold;
          border-bottom: 3px solid #000;
          padding-bottom: 6px;
          margin-bottom: 12px;
        }
        .ticket-type {
          text-align: center;
          font-size: 24px;
          font-weight: 900;
          margin-bottom: 10px;
          text-decoration: underline;
        }
        .items {
          margin-top: 10px;
        }
        .table-section {
          font-size: 32px; /* Matches quantity font size as requested */
          font-weight: normal; /* Changed from 1000 to normal */
          margin-top: 20px;
          border-top: 2px solid #000;
          padding-top: 10px;
        }
        .footer {
          margin-top: 25px;
          font-size: 16px;
          border-top: 1px dashed #666;
          padding-top: 8px;
        }
        .transfer-id {
          font-family: monospace;
          font-size: 12px;
          margin-top: 4px;
          color: #444;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <span>${time}</span>
        <span>${date}</span>
      </div>

      <div class="ticket-type">${data.ticketType}</div>

      <div class="items">
        ${itemsHtml}
      </div>

      <div class="table-section">
        ${table}
      </div>

      <div class="footer">
        Client: @${data.from_account}
        <div class="transfer-id">ID: ${data.id}</div>
      </div>
      <div style="height: 30mm;"></div> <!-- Space for the cutter -->
    </body>
    </html>
  `;
}
