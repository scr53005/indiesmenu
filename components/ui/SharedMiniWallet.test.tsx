// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import MiniWallet from './SharedMiniWallet';
import { forgetLocalWallet } from '@/lib/innopay/forget-wallet';
vi.mock('@/lib/innopay/forget-wallet', () => ({ forgetLocalWallet: vi.fn() }));
vi.mock('@/lib/utils', () => ({ getInnopayUrl: () => 'https://wallet.example' }));
it('uses the installed package with app currency, hub link and confirmed local removal', () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  try {
    act(() => root.render(<MiniWallet balance={{ accountName: 'alice', euroBalance: 12.5 }}
      language="en" visible onClose={vi.fn()} />));
    expect(host.querySelector('.mw-amount')?.textContent).toBe('12.50 €');
    expect(host.querySelector('a')?.getAttribute('href')).toBe('https://wallet.example/user');
    const toggle = host.querySelector('[aria-expanded]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    act(() => toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const remove = host.querySelector('.innopay-wallet-delete')!;
    act(() => remove.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(forgetLocalWallet).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    act(() => remove.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(forgetLocalWallet).toHaveBeenCalledTimes(1);
  } finally {
    act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  }
});
