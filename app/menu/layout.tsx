import type { ReactNode } from 'react';
import { getCachedMenuData, type MenuData } from '@/lib/data/menu';
import { InitialMenuProvider } from '@/lib/data/menu-context';
import { I18nProvider } from '@/lib/i18n';

// Rendered per request: the page reads the URL (table number, hub return parameters) while it
// renders, and a static page would fall back to client-only rendering at the nearest Suspense
// boundary, i.e. the empty shell we are getting rid of. The menu itself comes from Next's shared
// data cache (lib/data/menu.ts), so a warm request does not touch the database.
export const dynamic = 'force-dynamic';

async function loadMenu(): Promise<MenuData | null> {
  try {
    const menu = await getCachedMenuData();
    // Exactly what /api/menu sends over the wire: plain JSON (Prisma Decimals and Dates become
    // strings), which is also the only shape a server component may pass to a client component.
    return JSON.parse(JSON.stringify(menu)) as MenuData;
  } catch (error) {
    console.error('[MENU LAYOUT] Server-side menu load failed; the page will fetch it:', error);
    return null;
  }
}

export default async function MenuLayout({ children }: { children: ReactNode }) {
  const menu = await loadMenu();
  // An empty menu (the API's last-resort shape) is treated like a failure: let the client retry.
  const usable = menu && (menu.dishes.length > 0 || menu.drinks.length > 0) ? menu : null;
  return (
    <I18nProvider>
      <InitialMenuProvider menu={usable}>{children}</InitialMenuProvider>
    </I18nProvider>
  );
}
