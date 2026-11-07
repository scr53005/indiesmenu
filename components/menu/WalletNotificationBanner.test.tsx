// @vitest-environment jsdom
// "Créer un compte" must show at once that the tap worked (sunk + "Un instant…") and ignore a
// second tap while the hub loads; it springs back when the page did not leave, or on bfcache.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import WalletNotificationBanner from './WalletNotificationBanner';

let cleanup: (() => void) | null = null;
afterEach(() => { cleanup?.(); cleanup = null; vi.useRealTimers(); });

function renderBanner(
  onCreateAccount: () => boolean | void,
  props: { guestCheckoutStarted?: boolean; importDisabled?: boolean; cartEmpty?: boolean } = {},
): HTMLButtonElement {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const noop = () => {};
  act(() => root.render(
    <WalletNotificationBanner
      topOffset="0px" isSafariBanner cartEmpty={props.cartEmpty ?? true} isCallWaiterFlow={false}
      importDisabled={props.importDisabled ?? false}
      guestCheckoutStarted={props.guestCheckoutStarted ?? false} table="7" recipient="indies.cafe"
      onImportAccount={noop} onCreateAccount={onCreateAccount} onExternalWallet={noop}
      onGuestCheckout={noop} onDismiss={noop}
    />,
  ));
  cleanup = () => { act(() => root.unmount()); host.remove(); };
  return [...host.querySelectorAll('button')].find(b => /Créer un compte/.test(b.textContent ?? ''))!;
}

it('one tap: sunk with "Un instant…", a second tap does nothing', () => {
  const onCreate = vi.fn(() => true);
  const button = renderBanner(onCreate);
  act(() => button.click());
  expect(button.textContent).toContain('Un instant…');
  expect(button.getAttribute('aria-busy')).toBe('true');
  expect(button.className).toContain('translate-y-[3px]');
  act(() => button.click());
  expect(onCreate).toHaveBeenCalledTimes(1);
});

it('springs back when the page did not leave (duplicate-order modal)', () => {
  const button = renderBanner(() => false);
  act(() => button.click());
  expect(button.textContent).toContain('Créer un compte');
  expect(button.getAttribute('aria-busy')).toBe('false');
});

it('springs back on the back button (bfcache) and after 15 s without leaving', () => {
  vi.useFakeTimers();
  const button = renderBanner(() => true);
  act(() => button.click());
  const back = new Event('pageshow') as PageTransitionEvent;
  Object.defineProperty(back, 'persisted', { value: true });
  act(() => { window.dispatchEvent(back); });
  expect(button.textContent).toContain('Créer un compte');

  act(() => button.click());
  expect(button.textContent).toContain('Un instant…');
  act(() => { vi.advanceTimersByTime(15_000); });
  expect(button.textContent).toContain('Créer un compte');
});

const buttonsOf = (anyButton: HTMLButtonElement) => [...anyButton.closest('div')!.parentElement!.querySelectorAll('button')];
const byText = (buttons: HTMLButtonElement[], re: RegExp) => buttons.find(b => re.test(b.textContent ?? ''))!;

it('every banner button is a raised key with instant touch feedback', () => {
  const create = renderBanner(() => true, { cartEmpty: false }); // non-empty cart: external wallet shown
  const buttons = buttonsOf(create);
  for (const re of [/Importer un compte/, /Créer un compte/, /Portefeuille externe/, /Commandez sans compte/]) {
    const b = byText(buttons, re);
    expect(b.className, re.source).toContain('shadow-[');
    expect(b.className, re.source).toContain('active:translate-y-');
    expect(b.style.touchAction, re.source).toBe('manipulation');
  }
});

it('guest checkout started: the guest key stays sunk; disabled import is flat', () => {
  const create = renderBanner(() => true, { guestCheckoutStarted: true, importDisabled: true });
  const buttons = buttonsOf(create);
  const guest = byText(buttons, /Commandez sans compte/);
  expect(guest.className).toContain('translate-y-[2px]');
  expect(guest.className).not.toContain('active:translate-y-');
  const importButton = byText(buttons, /Importer un compte/);
  expect(importButton.className).not.toContain('shadow-[');
});
