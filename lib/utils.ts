import { Buffer } from 'buffer'; // Needed for client-side base64 encoding
import { FormattedDish, FormattedDrink, MenuData } from '@/lib/data/menu';
import { parseStringPromise } from 'xml2js';
import prisma from '@/lib/prisma';

// Interface for the return type
export interface CurrencyRate {
  date: string; // ISO string from API
  conversion_rate: number;
  isFresh: boolean;
}

/**
 * Determines the Innopay URL based on the current environment
 * @returns The base URL for the Innopay wallet service
 */
export function getInnopayUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return process.env.NEXT_PUBLIC_INNOPAY_URL || 'https://wallet.innopay.lu';
  }

  const hostname = window.location.hostname;

  if (hostname === 'localhost') {
    return 'http://localhost:3000';
  } else if (hostname === 'indies.innopay.lu' || hostname.includes('vercel.app')) {
    return 'https://wallet.innopay.lu';
  } else {
    return `http://${hostname}:3000`;
  }
}

interface HiveTransferParams {
  recipient: string;
  amountHbd: string; // e.g., "0.010"
  memo: string;
}

interface CartItem {
  id: string; // e.g., 'dish-1', 'drink-2-50cl'
  name: string;
  price: string;
  quantity: number;
  options: { [key: string]: string }; // e.g., { size: '50cl' }
}

// Fetches the latest EUR/USD rate
// On client-side: calls the API endpoint
// On server-side: uses shared business logic directly (no HTTP overhead)
export async function getLatestEurUsdRate(today: Date): Promise<CurrencyRate> {
  const todayStr = today.toISOString().split('T')[0];

  // Server-side: import and call shared business logic directly
  if (typeof window === 'undefined') {
    try {
      const { fetchCurrencyRate } = await import('@/lib/currency-service');
      return await fetchCurrencyRate(today);
    } catch (error) {
      console.warn('[UTILS] Error fetching currency rate on server:', error);
      return {
        date: today.toISOString(),
        conversion_rate: 1.0,
        isFresh: false,
      };
    }
  }

  // Client-side: call the API endpoint
  try {
    const response = await fetch(`/api/currency?today=${todayStr}`);
    if (!response.ok) {
      console.warn('[UTILS] Failed to fetch currency rate from API, status:', response.status);
      return {
        date: today.toISOString(),
        conversion_rate: 1.0,
        isFresh: false,
      };
    }
    const data: CurrencyRate = await response.json();
    return data;
  } catch (error) {
    console.warn('[UTILS] Error fetching currency rate from API:', error);
    return {
      date: today.toISOString(),
      conversion_rate: 1.0,
      isFresh: false,
    };
  }
}

// Helper for option short codes for memo
const optionShortCodes: { [key: string]: string } = {
  size: 's',
  cuisson: 'c', // Cuisson for meat dishes
  ingredient: 'i', // Ingredient for drinks with choose_one selection mode
  // Add other short codes as needed based on your item options
};

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

export function generateDistriatedHiveOp(params: HiveTransferParams, distriateSuffix?: string): string {
  const suffix = distriateSuffix || distriate(); // Use provided suffix or generate new one
  const finalMemo = params.memo ? `${params.memo} ${suffix}` : suffix; // Handle empty original memo
  params.memo = finalMemo; // Update params with the final memo
  // params.recipient = params.recipient.toLowerCase(); // Ensure recipient is lowercase
  return generateHiveTransferUrl(params); // Use the existing function to generate the URL
}

/**
 * Creates a Hive-Engine EURO token transfer operation (custom_json)
 * @param from - Sender's Hive account name
 * @param to - Recipient's Hive account name (e.g., 'innopay')
 * @param amount - Amount of EURO tokens (e.g., "25.43")
 * @param memo - Transfer memo (just the distriateSuffix for customer→innopay)
 * @returns Custom JSON operation object ready to be signed and broadcast
 */
export function createEuroTransferOperation(
  from: string,
  to: string,
  amount: string,
  memo: string
) {
  return {
    required_auths: [from],
    required_posting_auths: [],
    id: 'ssc-mainnet-hive',
    json: JSON.stringify({
      contractName: 'tokens',
      contractAction: 'transfer',
      contractPayload: {
        symbol: 'EURO',
        to: to,
        quantity: amount,
        memo: memo
      }
    })
  };
}

/**
 * Signs and broadcasts a Hive operation using the active key
 * @param operation - The Hive operation to broadcast (e.g., custom_json for EURO transfer)
 * @param activePrivateKey - The active private key from localStorage
 * @returns Transaction ID if successful
 */
export async function signAndBroadcastOperation(
  operation: any,
  activePrivateKey: string
): Promise<string> {
  console.log('[SIGN] Starting broadcast...', { operation });

  try {
    const { Client, PrivateKey } = await import('@hiveio/dhive');
    console.log('[SIGN] dhive imported');

    const client = new Client([
      'https://api.hive.blog',
      'https://api.deathwing.me',
      'https://hive-api.arcange.eu'
    ], {
      timeout: 15000, // 15 second timeout
      failoverThreshold: 3
    });
    console.log('[SIGN] Client created');

    const key = PrivateKey.fromString(activePrivateKey);
    console.log('[SIGN] Key parsed');

    console.log('[SIGN] Sending operation to blockchain...');
    const result = await client.broadcast.sendOperations(
      [['custom_json', operation]],
      key
    );
    console.log('[SIGN] Broadcast successful!', result);

    return result.id; // Transaction ID
  } catch (error: any) {
    console.error('[SIGN] Broadcast error:', error);
    throw new Error(`Broadcast failed: ${error.message || error}`);
  }
}

export function dehydrateMemo(cart: CartItem[]): string {
  const cartMemoParts: string[] = [];

  cart.forEach(item => {
    let itemMemo = '';
    let baseId = '';
    let itemTypePrefix = '';

    if (item.id.startsWith('dish-')) {
      itemTypePrefix = 'd';
      baseId = item.id.replace('dish-', '');
    } else if (item.id.startsWith('drink-')) {
      const parts = item.id.split('-');
      if (parts.length >= 2) {
        itemTypePrefix = 'b';
        baseId = parts[1]; // Get the numeric ID part
      } else {
        console.warn('Malformed drink ID in cart during dehydration:', item.id);
        return;
      }
    } else {
      console.warn('Unknown item ID format in cart during dehydration:', item.id);
      return;
    }

    itemMemo = `${itemTypePrefix}:${baseId}`;

    Object.keys(item.options).forEach(optionKey => {
      const shortCode = optionShortCodes[optionKey];
      if (shortCode && item.options[optionKey]) {
        itemMemo += `,${shortCode}:${item.options[optionKey]}`;
      }
    });

    if (item.quantity > 1) {
      itemMemo += `,q:${item.quantity}`;
    }
    cartMemoParts.push(itemMemo);
  });

  let forReturnMemo = cartMemoParts.join(';') 
  // alert(`dehydrateMemo - forReturnMemo: '${forReturnMemo}'`); // Debug log to check the final memo
  return forReturnMemo.trim(); // Trim any extra whitespace
}

// --- NEW TYPE for structured memo content ---
export type HydratedOrderLine =
  | { type: 'item'; quantity: number; description: string; categoryType: 'dish' | 'drink' }
  | { type: 'separator' }
  | { type: 'raw'; content: string }; // For non-codified memos

// --- MODIFIED hydrateMemo function to return structured data ---
export function hydrateMemo(rawMemo: string, menuData: MenuData): HydratedOrderLine[] {
  const tableIndex = rawMemo.lastIndexOf('TABLE ');
  let orderContent = rawMemo;
  if (tableIndex !== -1) {
    orderContent = rawMemo.substring(0, tableIndex).trim();
  }
  console.log(`hydrateMemo - orderContent: '${orderContent}'`); // Debug log to check the order content
  // alert(`hydrateMemo - orderContent: '${orderContent}'`); // Debug log to check the order content
  // Check if the orderContent is likely a codified order
  // This regex checks for item identifiers like 'd:1' or 'b:2' and at least one semicolon.
  if (!/(?:d:\d+|b:\d+)/.test(orderContent) || !orderContent.includes(';')) {
    // If not a codified memo, return it as a single 'raw' item
    return [{ type: 'raw', content: orderContent }];
  }

  const itemStrings = orderContent.split(';').filter(s => s.trim() !== '');

  const hydratedParts: HydratedOrderLine[] = [];
  let hasDishes = false;
  let hasDrinks = false;

  const dishMap = new Map<string, FormattedDish>();
  menuData.dishes.forEach(d => dishMap.set(d.id, d));

  const drinkMap = new Map<string, FormattedDrink>();
  menuData.drinks.forEach(d => drinkMap.set(d.id, d));

  itemStrings.forEach(itemString => {
    const parts = itemString.split(',');
    const idPart = parts[0]; // e.g., "d:25-rare" or "b:2-large"
    const options: { [key: string]: string } = {};
    let quantity = 1;

    for (let i = 1; i < parts.length; i++) {
      const [key, value] = parts[i].split(':');
      if (key === 'q') {
        quantity = parseInt(value, 10);
      } else if (key === 's') {
        options.size = value;
      } else if (key === 'c') {
        options.cuisson = value; // Cuisson for meat dishes
      } else if (key === 'i') {
        options.ingredient = value; // Ingredient for drinks
      }
    }

    const [typePrefix, dehydratedBaseId] = idPart.split(':'); // dehydratedBaseId is like "25-rare" or "2-large"
   // --- Key Change Here: Strip the suffix for database lookup ---
    const strippedLookupId = dehydratedBaseId.split('-')[0]; // This gets "25" from "25-rare" or "2" from "2-large"    
    let actualItemIdForLookup: string; // This will be "dish-25" or "drink-2"    
    if (typePrefix === 'd') {
        actualItemIdForLookup = `dish-${strippedLookupId}`; // Construct "dish-25" for lookup
    } else if (typePrefix === 'b') {
        actualItemIdForLookup = `drink-${strippedLookupId}`; // Construct "drink-2" for lookup
    } else {
        console.warn(`Unknown item type prefix in memo: ${typePrefix}. Skipping item.`);
        return; // Skip processing this malformed item string
    }  
    // const fullId = `${typePrefix === 'd' ? 'dish' : 'drink'}-${baseId}`;

    if (typePrefix === 'd') {
      const dish = dishMap.get(actualItemIdForLookup);
      if (dish) {
        let description = dish.name;
        // Append cuisson option to description if present for display
        if (options.cuisson) {
          // Capitalize first letter of cuisson for display (e.g., "Rare", "Medium")
          description = `${description} (${options.cuisson.charAt(0).toUpperCase() + options.cuisson.slice(1)})`;
        }        
        hydratedParts.push({ type: 'item', categoryType: 'dish', quantity, description: dish.name + (options.cuisson ? ` (${options.cuisson})` : '')  });
        hasDishes = true;
      } else {
        hydratedParts.push({ type: 'item', categoryType: 'dish', quantity, description: `Unknown Dish ID: ${dehydratedBaseId}` });
        hasDishes = true;
      }
    } else if (typePrefix === 'b') {
      const drink = drinkMap.get(actualItemIdForLookup);
      if (drink) {
        let description = drink.name;
        // Add ingredient to description if present (for juices, teas, infusions)
        if (options.ingredient) {
          description = `${description} (${options.ingredient})`;
        }
        // Add size to description if present
        if (options.size) {
          const sizeObj = drink.availableSizes.find(s => s.size === options.size);
          if (sizeObj) {
            description = `${description} ${sizeObj.size}`;
          } else {
            description = `${description} (Size: ${options.size})`;
          }
        }
        hydratedParts.push({ type: 'item', categoryType: 'drink', quantity, description });
        hasDrinks = true;
      } else {
        hydratedParts.push({ type: 'item', categoryType: 'drink', quantity, description: `Unknown Drink ID: ${dehydratedBaseId}` });
        hasDrinks = true;
      }
    }
  });

  // Add separator if both dishes and drinks are present and clear groups exist
  if (hasDishes && hasDrinks) {
      const dishIndices = hydratedParts.map((item, index) => item.type === 'item' && item.categoryType === 'dish' ? index : -1).filter(index => index !== -1);
      const drinkIndices = hydratedParts.map((item, index) => item.type === 'item' && item.categoryType === 'drink' ? index : -1).filter(index => index !== -1);

      if (dishIndices.length > 0 && drinkIndices.length > 0) {
          // If all dishes appear before all drinks, insert separator after the last dish
          if (Math.max(...dishIndices) < Math.min(...drinkIndices)) {
              hydratedParts.splice(Math.max(...dishIndices) + 1, 0, { type: 'separator' });
          }
          // If all drinks appear before all dishes, insert separator after the last drink
          else if (Math.max(...drinkIndices) < Math.min(...dishIndices)) {
              hydratedParts.splice(Math.max(...drinkIndices) + 1, 0, { type: 'separator' });
          }
          // If items are intermingled (e.g., dish, drink, dish), a single separator isn't appropriate.
          // For simplicity in this scope, we only add if there are clear groups.
      }
  }

  return hydratedParts;
}