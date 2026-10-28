'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  effectivePrice, isMenuImageUrl, parseMenuInput, todayInLuxembourg,
  type AdminDish, type AdminDrink, type MenuInput, type MenuKind, type MenuOptions,
} from '@/lib/admin/menu';

const inputClass = 'w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-2 focus:outline-blue-600';
const buttonClass = 'rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 space-y-1 text-sm font-medium text-gray-700"><span>{label}</span>{children}</label>;
}

function Choices({ title, options, selected, onChange }: {
  title: string;
  options: { id: number; name: string }[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const [search, setSearch] = useState('');
  const visible = options.filter(option => option.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <fieldset className="min-w-0 rounded border border-gray-200 p-2">
    <legend className="px-1 text-sm font-semibold">{title} ({selected.length})</legend>
    {options.length > 12 && <input aria-label={`Rechercher : ${title}`} className={`${inputClass} mb-2`} placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />}
    <div className="grid max-h-36 grid-cols-1 gap-x-3 gap-y-1 overflow-y-auto sm:grid-cols-2">
      {visible.map(option => <label key={option.id} className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={selected.includes(option.id)} onChange={() => onChange(selected.includes(option.id) ? selected.filter(id => id !== option.id) : [...selected, option.id])} />
        <span>{option.name}</span>
      </label>)}
      {!visible.length && <span className="text-sm text-gray-500">Aucun résultat</span>}
    </div>
  </fieldset>;
}

function makeDraft(dish?: AdminDish, drink?: AdminDrink) {
  const item = dish ?? drink;
  const today = todayInLuxembourg();
  return {
    name: item?.name ?? '', description: item?.description ?? '', image: item?.image ?? '',
    record_date: item?.record_date.slice(0, 10) ?? today,
    price_eur: dish ? String(dish.price_eur) : '',
    discount: dish ? String(dish.discount ?? '') : '1',
    active: dish ? (dish.active === null ? '' : String(dish.active)) : 'true',
    sold_out: dish ? (dish.sold_out === null ? '' : String(dish.sold_out)) : 'false',
    position: dish ? String(dish.position ?? '') : '0',
    selection_mode: drink?.selection_mode ?? '',
    category_ids: dish?.categories_dishes.map(c => c.category_id) ?? drink?.categories_drinks.map(c => c.category_id) ?? [],
    ingredient_ids: dish?.dishes_ingredients.map(i => i.ingredient_id) ?? drink?.drinks_ingredients.map(i => i.ingredient_id) ?? [],
    cuisson_ids: dish?.dishes_cuisson.map(c => c.cuisson_id) ?? [],
    sizes: drink?.drink_sizes.map(s => ({
      size: s.size, price_eur: String(s.price_eur), discount: String(s.discount ?? ''), record_date: s.record_date.slice(0, 10),
    })) ?? [{ size: '', price_eur: '', discount: '1', record_date: today }],
  };
}

export function MenuEditor({ kind, dish, drink, options, images, onSave, onClose }: {
  kind: MenuKind;
  dish?: AdminDish;
  drink?: AdminDrink;
  options: MenuOptions;
  images: { name: string; url: string }[];
  onSave: (data: MenuInput) => Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(() => makeDraft(dish, drink));
  const initial = useRef(JSON.stringify(draft));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = Boolean(dish ?? drink);
  const title = `${editing ? 'Modifier' : 'Ajouter'} ${kind === 'dish' ? 'un plat' : 'une boisson'}`;

  useEffect(() => { dialog.current?.showModal(); }, []);
  const update = <K extends keyof typeof draft>(key: K, value: typeof draft[K]) => setDraft(prev => ({ ...prev, [key]: value }));
  const close = () => {
    if (saving || uploading) return;
    if (JSON.stringify(draft) !== initial.current && !confirm('Abandonner les modifications non enregistrées ?')) return;
    onClose();
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > 4 * 1024 * 1024) { setError('Image trop volumineuse : maximum 4 Mo.'); return; }
    setUploading(true);
    try {
      const body = new FormData(); body.set('file', file);
      const response = await fetch('/api/admin/menu-image', { method: 'POST', body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Import impossible.');
      update('image', result.url);
    } catch (err) { setError(err instanceof Error ? err.message : 'Import impossible.'); }
    finally { setUploading(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(null);
    setSaving(true);
    try {
      const common = {
        name: draft.name, description: draft.description, image: draft.image,
        record_date: draft.record_date, category_ids: draft.category_ids, ingredient_ids: draft.ingredient_ids,
      };
      const payload = kind === 'dish' ? {
        ...common, price_eur: draft.price_eur, discount: draft.discount,
        active: draft.active === '' ? null : draft.active === 'true',
        sold_out: draft.sold_out === '' ? null : draft.sold_out === 'true',
        position: draft.position === '' ? null : Number(draft.position), cuisson_ids: draft.cuisson_ids,
      } : { ...common, selection_mode: draft.selection_mode, sizes: draft.sizes };
      if (!draft.category_ids.length) throw new Error('Choisissez au moins une catégorie.');
      await onSave(parseMenuInput(payload, kind, !editing));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
      dialog.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    finally { setSaving(false); }
  };
  const allergens = [...new Set(options.ingredients.filter(i => draft.ingredient_ids.includes(i.ingredient_id))
    .flatMap(i => i.ingredients_alergenes.map(a => a.alergenes.name_fr)))];

  return <dialog ref={dialog} aria-labelledby="menu-editor-title" onCancel={event => { event.preventDefault(); close(); }}
    className="m-auto max-h-[95dvh] w-[calc(100%_-_1rem)] max-w-4xl overflow-y-auto rounded-lg bg-white p-0 text-gray-900 shadow-xl backdrop:bg-black/50">
    <form onSubmit={submit}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
        <h2 id="menu-editor-title" className="text-lg font-bold">{title}</h2>
        <button type="button" onClick={close} disabled={saving || uploading} className={buttonClass} aria-label="Fermer le formulaire">✕</button>
      </header>
      <fieldset disabled={saving || uploading} className="space-y-3 p-4 disabled:opacity-70">
        {error && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{error}</p>}
        <Field label="Nom *"><input className={inputClass} required maxLength={200} value={draft.name} onChange={e => update('name', e.target.value)} /></Field>
        <Field label="Description"><textarea rows={2} className={inputClass} value={draft.description} onChange={e => update('description', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Date d’enregistrement *"><input type="date" required className={inputClass} value={draft.record_date} onChange={e => update('record_date', e.target.value)} /></Field>
          {kind === 'dish' && <>
            <Field label="Prix de base (€) *"><input type="number" min="0" max="99999999.99" step="0.01" required className={inputClass} value={draft.price_eur} onChange={e => update('price_eur', e.target.value)} /></Field>
            <Field label="Coefficient de remise"><input type="number" min="0" max="1" step="any" placeholder="Défaut : 1" className={inputClass} value={draft.discount} onChange={e => update('discount', e.target.value)} /></Field>
            <div className="self-end pb-2 text-sm">Prix final : <strong>{effectivePrice(draft.price_eur, draft.discount === '' ? null : Number(draft.discount))} €</strong></div>
          </>}
        </div>
        <p className="text-xs text-gray-600">Remise : 1 = aucune, 0,8 = −20 %, 0 = gratuit. Vide = valeur nulle (aucune remise).</p>
        {kind === 'dish' ? <div className="grid grid-cols-3 gap-3">
          <Field label="Afficher au menu"><select className={inputClass} value={draft.active} onChange={e => update('active', e.target.value)}><option value="true">Oui</option><option value="false">Non</option><option value="">Non renseigné</option></select></Field>
          <Field label="Épuisé"><select className={inputClass} value={draft.sold_out} onChange={e => update('sold_out', e.target.value)}><option value="false">Non</option><option value="true">Oui</option><option value="">Non renseigné</option></select></Field>
          <Field label="Position"><input type="number" step="1" className={inputClass} value={draft.position} onChange={e => update('position', e.target.value)} /></Field>
        </div> : <Field label="Mode de sélection des ingrédients"><input list="menu-selection-modes" maxLength={20} className={inputClass} placeholder="Aucun" value={draft.selection_mode} onChange={e => update('selection_mode', e.target.value)} /><datalist id="menu-selection-modes"><option value="choose_one">Le client choisit un ingrédient</option></datalist><span className="block text-xs font-normal">Vide : ingrédients informatifs. choose_one : choix obligatoire parmi les ingrédients associés.</span></Field>}
        <Choices title="Catégories *" options={options.categories.filter(c => !c.type || c.type === kind).map(c => ({ id: c.category_id, name: c.name }))} selected={draft.category_ids} onChange={ids => update('category_ids', ids)} />
        <Choices title="Ingrédients" options={options.ingredients.map(i => ({ id: i.ingredient_id, name: i.name }))} selected={draft.ingredient_ids} onChange={ids => update('ingredient_ids', ids)} />
        <p className="text-xs text-gray-600">Allergènes issus des ingrédients : {allergens.join(', ') || 'aucun renseigné'}. <a href="/admin/alergenes" target="_blank" rel="noreferrer" className="text-blue-700 underline">Gérer les allergènes</a></p>
        {kind === 'dish' && <Choices title="Cuissons" options={options.cuissons.map(c => ({ id: c.cuisson_id, name: `${c.french_name} / ${c.english_name}` }))} selected={draft.cuisson_ids} onChange={ids => update('cuisson_ids', ids)} />}
        {kind === 'drink' && <fieldset className="rounded border border-gray-200 p-2">
          <legend className="px-1 text-sm font-semibold">Tailles, prix et remises *</legend>
          <div className="space-y-2">
            {draft.sizes.map((size, index) => <div key={index} className="grid grid-cols-2 items-end gap-2 rounded bg-gray-50 p-2 sm:grid-cols-[1fr_1fr_1fr_1.2fr_auto]">
              {(['size', 'price_eur', 'discount', 'record_date'] as const).map(key => <Field key={key} label={key === 'size' ? 'Taille *' : key === 'price_eur' ? 'Prix (€) *' : key === 'discount' ? 'Coefficient' : 'Date *'}>
                <input className={inputClass} type={key === 'record_date' ? 'date' : key === 'size' ? 'text' : 'number'}
                  required={key !== 'discount'} maxLength={key === 'size' ? 50 : undefined}
                  min={key === 'price_eur' || key === 'discount' ? '0' : undefined} max={key === 'discount' ? '1' : key === 'price_eur' ? '99999999.99' : undefined}
                  step={key === 'discount' ? 'any' : key === 'price_eur' ? '0.01' : undefined}
                  value={size[key]} onChange={e => update('sizes', draft.sizes.map((s, i) => i === index ? { ...s, [key]: e.target.value } : s))} />
              </Field>)}
              <button type="button" className={`${buttonClass} text-red-700`} disabled={draft.sizes.length === 1} aria-label={`Retirer la taille ${size.size || index + 1}`} onClick={() => update('sizes', draft.sizes.filter((_, i) => i !== index))}>Retirer</button>
              <p className="col-span-2 text-xs text-gray-600 sm:col-span-5">Prix final : {effectivePrice(size.price_eur, size.discount === '' ? null : Number(size.discount))} €</p>
            </div>)}
            <button type="button" className={buttonClass} onClick={() => update('sizes', [...draft.sizes, { size: '', price_eur: '', discount: '1', record_date: todayInLuxembourg() }])}>+ Ajouter une taille</button>
          </div>
        </fieldset>}
        <fieldset className="rounded border border-gray-200 p-2">
          <legend className="px-1 text-sm font-semibold">Image</legend>
          <div className="flex items-start gap-3">
            {draft.image && isMenuImageUrl(draft.image) && <img src={draft.image} alt="Aperçu" className="h-20 w-20 rounded object-contain" />}
            <div className="min-w-0 flex-1 space-y-2">
              <Field label="Chemin ou URL"><input maxLength={255} className={inputClass} placeholder="/images/plat.webp ou https://…" value={draft.image} onChange={e => update('image', e.target.value)} /></Field>
              <Field label="Réutiliser une image de la carte"><select className={inputClass} value="" onChange={e => { if (e.target.value) update('image', e.target.value); }}><option value="">Choisir une image existante…</option>{images.filter((image, index) => images.findIndex(other => other.url === image.url) === index).map(image => <option key={image.url} value={image.url}>{image.name}</option>)}</select></Field>
              <Field label="Importer une image (JPG, PNG, WebP · 4 Mo max)"><input type="file" accept="image/jpeg,image/png,image/webp" className="w-full text-sm" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></Field>
              <button type="button" className="text-sm text-red-700 underline" onClick={() => update('image', '')}>Retirer l’association à l’image</button>
            </div>
          </div>
        </fieldset>
      </fieldset>
      <footer className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-white px-4 py-3">
        <span role="status" className="mr-auto text-sm text-gray-600">{uploading ? 'Import de l’image…' : saving ? 'Enregistrement…' : ''}</span>
        <button type="button" onClick={close} disabled={saving || uploading} className={buttonClass}>Annuler</button>
        <button type="submit" disabled={saving || uploading} className="rounded bg-blue-700 px-4 py-1.5 text-sm text-white disabled:opacity-50">{editing ? 'Enregistrer' : 'Créer'}</button>
      </footer>
    </form>
  </dialog>;
}
