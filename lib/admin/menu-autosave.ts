export type MenuChanges = Record<string, unknown>;
export interface MenuSaveState { pending: boolean; saving: boolean; error: string | null }

/** One queue per product: changes made during a request belong to the next request. */
export function createMenuAutosave<T>({ send, onSaved, onState, delay = 5000 }: {
  send: (changes: MenuChanges) => Promise<T>;
  onSaved: (result: T) => void;
  onState: (state: MenuSaveState) => void;
  delay?: number;
}) {
  let pending: MenuChanges = {};
  let active: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let due = 0;
  let error: string | null = null;
  let lastResult: T | undefined;
  let listening = true;
  const hasPending = () => Object.keys(pending).length > 0;
  const state = (): MenuSaveState => ({ pending: hasPending(), saving: active !== null, error });
  const emit = () => { if (listening) onState(state()); };
  const clearTimer = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  const schedule = () => {
    clearTimer();
    if (hasPending() && !error) timer = setTimeout(() => { timer = undefined; void run(); }, Math.max(0, due - Date.now()));
  };
  const run = (): Promise<void> => {
    if (active) return active;
    clearTimer();
    if (!hasPending()) return Promise.resolve();
    const changes = pending;
    pending = {};
    error = null;
    active = Promise.resolve().then(() => send(changes)).then(result => {
      lastResult = result;
    }).catch(failure => {
      // Retain the failed snapshot, while newer edits win for the same field.
      pending = { ...changes, ...pending };
      error = failure instanceof Error ? failure.message : 'Sauvegarde impossible.';
    }).finally(() => {
      active = null;
      emit();
      if (hasPending()) schedule();
      else if (lastResult !== undefined) onSaved(lastResult);
    });
    emit();
    return active;
  };

  return {
    state,
    setListening(value: boolean) { listening = value; if (value) emit(); },
    update(changes: MenuChanges) {
      pending = { ...pending, ...changes };
      error = null;
      due = Date.now() + delay;
      emit(); schedule();
    },
    async flush(): Promise<T | undefined> {
      clearTimer();
      const hadChanges = active !== null || hasPending();
      // Explicit retry also retries previously failed changes.
      error = null;
      while (active || hasPending()) {
        await run();
        clearTimer();
        if (error) throw new Error(error);
      }
      return hadChanges ? lastResult : undefined;
    },
  };
}
