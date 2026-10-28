'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

export function MenuDescriptionDialog({ name, value, onApply, onClose }: {
  name: string;
  value: string | null;
  onApply: (description: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [description, setDescription] = useState(value ?? '');
  useEffect(() => { dialog.current?.showModal(); }, []);
  const submit = (event: FormEvent) => {
    event.preventDefault(); onApply(description); onClose();
  };
  return <dialog ref={dialog} aria-labelledby="description-title" onCancel={event => { event.preventDefault(); onClose(); }}
    className="m-auto w-[calc(100%_-_1rem)] max-w-xl rounded-lg bg-white p-4 text-gray-900 shadow-xl backdrop:bg-black/50">
    <form onSubmit={submit} className="space-y-3">
      <h2 id="description-title" className="text-lg font-bold">Description — {name}</h2>
      <label className="block text-sm">Description du plat
        <textarea autoFocus value={description} onChange={event => setDescription(event.target.value)} rows={5}
          className="mt-1 max-h-[55dvh] w-full resize-y rounded border border-gray-300 bg-white p-2 text-gray-900" />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded border px-3 py-1.5 text-sm">Annuler</button>
        <button type="submit" className="rounded bg-blue-700 px-3 py-1.5 text-sm text-white">Appliquer</button>
      </div>
    </form>
  </dialog>;
}
