// @vitest-environment jsdom
// R2 regression guard: the overlays moved out of app/menu/page.tsx must show exactly the French
// text they showed inline, including the sentences rebuilt from nested placeholders.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/i18n';
import GuestCheckoutModal from './GuestCheckoutModal';
import ImportAccountModal from './ImportAccountModal';
import { RestaurantClosedPopup } from './ClosedNotices';

let cleanup: (() => void) | null = null;
afterEach(() => { cleanup?.(); cleanup = null; });

function render(node: React.ReactNode): HTMLElement {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<I18nProvider>{node}</I18nProvider>));
  cleanup = () => { act(() => root.unmount()); host.remove(); };
  return host;
}

const text = (el: HTMLElement) => el.textContent?.replace(/\s+/g, ' ').trim();
const noop = () => {};

it('guest order warning keeps its French sentences', () => {
  const host = render(
    <GuestCheckoutModal open waiterFlow={false} processing={false} seconds={0} guestTotal="21.00" discountLost="2.00" onProceed={noop} onBack={noop} />,
  );
  const body = text(host)!;
  expect(body).toContain('Commander sans compte implique une charge supplémentaire de 5% liée aux commissions de carte bancaire.');
  expect(body).toContain('En commandant sans créer un compte vous renoncez à un discount de: 2.00 €');
  expect(body).toContain('Continuer et payer 21.00 €');
  expect(body).toContain('Revenir pour bénéficier');
});

it('guest order warning hides the discount line when nothing is lost', () => {
  const host = render(
    <GuestCheckoutModal open waiterFlow={false} processing={false} seconds={0} guestTotal="21.00" discountLost="0.00" onProceed={noop} onBack={noop} />,
  );
  expect(text(host)).not.toContain('renoncez');
});

it('guest waiter warning and the redirect state', () => {
  const host = render(
    <GuestCheckoutModal open waiterFlow processing seconds={3} guestTotal="0" discountLost="0" onProceed={noop} onBack={noop} />,
  );
  const body = text(host)!;
  expect(body).toContain('Appeler un serveur sans compte coûte 1.00€ (commission carte bancaire).');
  expect(body).toContain('En créant un compte Innopay gratuit, ce service ne coûte que 0.02€.');
  expect(body).toContain('Redirection vers le paiement (3s)');
  expect(body).not.toContain('Créer un compte (0.02€)'); // hidden while redirecting
});

it('import modal: singular/plural attempts and the code step', () => {
  const props = {
    open: true, error: '', loading: false, email: 'a@b.lu', onEmailChange: noop, code: '', onCodeChange: noop,
    accounts: [], onClose: noop, onRequestCode: noop, onVerifyCode: noop, onBackToEmail: noop, onSelectAccount: noop,
  };
  expect(text(render(<ImportAccountModal {...props} step="email" attemptsLeft={1} />))).toContain('1 tentative restante');
  cleanup?.();
  expect(text(render(<ImportAccountModal {...props} step="email" attemptsLeft={4} />))).toContain('4 tentatives restantes');
  cleanup?.();
  expect(text(render(<ImportAccountModal {...props} step="code" attemptsLeft={4} />))).toContain('Un code de vérification a été envoyé à a@b.lu');
});

it('restaurant closed popup puts the day and time in its sentences', () => {
  const host = render(<RestaurantClosedPopup info={{ fr: 'demain', en: 'tomorrow', openTime: '11h45' }} onClose={noop} />);
  const body = text(host)!;
  expect(body).toContain('Merci de nous rendre visite à nouveau demain à partir de 11h45.');
  expect(body).toContain('The restaurant is closed. Please visit us again tomorrow from 11h45.');
});
