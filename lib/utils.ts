import { Buffer } from 'buffer'; // Needed for client-side base64 encoding

interface HiveTransferParams {
  recipient: string;
  amountHbd: string; // e.g., "0.010"
  memo: string;
}

export function generateHiveTransferUrl(params: HiveTransferParams): string {
  const { recipient, amountHbd, memo } = params;

  // Validate amountHbd
  const checkHbd = parseFloat(amountHbd);
    if (isNaN(checkHbd)) {
    // Consider how to handle errors, perhaps throw or return an error string
    // For now, let's adapt the throw from the original function
    throw new Error(`Invalid amount HBD: ${amountHbd}`);
  }
  const checkedHbd = checkHbd.toFixed(3); // Ensure 3 decimal places for HBD

  const operation = [
    'transfer',
    {
      to: recipient,
      amount: `${checkedHbd} HBD`, // Ensure 3 decimal places for HBD
      memo: memo,
    },
  ];

  // Encode the operation to base64
  const encodedOperation = 'hive://sign/op/' + Buffer.from(JSON.stringify(operation)).toString('base64');

  return encodedOperation;
}

export function getTable(memo: string, returnBoolean: boolean=false): string | boolean{
    const tableIndex = memo.lastIndexOf('TABLE ');
    if (tableIndex === -1) {
        return returnBoolean ? false : 'no table information found';
    }

    if (returnBoolean) {
        return true;
    }

    const sub = memo.substring(tableIndex + 'TABLE '.length); // Get the part after 'TABLE '
    console.log(`getTable - sub:\'${sub}\'`); // Debug log to check the substring
    const match = sub.match(/^\s?(\d+)(?:\s+|$)/); // Match digits followed by a space

    if (match && match[1]) {
        return match[1]; // Return the captured digits
    } else {
        return 'no table information found'; // Or appropriate error/default
    }
}

export function distriate(tag?: string): string {
    const effectiveTag = tag || 'kcs';
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart1 = '';
    let randomPart2 = '';

    for (let i = 0; i < 4; i++) {
        randomPart1 += chars.charAt(Math.floor(Math.random() * chars.length));
        randomPart2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${effectiveTag}-inno-${randomPart1}-${randomPart2}`;
}

export function generateDistriatedHiveOp(params: HiveTransferParams): string {
  const distriateSuffix = distriate(); // Call without args to use 'kcs' default
  const finalMemo = params.memo ? `${params.memo} ${distriateSuffix}` : distriateSuffix; // Handle empty original memo
  params.memo = finalMemo; // Update params with the final memo
  // params.recipient = params.recipient.toLowerCase(); // Ensure recipient is lowercase 
  return generateHiveTransferUrl(params); // Use the existing function to generate the URL
}