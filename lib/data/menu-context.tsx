'use client';

// The menu, rendered on the server by app/menu/layout.tsx and handed to the client page, so the
// first HTML already contains the dishes (INDIESMENU-REFACTOR-PLAN.md phase P). Before this, the
// page showed a skeleton, downloaded and started its whole bundle, and only then fetched /api/menu.

import { createContext, useContext, type ReactNode } from 'react';
import type { MenuData } from './menu';

const InitialMenuContext = createContext<MenuData | null>(null);

export function InitialMenuProvider({ menu, children }: { menu: MenuData | null; children: ReactNode }) {
  return <InitialMenuContext.Provider value={menu}>{children}</InitialMenuContext.Provider>;
}

/** The server-rendered menu, or null when the server could not load it (the page then fetches it). */
export function useInitialMenu(): MenuData | null {
  return useContext(InitialMenuContext);
}
