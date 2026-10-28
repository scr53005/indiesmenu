'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MenuQuickEditor } from '@/components/admin/MenuQuickEditor';
import { menuRequest } from '@/lib/admin/menu-client';
import { parseMenuInput, type AdminDish } from '@/lib/admin/menu';

interface DailyData { suggestions: AdminDish[]; platsDuJour: AdminDish[] }
type DailyCategory = 'SUGGESTION' | 'PLAT DU JOUR';

export default function AdminDailySpecials() {
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const query = useQuery({
    queryKey: ['admin-menu', 'daily-specials'],
    queryFn: async (): Promise<DailyData> => {
      const [suggestions, platsDuJour] = await Promise.all([
        menuRequest<AdminDish[]>('/api/admin/dishes?category=SUGGESTION'),
        menuRequest<AdminDish[]>('/api/admin/dishes?category=PLAT DU JOUR'),
      ]);
      return { suggestions, platsDuJour };
    },
    refetchOnWindowFocus: false,
  });
  const daily = query.data;
  const refreshOtherViews = () => {
    void client.invalidateQueries({ queryKey: ['admin-menu', 'dishes'] });
    void client.invalidateQueries({ queryKey: ['menu'] });
  };
  const saved = (item: AdminDish) => {
    client.setQueryData<DailyData>(['admin-menu', 'daily-specials'], previous => previous && ({
      suggestions: previous.suggestions.map(dish => dish.dish_id === item.dish_id ? item : dish),
      platsDuJour: previous.platsDuJour.map(dish => dish.dish_id === item.dish_id ? item : dish),
    }));
    refreshOtherViews();
  };
  const addDish = async (category: DailyCategory) => {
    const name = prompt('Nom du plat :');
    if (!name) return;
    const description = category === 'SUGGESTION' ? prompt('Description détaillée :') : null;
    const price = prompt('Prix de base (€) :');
    if (price === null) return;
    setAdding(true); setError(null);
    try {
      const key = category === 'SUGGESTION' ? 'suggestions' : 'platsDuJour';
      const input = parseMenuInput({
        name, description, price_eur: price.replace(',', '.'), category,
        position: query.data?.[key].length ?? 0,
      }, 'dish', true);
      const item = await menuRequest<AdminDish>('/api/admin/dishes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
      });
      client.setQueryData<DailyData>(['admin-menu', 'daily-specials'], previous => previous && ({
        ...previous, [key]: [...previous[key], item],
      }));
      refreshOtherViews();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Création impossible.'); }
    finally { setAdding(false); }
  };
  const removeDish = async (item: AdminDish, name: string) => {
    if (!confirm(`Supprimer définitivement « ${name} » ?`)) return;
    setError(null);
    try {
      await menuRequest(`/api/admin/dishes/${item.dish_id}`, { method: 'DELETE' });
      client.setQueryData<DailyData>(['admin-menu', 'daily-specials'], previous => previous && ({
        suggestions: previous.suggestions.filter(dish => dish.dish_id !== item.dish_id),
        platsDuJour: previous.platsDuJour.filter(dish => dish.dish_id !== item.dish_id),
      }));
      refreshOtherViews();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Suppression impossible.'); }
  };

  return <main className="mx-auto max-w-7xl space-y-3 p-3 text-gray-900 sm:p-4">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-3"><Link href="/admin" className="text-sm text-blue-700">← Dashboard</Link><h1 className="text-xl font-bold">Plat du Jour & Suggestions</h1></div>
      <nav aria-label="Aperçus" className="flex flex-wrap gap-3 text-sm text-blue-700">
        <a href="/display/plat-du-jour" target="_blank" rel="noreferrer">Voir l’affichage ↗</a>
        <a href="/menu" target="_blank" rel="noreferrer">Menu ↗</a>
        <a href="/display/printout" target="_blank" rel="noreferrer">Version imprimable ↗</a>
      </nav>
    </header>
    <p className="text-xs text-gray-600">Sauvegarde automatique après 5 secondes. Remise × : 1 = aucune, 0,9 = −10 %, 0 = gratuit ; vide = aucune remise.</p>
    {(error || query.error) && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{error || query.error?.message} <button type="button" className="underline" onClick={() => { setError(null); void query.refetch(); }}>Recharger</button></p>}
    {query.isPending ? <p role="status">Chargement…</p> : daily && <div className="space-y-4 rounded-lg bg-black p-3 text-white sm:p-4">
      {([['SUGGESTION', 'suggestions', 'Suggestion'], ['PLAT DU JOUR', 'platsDuJour', 'Les plats du jour']] as const).map(([category, key, title]) =>
        <section key={category} aria-label={title} className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold uppercase text-red-500 underline">{title}</h2>
            <button type="button" disabled={adding} onClick={() => void addDish(category)} className="rounded bg-green-500 px-3 py-1.5 text-sm text-white hover:bg-green-600 disabled:opacity-50">+ Ajouter</button>
          </div>
          {daily[key].map(item => <MenuQuickEditor key={item.dish_id} kind="dish" item={item} dark editAvailability
            descriptionInline={category === 'SUGGESTION'} onSaved={record => saved(record as AdminDish)}
            onError={setError} onDelete={name => removeDish(item, name)} />)}
          {!daily[key].length && <p className="text-sm text-gray-300">Aucun plat.</p>}
        </section>)}
    </div>}
    <p className="text-xs text-gray-600">Actif : affiché sur l’écran public. Épuisé : affiché barré. Les plats inactifs restent conservés dans la base.</p>
  </main>;
}
