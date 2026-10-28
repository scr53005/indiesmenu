'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { menuRequest } from '@/lib/admin/menu-client';
import { toggleImageAssignment, type ImageAssignment } from '@/lib/admin/image-assignments';
import type { AdminDish, AdminDrink } from '@/lib/admin/menu';

interface Match { id: number; name: string; type: 'dish' | 'drink'; similarity: number; currentImage: string | null }
interface ImageMatch { imageName: string; matches: Match[] }

export function MenuImageAssociations({ dishes, drinks, onPendingChange }: {
  dishes: AdminDish[];
  drinks: AdminDrink[];
  onPendingChange: (count: number) => void;
}) {
  const client = useQueryClient();
  const [selections, setSelections] = useState<ImageAssignment[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { onPendingChange(selections.length); }, [selections.length, onPendingChange]);
  const images = useQuery({
    queryKey: ['admin-menu', 'images'],
    queryFn: async () => {
      const detected = await menuRequest<{ images: string[]; source: string }>('/api/admin/detect-new-images');
      const matched = detected.images.length ? await menuRequest<{ results: ImageMatch[] }>('/api/admin/match-images', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageNames: detected.images }),
      }) : { results: [] };
      return { ...detected, results: matched.results };
    },
    refetchOnWindowFocus: false,
    retry: false,
  });
  const targets = [
    ...dishes.map(d => ({ id: d.dish_id, type: 'dish' as const, name: d.name, image: d.image })),
    ...drinks.map(d => ({ id: d.drink_id, type: 'drink' as const, name: d.name, image: d.image })),
  ];
  const select = (imageName: string, itemType: 'dish' | 'drink', itemId: number) =>
    setSelections(prev => toggleImageAssignment(prev, { imageName, itemType, itemId }));
  const apply = async () => {
    setSaving(true); setError(null); setMessage(null);
    try {
      const result = await menuRequest<{ dishesUpdated: number; drinksUpdated: number }>('/api/admin/update-images', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignments: selections }),
      });
      setSelections([]);
      setMessage(`${result.dishesUpdated} plat(s) et ${result.drinksUpdated} boisson(s) mis à jour.`);
      await client.invalidateQueries({ queryKey: ['admin-menu'] });
      await client.invalidateQueries({ queryKey: ['menu'] });
    } catch (err) { setError(err instanceof Error ? err.message : 'Association impossible.'); }
    finally { setSaving(false); }
  };
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-gray-600">Images non attribuées de public/images. Pour importer ou réutiliser une image, ouvrez aussi la fiche du produit.</p>
      <button type="button" disabled={saving || images.isFetching} className="rounded border px-3 py-1.5 text-sm disabled:opacity-50" onClick={() => { if (!selections.length || confirm('Abandonner les associations en attente et actualiser ?')) { setSelections([]); void images.refetch(); } }}>Actualiser</button>
    </div>
    {images.isPending && <p role="status">Recherche des images…</p>}
    {(error || images.error) && <p role="alert" className="rounded bg-red-50 p-2 text-red-800">{error || images.error?.message}</p>}
    {message && <p role="status" className="rounded bg-green-50 p-2 text-green-800">{message}</p>}
    {images.data && !images.data.results.length && <p className="rounded border bg-white p-3 text-sm">Aucune image non attribuée détectée.</p>}
    <fieldset disabled={saving} className="space-y-3">
      {images.data?.results.map(image => {
        const assigned = selections.filter(s => s.imageName === image.imageName);
        const visible = targets.filter(t => image.matches.some(m => m.id === t.id && m.type === t.type) || assigned.some(s => s.itemId === t.id && s.itemType === t.type));
        return <article key={image.imageName} className="flex flex-col gap-3 rounded border bg-white p-3 sm:flex-row">
          <img src={`/images/${image.imageName}`} alt={image.imageName} className="h-24 w-24 shrink-0 rounded object-contain" />
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="break-all text-sm font-semibold">{image.imageName}</h3>
            {visible.map(target => <label key={`${target.type}:${target.id}`} className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={assigned.some(s => s.itemType === target.type && s.itemId === target.id)} onChange={() => select(image.imageName, target.type, target.id)} />
              <span>{target.name} <span className="text-gray-500">({target.type === 'dish' ? 'plat' : 'boisson'})</span>{target.image && <span className="block break-all text-xs text-gray-500">Image actuelle : {target.image}</span>}</span>
            </label>)}
            <label className="block text-sm">Associer un autre produit
              <select aria-label={`Choisir un produit pour ${image.imageName}`} value="" className="mt-1 w-full rounded border bg-white p-1.5" onChange={e => {
                const target = targets.find(t => `${t.type}:${t.id}` === e.target.value);
                if (target && !assigned.some(s => s.itemType === target.type && s.itemId === target.id)) select(image.imageName, target.type, target.id);
              }}>
                <option value="">Choisir dans toute la carte…</option>
                {targets.map(t => <option key={`${t.type}:${t.id}`} value={`${t.type}:${t.id}`}>{t.type === 'dish' ? 'Plat' : 'Boisson'} · {t.name}</option>)}
              </select>
            </label>
          </div>
        </article>;
      })}
    </fieldset>
    {selections.length > 0 && <div className="sticky bottom-0 flex items-center justify-between gap-2 rounded border bg-white p-3 shadow">
      <span className="text-sm">{selections.length} association(s) en attente</span>
      <button type="button" onClick={() => void apply()} disabled={saving} className="rounded bg-blue-700 px-3 py-2 text-sm text-white disabled:opacity-50">{saving ? 'Enregistrement…' : 'Appliquer les associations'}</button>
    </div>}
  </section>;
}
