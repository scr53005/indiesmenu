// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import WalletActions from './WalletActions';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const click = (element: Element) => act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));

describe('wallet actions', () => {
  it.each([['en', 'Expand', 'Collapse', 'Delete this wallet'], ['fr', 'Développer', 'Réduire', 'Effacer ce portemonnaie']])(
    'conceals actions until expanded, then collapses them (%s)', (language, expand, collapse, remove) => {
      act(() => root.render(<WalletActions accountName="alice" language={language} onForget={vi.fn()} />));
      const toggle = host.querySelector('[aria-expanded]')!;
      const panel = host.querySelector('[hidden]') as HTMLElement;
      expect(toggle.textContent).toBe(expand);
      expect(panel.hidden).toBe(true);
      expect(toggle.getAttribute('aria-controls')).toBe(panel.id);
      click(toggle);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(toggle.textContent).toBe(collapse);
      expect(panel.hidden).toBe(false);
      expect(panel.textContent).toContain(remove);
      click(toggle);
      expect(panel.hidden).toBe(true);
    },
  );

  it('only forgets the wallet after confirmation, without dragging or resetting a pulse', () => {
    const onForget = vi.fn();
    const drag = vi.fn();
    const pulse = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    act(() => root.render(<div onMouseDown={drag} onTouchStart={drag} onClick={pulse}>
      <WalletActions accountName="alice" language="en" onForget={onForget} />
    </div>));
    const toggle = host.querySelector('[aria-expanded]')!;
    act(() => {
      toggle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      toggle.dispatchEvent(new Event('touchstart', { bubbles: true }));
    });
    click(toggle);
    expect(drag).not.toHaveBeenCalled();
    expect(pulse).not.toHaveBeenCalled();
    expect(onForget).not.toHaveBeenCalled();
    const remove = host.querySelector('button')!;
    click(remove);
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('@alice'));
    expect(onForget).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    click(remove);
    expect(onForget).toHaveBeenCalledTimes(1);
    expect(pulse).not.toHaveBeenCalled();
  });

  it('shows an actionable error if storage removal fails', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    act(() => root.render(<WalletActions accountName="alice" language="en" onForget={() => { throw new Error('storage'); }} />));
    click(host.querySelector('[aria-expanded]')!);
    click(host.querySelector('button')!);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Please try again');
  });
});
