'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MenuEditor } from '@/components/admin/MenuEditor';
import { MenuQuickEditor } from '@/components/admin/MenuQuickEditor';
import { MenuImageAssociations } from '@/components/admin/MenuImageAssociations';
import { menuRequest } from '@/lib/admin/menu-client';
import { type AdminDish, type AdminDrink, type MenuInput, type MenuKind, type MenuOptions } from '@/lib/admin/menu';

type Tab = 'dish' | 'drink' | 'images';
type Editor = { kind: 'dish'; item?: AdminDish } | { kind: 'drink'; item?: AdminDrink };
const control = 'rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900';

export default function AdminCarte() {
  const client = useQueryClient();
  const [tab, setTab] = useState<Tab>('dish');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [pendingImages, setPendingImages] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dishes = useQuery({ queryKey: ['admin-menu', 'dishes'], queryFn: () => menuRequest<AdminDish[]>('/api/admin/dishes') });
  const drinks = useQuery({ queryKey: ['admin-menu', 'drinks'], queryFn: () => menuRequest<AdminDrink[]>('/api/admin/drinks') });
  const options = useQuery({ queryKey: ['admin-menu', 'options'], queryFn: () => menuRequest<MenuOptions>('/api/admin/menu-options') });
  const allDishes = dishes.data ?? [];
  const allDrinks = drinks.data ?? [];
  const names = new Map(options.data?.categories.map(c => [c.category_id, c.name]));
  const matchingName = (name: string) => name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  const filteredDishes = allDishes.filter(item => matchingName(item.name) &&
    (category === 'all' || item.categories_dishes.some(c => String(c.category_id) === category)) &&
    (status === 'all' || (status === 'visible' ? item.active === true && item.sold_out === false :
      status === 'sold-out' ? item.sold_out === true : item.active !== true)));
  const filteredDrinks = allDrinks.filter(item => matchingName(item.name) &&
    (category === 'all' || item.categories_drinks.some(c => String(c.category_id) === category)));
  const current = tab === 'drink' ? drinks : dishes;
  const categoryLabel = (ids: number[]) => ids.map(id => names.get(id) ?? String(id)).join(', ') || 'Sans catégorie';
  const inlineSaved = (item: AdminDish | AdminDrink) => {
    if ('dish_id' in item) {
      client.setQueryData<AdminDish[]>(['admin-menu', 'dishes'], previous => previous?.map(dish => dish.dish_id === item.dish_id ? item : dish));
      void client.invalidateQueries({ queryKey: ['admin-menu', 'daily-specials'] });
    } else {
      client.setQueryData<AdminDrink[]>(['admin-menu', 'drinks'], previous => previous?.map(drink => drink.drink_id === item.drink_id ? item : drink));
    }
    void client.invalidateQueries({ queryKey: ['menu'] });
  };

  const save = async (input: MenuInput) => {
    if (!editor) return;
    const kind = editor.kind;
    const id = editor.kind === 'dish' ? editor.item?.dish_id : editor.item?.drink_id;
    const url = `/api/admin/${kind === 'dish' ? 'dishes' : 'drinks'}`;
    await menuRequest(url + (id === undefined ? '' : `/${id}`), {
      method: id === undefined ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    });
    setEditor(null); setError(null);
    setMessage(`${kind === 'dish' ? 'Plat' : 'Boisson'} ${id === undefined ? 'créé' : 'mis à jour'}.`);
    await client.invalidateQueries({ queryKey: ['admin-menu'] });
    await client.invalidateQueries({ queryKey: ['menu'] });
  };
  const remove = async (kind: MenuKind, id: number, name: string) => {
    if (!confirm(`Supprimer définitivement « ${name} » et ses associations au menu ?`)) return;
    setDeleting(true); setError(null); setMessage(null);
    try {
      await menuRequest(`/api/admin/${kind === 'dish' ? 'dishes' : 'drinks'}/${id}`, { method: 'DELETE' });
      setMessage(`${kind === 'dish' ? 'Plat' : 'Boisson'} supprimé.`);
      await client.invalidateQueries({ queryKey: ['admin-menu'] });
      await client.invalidateQueries({ queryKey: ['menu'] });
    } catch (err) { setError(err instanceof Error ? err.message : 'Suppression impossible.'); }
    finally { setDeleting(false); }
  };

  return <main className="mx-auto max-w-7xl space-y-3 p-3 text-gray-900 sm:p-4">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-blue-700 hover:underline">← Dashboard</Link>
        <h1 className="text-xl font-bold">Carte & Images</h1>
      </div>
      <a href="/menu" target="_blank" rel="noreferrer" className="text-sm text-blue-700 hover:underline">Voir le menu client ↗</a>
    </header>
    <nav aria-label="Gestion de la carte" className="flex flex-wrap gap-1 border-b pb-2">
      {([['dish', `Plats (${allDishes.length})`], ['drink', `Boissons (${allDrinks.length})`], ['images', 'Associations d’images']] as const).map(([value, label]) =>
        <button type="button" key={value} aria-pressed={tab === value} className={`rounded px-3 py-2 text-sm font-semibold ${tab === value ? 'bg-blue-700 text-white' : 'bg-white hover:bg-blue-50'}`} onClick={() => {
          if (value !== tab && tab === 'images' && pendingImages && !confirm('Abandonner les associations non enregistrées ?')) return;
          if (value !== tab) setPendingImages(0);
          setTab(value); setCategory('all'); setStatus('all');
        }}>{label}</button>)}
    </nav>
    {message && <p role="status" className="rounded bg-green-50 p-2 text-sm text-green-800">{message}</p>}
    {(error || options.error) && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{error || options.error?.message} <button type="button" className="underline" onClick={() => void client.invalidateQueries({ queryKey: ['admin-menu'] })}>Réessayer</button></p>}
    {tab === 'images' ? (dishes.isPending || drinks.isPending ? <p role="status">Chargement des produits…</p> :
      dishes.error || drinks.error ? <p role="alert" className="text-red-800">{dishes.error?.message || drinks.error?.message} <button type="button" className="underline" onClick={() => void client.invalidateQueries({ queryKey: ['admin-menu'] })}>Réessayer</button></p> :
      <MenuImageAssociations dishes={allDishes} drinks={allDrinks} onPendingChange={setPendingImages} />) : <>
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Rechercher un produit" placeholder="Rechercher un produit…" className={`${control} min-w-40 flex-1`} value={search} onChange={e => setSearch(e.target.value)} />
        <select aria-label="Filtrer par catégorie" className={`${control} max-w-full`} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="all">Toutes les catégories</option>
          {options.data?.categories.filter(c => !c.type || c.type === tab).map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
        </select>
        {tab === 'dish' && <select aria-label="Filtrer par disponibilité" className={control} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">Tous les statuts</option><option value="visible">Visibles</option><option value="sold-out">Épuisés</option><option value="hidden">Masqués</option>
        </select>}
        <button type="button" disabled={!options.data || deleting} className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => setEditor(tab === 'dish' ? { kind: 'dish' } : { kind: 'drink' })}>+ {tab === 'dish' ? 'Ajouter un plat' : 'Ajouter une boisson'}</button>
      </div>
      {current.isPending ? <p role="status">Chargement de la carte…</p> : current.error ? <p role="alert" className="text-red-800">{current.error.message} <button type="button" className="underline" onClick={() => void current.refetch()}>Réessayer</button></p> :
        <section aria-label={tab === 'dish' ? 'Édition des plats' : 'Édition des boissons'} className="divide-y rounded border bg-white">
          {tab === 'dish' ? filteredDishes.map(item => <MenuQuickEditor key={item.dish_id} kind="dish" item={item}
            categoryLabel={categoryLabel(item.categories_dishes.map(c => c.category_id))} onSaved={inlineSaved} onError={setError}
            onDetails={record => setEditor({ kind: 'dish', item: record as AdminDish })} onDelete={name => remove('dish', item.dish_id, name)} />) :
            filteredDrinks.map(item => <MenuQuickEditor key={item.drink_id} kind="drink" item={item}
              categoryLabel={categoryLabel(item.categories_drinks.map(c => c.category_id))} onSaved={inlineSaved} onError={setError}
              onDetails={record => setEditor({ kind: 'drink', item: record as AdminDrink })} onDelete={name => remove('drink', item.drink_id, name)} />)}
          {(tab === 'dish' ? filteredDishes : filteredDrinks).length === 0 && <p className="p-4 text-center text-sm text-gray-500">Aucun produit ne correspond aux filtres.</p>}
        </section>}
      <p className="text-xs text-gray-600">Nom, prix et remise : saisie directe, sauvegarde après 5 secondes. Remise × : 1 = aucune, 0,9 = −10 %, 0 = gratuit. « Détails » donne accès aux autres champs et aux images.</p>
    </>}
    {editor && options.data && <MenuEditor key={`${editor.kind}:${editor.kind === 'dish' ? editor.item?.dish_id ?? 'new' : editor.item?.drink_id ?? 'new'}`}
      kind={editor.kind} dish={editor.kind === 'dish' ? editor.item : undefined} drink={editor.kind === 'drink' ? editor.item : undefined}
      options={options.data} onSave={save} onClose={() => setEditor(null)}
      images={[...allDishes, ...allDrinks].filter(item => item.image).map(item => ({ name: item.name, url: item.image! }))} />}
  </main>;
}
