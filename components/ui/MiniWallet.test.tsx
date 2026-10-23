// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import MiniWallet from './MiniWallet';

it('expands, hides and reopens without losing the balance or invoking close', () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const onClose = vi.fn();
  const render = (visible: boolean) => act(() => root.render(
    <MiniWallet balance={{ accountName: 'alice', euroBalance: 12.5 }} visible={visible} onClose={onClose} />,
  ));
  try {
    render(true);
    const toggle = host.querySelector('[aria-expanded]')!;
    act(() => toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(host.textContent).toContain('alice');
    expect(onClose).not.toHaveBeenCalled();
    render(false);
    expect(host.children.length).toBe(0);
    render(true);
    expect(host.querySelector('[aria-expanded]')?.getAttribute('aria-expanded')).toBe('false');
    expect(host.textContent).toContain('alice');
  } finally {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
