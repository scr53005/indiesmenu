'use client';

import React from 'react';
import { MiniWallet as Wallet, type PulseState } from '@innopay/ui';
import { forgetLocalWallet } from '@/lib/innopay/forget-wallet';
import { getInnopayUrl } from '@/lib/utils';

export { WalletReopenButton } from '@innopay/ui';
export type { PulseState } from '@innopay/ui';
export interface WalletBalance { accountName: string; euroBalance: number }
interface Props {
  balance: WalletBalance;
  onClose: () => void;
  visible: boolean;
  language?: string;
  title?: string;
  initialPosition?: { x: number; y: number };
  balanceSource?: string;
  pulseState?: PulseState;
  onPulseReset?: () => void;
}

/** App adapter: currency, hub navigation and local removal stay here. */
export default function MiniWallet({ balance, balanceSource, ...props }: Props) {
  return <Wallet {...props} accountName={balance.accountName}
    balanceLabel={`${balance.euroBalance.toFixed(2)} €`} accountUrl={`${getInnopayUrl()}/user`}
    cached={balanceSource === 'localStorage-cache'} onForget={() => forgetLocalWallet()}
    colors={{ waiting: 'linear-gradient(to right, #2563eb, #1d4ed8)',
      confirmed: 'linear-gradient(to right, #16a34a, #15803d)', problem: 'linear-gradient(to right, #7f1d1d, #991b1b)' }}
    pulseOpacity={.88} pulseScale={1.02} />;
}
