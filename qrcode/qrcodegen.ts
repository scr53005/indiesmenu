import * as QRCodeModule from 'qrcode';
import { Pool } from 'pg';
import { promises as fs } from 'fs';
import * as path from 'path';
import sharp from 'sharp';

// Database connection configuration for nextappdb
const pool = new Pool({
  user: 'Sorin',
  database: 'nextappdb',
  password: '', // Replace with actual password
  host: 'localhost',
  port: 5432,
});

// Base output directory
const baseOutputDir = 'C:\\Users\\Sorin\\Documents\\Work\\OffChain';

// Function to sanitize memo for Windows filenames
function sanitizeFileName(memo: string): string {
  return memo
    .replace(/[<>:"/\\|?*]+/g, '') // Remove invalid Windows characters
    .replace(/[\x00-\x1F]+/g, '') // Remove control characters
    .trim(); // Remove leading/trailing spaces
}

// Function to generate Hive operation URI
function generateHiveOpUri(recipient: string, amountHbd: string, memo: string): string {
  const amountNum = parseFloat(amountHbd);
  if (isNaN(amountNum)) {
    throw new Error(`Invalid amount_hbd: ${amountHbd}`);
  }
  const operation = [
    'transfer',
    {
      to: recipient,
      amount: `${amountNum.toFixed(3)} HBD`,
      memo: memo,
    },
  ];
  const encodedOperation = Buffer.from(JSON.stringify(operation)).toString('base64');
  return `hive://sign/op/${encodedOperation}`;
}

// Function to generate QR codes with a logo
async function generateQRCodesForOrders(): Promise<void> {
  try {
    const query = `
      SELECT order_id, recipient, amount_hbd, memo
      FROM orders
      ORDER BY order_id
    `;
    const { rows } = await pool.query(query);

    if (rows.length === 0) {
      console.log('No orders found in the database.');
      return;
    }

    for (const row of rows) {
      const { order_id, recipient, amount_hbd, memo } = row;

      const hiveUri = generateHiveOpUri(recipient, amount_hbd, memo);

      const folderName = memo.substring(memo.lastIndexOf('TABLE ')); // || '.' Default to current directory if no TABLE found';
      const folderPath = path.join(baseOutputDir, folderName);

      try {
        await fs.access(folderPath);
      } catch {
        console.log(`Creating folder: ${folderPath}`);
        await fs.mkdir(folderPath, { recursive: true });
      }

      const sanitizedMemo = sanitizeFileName(memo);
      const fileName = `${sanitizedMemo}.png`;
      const filePath = path.join(folderPath, fileName);
      const tempFilePath = path.join(folderPath, `temp_${order_id}.png`);

      try {
        try {
          await fs.access(filePath);
          console.log(`Overwriting existing QR code: ${filePath}`);
        } catch {
          console.log(`Generating new QR code: ${filePath}`);
        }

        await QRCodeModule.toFile(tempFilePath, hiveUri, {
          width: 270,
          margin: 1,
          errorCorrectionLevel: 'H', // High error correction
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });

        const logoPath = path.join(process.cwd(), 'innologo-71x47.png');
        const qrImage = sharp(tempFilePath);
        const { width, height } = await qrImage.metadata();
        const logoLeft = Math.floor((width! - 71) / 2); // Center horizontally
        const logoTop = Math.floor((height! - 47) / 2); // Center vertically

        await qrImage
          .composite([{ input: logoPath, left: logoLeft, top: logoTop }])
          .toFile(filePath);

        await fs.unlink(tempFilePath);

        console.log(`QR code with logo saved for order ${order_id}: ${filePath}`);
      } catch (error) {
        console.error(`Failed to generate QR code for order ${order_id}:`, error);
      }
    }

    console.log('All QR codes generated successfully.');
  } catch (error) {
    console.error('Error querying orders or generating QR codes:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
generateQRCodesForOrders();