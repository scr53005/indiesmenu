'use client';

import { useEffect, useRef, useState } from 'react';
import { createMenuAutosave, type MenuChanges, type MenuSaveState } from '@/lib/admin/menu-autosave';
import { effectivePrice, parseMenuInput, type AdminDish, type AdminDrink, type MenuKind } from '@/lib/admin/menu';
import { menuRequest } from '@/lib/admin/menu-client';
import { MenuDescriptionDialog } from './MenuDescriptionDialog';

type Item = AdminDish | AdminDrink;
type Props = ({ kind: 'dish'; item: AdminDish } | { kind: 'drink'; item: AdminDrink }) & {
  categoryLabel?: string;
  dark?: boolean;
  descriptionInline?: boolean;
  editAvailability?: boolean;
  onSaved: (item: Item) => void;
  onError: (message: string) => void;
  onDetails?: (item: Item) => void;
  onDelete: (name: string) => Promise<void>;
};

function draftOf(item: Item, kind: MenuKind) {
  const dish = kind === 'dish' ? item as AdminDish : undefined;
  return {
    name: item.name,
    description: item.description ?? '',
    price_eur: dish ? String(dish.price_eur) : '',
    discount: dish ? String(dish.discount ?? '') : '',
    active: dish?.active ?? null,
    sold_out: dish?.sold_out ?? null,
    sizes: kind === 'drink' ? (item as AdminDrink).drink_sizes.map(size => ({
      ...size, price_eur: String(size.price_eur), discount: String(size.discount ?? ''), record_date: size.record_date.slice(0, 10),
    })) : [],
  };
}

export function MenuQuickEditor(props: Props) {
  const [draft, setDraft] = useState(() => draftOf(props.item, props.kind));
  const draftRef = useRef(draft);
  const propsRef = useRef(props); propsRef.current = props;
  const [state, setState] = useState<MenuSaveState>({ pending: false, saving: false, error: null });
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const queue = useRef<ReturnType<typeof createMenuAutosave<Item>> | null>(null);
  if (!queue.current) queue.current = createMenuAutosave<Item>({
    send: changes => {
      const current = propsRef.current;
      const id = current.kind === 'dish' ? current.item.dish_id : current.item.drink_id;
      return menuRequest<Item>(`/api/admin/${current.kind === 'dish' ? 'dishes' : 'drinks'}/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parseMenuInput(changes, current.kind, false)),
      });
    },
    onSaved: item => {
      if (mounted.current) {
        const next = draftOf(item, propsRef.current.kind);
        draftRef.current = next; setDraft(next);
      }
      propsRef.current.onSaved(item);
    },
    onState: setState,
  });
  const autosave = queue.current;
  useEffect(() => {
    mounted.current = true; autosave.setListening(true);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      const status = autosave.state();
      if (status.pending || status.saving) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      mounted.current = false; autosave.setListening(false);
      window.removeEventListener('beforeunload', beforeUnload);
      // Filtering or changing tabs must not discard a product's pending edits.
      void autosave.flush().catch(error => propsRef.current.onError(`${draftRef.current.name} : ${error.message}`));
    };
  }, [autosave]);
  useEffect(() => {
    const status = autosave.state();
    if (!status.pending && !status.saving) {
      const next = draftOf(props.item, props.kind);
      draftRef.current = next; setDraft(next);
    }
  }, [props.item, props.kind, autosave]);

  const change = (fields: Partial<typeof draft>, patch: MenuChanges = fields) => {
    const next = { ...draftRef.current, ...fields };
    draftRef.current = next; setDraft(next); autosave.update(patch);
  };
  const action = async (callback: (item: Item) => void | Promise<void>) => {
    setBusy(true);
    try { await callback(await autosave.flush() ?? propsRef.current.item); }
    catch (error) { propsRef.current.onError(error instanceof Error ? error.message : 'Opération impossible.'); }
    finally { if (mounted.current) setBusy(false); }
  };
  const control = `min-w-0 rounded border px-2 py-1 text-sm ${props.dark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white text-gray-900'}`;
  const priceFields = (price: string, discount: string, label: string, onChange: (key: 'price_eur' | 'discount', value: string) => void) =>
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs">Prix €<input aria-label={`Prix de ${label}`} type="number" min="0" max="99999999.99" step="0.01" value={price} onChange={event => onChange('price_eur', event.target.value)} className={`${control} block w-20 sm:w-24 ${props.dark ? 'font-bold text-red-500' : ''}`} /></label>
      <label className="text-xs">Remise ×<input aria-label={`Remise de ${label}`} type="number" min="0" max="1" step="any" placeholder="1" value={discount} onChange={event => onChange('discount', event.target.value)} className={`${control} block w-16 sm:w-20 ${props.dark ? 'text-yellow-200' : ''}`} /></label>
      <span className="pb-1 text-xs">Final : <strong className={props.dark ? 'text-red-500' : undefined}>{price !== '' ? effectivePrice(price, discount === '' ? null : Number(discount)) : '—'} €</strong></span>
    </div>;

  return <article aria-label={`Éditer ${props.item.name}`} className={`p-2.5 ${props.dark ? 'rounded border border-gray-700 bg-gray-800 text-white' : 'text-gray-900'}`}>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 md:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)_auto]">
      <div className="col-span-2 flex min-w-0 items-start gap-2 md:col-span-1">
        {props.item.image && <img src={props.item.image} alt="" className="hidden h-10 w-10 shrink-0 rounded object-cover sm:block" />}
        <div className="min-w-0 flex-1">
          <input aria-label={`Nom de ${props.item.name}`} maxLength={200} value={draft.name} onChange={event => change({ name: event.target.value })} className={`${control} w-full font-semibold ${props.dark ? props.descriptionInline ? 'text-yellow-300' : 'text-yellow-400' : ''}`} />
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {props.categoryLabel && <span className={props.dark ? 'text-gray-300' : 'text-gray-500'}>{props.categoryLabel}</span>}
            {props.kind === 'dish' && (props.editAvailability ? <>
              <label className="flex items-center gap-1"><input type="checkbox" checked={draft.active === true} onChange={event => change({ active: event.target.checked })} />Actif</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={draft.sold_out === true} onChange={event => change({ sold_out: event.target.checked })} />Épuisé</label>
            </> : <span>{draft.sold_out === true ? 'Épuisé' : draft.active === true && draft.sold_out === false ? 'Visible' : 'Masqué'}</span>)}
            {!props.descriptionInline && <button type="button" onClick={() => setDescriptionOpen(true)} className={`underline ${props.dark ? 'text-blue-200' : 'text-blue-700'}`}>{draft.description ? 'Modifier la description' : 'Ajouter une description'}</button>}
          </div>
        </div>
      </div>
      <div className="min-w-0 space-y-2">
        {props.kind === 'dish' ? priceFields(draft.price_eur, draft.discount, props.item.name, (key, value) => change(key === 'price_eur' ? { price_eur: value } : { discount: value })) :
          draft.sizes.map((size, index) => <div key={size.size} className="flex flex-wrap items-end gap-x-2">
            <span className="min-w-10 pb-1 text-xs">{size.size}</span>
            {priceFields(size.price_eur, size.discount, `${props.item.name} (${size.size})`, (key, value) => {
              const sizes = draftRef.current.sizes.map((current, i) => i === index ? { ...current, [key]: value } : current);
              change({ sizes }, { sizes });
            })}
          </div>)}
      </div>
      <div className="flex max-w-28 flex-col items-end gap-2 self-end md:self-start">
        {props.onDetails && <button type="button" disabled={busy} onClick={() => void action(item => propsRef.current.onDetails?.(item))} className={`rounded border px-2 py-1 text-xs ${props.dark ? 'border-gray-600' : 'border-gray-300'}`}>Détails</button>}
        <button type="button" disabled={busy} aria-label={`Supprimer ${props.item.name}`} title={`Supprimer ${props.item.name}`} onClick={() => void action(item => propsRef.current.onDelete(item.name))} className={`rounded px-2 py-1 text-xs ${props.dark ? 'bg-red-600 text-white hover:bg-red-700' : 'text-red-700 hover:bg-red-50'}`}>Supprimer</button>
        <span role={state.error ? 'alert' : 'status'} className={`text-xs ${state.error ? props.dark ? 'text-red-200' : 'text-red-700' : props.dark ? 'text-gray-300' : 'text-gray-500'}`}>
          {state.error ? <>{state.error} <button type="button" onClick={() => void action(() => undefined)} className="underline">Réessayer</button></> : state.saving ? 'Sauvegarde…' : state.pending ? 'En attente…' : ''}
        </span>
      </div>
    </div>
    {props.descriptionInline && <textarea aria-label={`Description de ${props.item.name}`} value={draft.description} rows={2} placeholder="Description détaillée…" onChange={event => change({ description: event.target.value })} className={`${control} mt-2 w-full ${props.dark ? 'text-yellow-200' : ''}`} />}
    {descriptionOpen && <MenuDescriptionDialog name={draft.name} value={draft.description} onApply={description => change({ description })} onClose={() => setDescriptionOpen(false)} />}
  </article>;
}
