// Kitchen-side (CO page) helpers, 2026-11-05. Relative imports only: tested file.
//
// Background: the bell switch lived only in React state, so every full page load reset it to
// off. The history page sent the kitchen back to the CO page with a full reload whenever an
// order was open, so after one visit to "Historique" the next orders arrived in silence; and
// with an order still open, "Historique" could not be opened at all (instant bounce back).

const SOUND_KEY = 'indies_co_sound';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

/** The kitchen's bell choice for this browser tab session. Off when unknown or unreadable. */
export function readSoundOn(storage: Storage | null | undefined): boolean {
  try {
    return storage?.getItem(SOUND_KEY) === 'on';
  } catch {
    return false; // private mode / blocked storage: the button still works for this page
  }
}

export function writeSoundOn(storage: Storage | null | undefined, on: boolean): void {
  try {
    storage?.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    /* not persisted; the choice still applies to the current page */
  }
}

/**
 * Should the history page jump to the CO page? Only for an open order that was NOT already open
 * when the history page was opened: orders already open are known to the kitchen, and bouncing
 * on them made the history unreachable. Returns the baseline to keep for the next check.
 */
export function newOpenOrderCheck(
  baseline: ReadonlySet<string> | null,
  openIds: readonly string[],
): { baseline: ReadonlySet<string>; jump: boolean } {
  if (baseline === null) return { baseline: new Set(openIds), jump: false };
  const jump = openIds.some(id => !baseline.has(id));
  // Fulfilled orders leave the baseline, so an id can't hide a later order forever.
  return { baseline: new Set(openIds.filter(id => baseline.has(id))), jump };
}
