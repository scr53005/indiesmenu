'use client';

// The customer menu (R3, replaces the useState + fetch effect in app/menu/page.tsx).
// The server normally sends the menu with the page (app/menu/layout.tsx) and it becomes the
// query's initial data: no request at all. Only when the server had no menu does this fetch
// /api/menu, with React Query's retries.
//
// No background refetching: the menu does not change during service, and a reload already gets
// the fresh one from the server (admin saves clear the shared cache, lib/data/menu.ts).
import { useQuery } from '@tanstack/react-query';
import type { MenuData } from '@/lib/data/menu';

const EMPTY_MENU: MenuData = { categories: [], dishes: [], drinks: [], cuissons: [], ingredients: [], conversion_rate: 1.0 };

async function fetchMenu(): Promise<MenuData> {
  const response = await fetch('/api/menu');
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export function useMenu(initialMenu: MenuData | null) {
  const query = useQuery({
    queryKey: ['menu'],
    queryFn: fetchMenu,
    initialData: initialMenu ?? undefined,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
  return {
    menu: query.data ?? EMPTY_MENU,
    /** True only while the fallback fetch is running (never when the server sent the menu). */
    loading: query.isPending,
    error: query.error ? query.error.message : null,
    /** The menu is there (from the server or the fallback fetch). */
    ready: query.data !== undefined,
  };
}
