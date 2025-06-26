export function getTable(memo: string, returnBoolean: boolean=false): string | boolean{
    const tableIndex = memo.lastIndexOf('TABLE ');
    if (tableIndex === -1) {
        return returnBoolean ? false : 'no table information found';
    }

    if (returnBoolean) {
        return true;
    }

    const sub = memo.substring(tableIndex + 'TABLE '.length); // Get the part after 'TABLE '
    const match = sub.match(/^(\d+) /); // Match digits followed by a space

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

export function generateDistriatedHiveOp(recipient: string, amountHbd: string, memo: string): string {
  const distriateSuffix = distriate(); // Call without args to use 'kcs' default
  const finalMemo = memo ? `${memo} ${distriateSuffix}` : distriateSuffix; // Handle empty original memo
  const amountNum = parseFloat(amountHbd);

  if (isNaN(amountNum)) {
    // Consider how to handle errors, perhaps throw or return an error string
    // For now, let's adapt the throw from the original function
    throw new Error(`Invalid amount_hbd: ${amountHbd}`);
  }

  const operation = [
    'transfer',
    {
      to: recipient,
      amount: `${amountNum.toFixed(3)} HBD`,
      memo: finalMemo,
    },
  ];

  // Node.js Buffer for Base64 encoding
  const encodedOperation = Buffer.from(JSON.stringify(operation)).toString('base64');
  return `hive://sign/op/${encodedOperation}`;
}