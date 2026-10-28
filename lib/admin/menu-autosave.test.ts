import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMenuAutosave, type MenuChanges } from './menu-autosave';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('inline menu autosave', () => {
  it('merges fields and restarts the five-second debounce after each edit', async () => {
    const send = vi.fn(async (changes: MenuChanges) => changes);
    const saved = vi.fn();
    const queue = createMenuAutosave({ send, onSaved: saved, onState: vi.fn() });
    queue.update({ name: 'Suggestion' });
    await vi.advanceTimersByTimeAsync(4000);
    queue.update({ price_eur: '14.50', discount: 0.8 });
    await vi.advanceTimersByTimeAsync(4999);
    expect(send).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(send).toHaveBeenCalledExactlyOnceWith({ name: 'Suggestion', price_eur: '14.50', discount: 0.8 });
    expect(saved).toHaveBeenCalledTimes(1);
    expect(queue.state()).toEqual({ pending: false, saving: false, error: null });
  });

  it('keeps newer edits made during a request and never sends concurrent requests', async () => {
    const first = deferred<MenuChanges>();
    const send = vi.fn<(changes: MenuChanges) => Promise<MenuChanges>>()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce({ name: 'Latest', price_eur: '18' });
    const saved = vi.fn();
    const queue = createMenuAutosave({ send, onSaved: saved, onState: vi.fn() });
    queue.update({ name: 'Earlier' });
    await vi.advanceTimersByTimeAsync(5000);
    queue.update({ name: 'Latest', price_eur: '18' });
    await vi.advanceTimersByTimeAsync(5000);
    expect(send).toHaveBeenCalledTimes(1);
    expect(saved).not.toHaveBeenCalled();
    first.resolve({ name: 'Earlier' });
    await vi.advanceTimersByTimeAsync(1);
    expect(send).toHaveBeenNthCalledWith(2, { name: 'Latest', price_eur: '18' });
    // An earlier response must not replace the row or remove it from a search filter.
    expect(saved).toHaveBeenCalledExactlyOnceWith({ name: 'Latest', price_eur: '18' });
  });

  it('retains failed fields, lets newer values win, and supports an explicit retry', async () => {
    const first = deferred<MenuChanges>();
    const send = vi.fn<(changes: MenuChanges) => Promise<MenuChanges>>()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce({ name: 'Latest', discount: 0 });
    const queue = createMenuAutosave({ send, onSaved: vi.fn(), onState: vi.fn() });
    queue.update({ name: 'Earlier', discount: 0 });
    await vi.advanceTimersByTimeAsync(5000);
    queue.update({ name: 'Latest' });
    first.reject(new Error('Network unavailable'));
    await vi.advanceTimersByTimeAsync(0);
    expect(queue.state()).toEqual({ pending: true, saving: false, error: 'Network unavailable' });
    await queue.flush();
    expect(send).toHaveBeenNthCalledWith(2, { name: 'Latest', discount: 0 });
    expect(queue.state().pending).toBe(false);
  });

  it('flushes on demand without leaving a duplicate timer or returning an old response later', async () => {
    const send = vi.fn(async (changes: MenuChanges) => changes);
    const queue = createMenuAutosave({ send, onSaved: vi.fn(), onState: vi.fn() });
    queue.update({ description: 'Description du plat' });
    await expect(queue.flush()).resolves.toEqual({ description: 'Description du plat' });
    await vi.advanceTimersByTimeAsync(10000);
    expect(send).toHaveBeenCalledTimes(1);
    await expect(queue.flush()).resolves.toBeUndefined();
  });

  it('reports a failed flush and keeps pending edits available after validation fails', async () => {
    const send = vi.fn<(changes: MenuChanges) => Promise<MenuChanges>>()
      .mockRejectedValueOnce(new Error('Prix invalide'))
      .mockResolvedValueOnce({ price_eur: '15' });
    const queue = createMenuAutosave({ send, onSaved: vi.fn(), onState: vi.fn() });
    queue.update({ price_eur: '' });
    await expect(queue.flush()).rejects.toThrow('Prix invalide');
    expect(queue.state().pending).toBe(true);
    queue.update({ price_eur: '15' });
    await vi.advanceTimersByTimeAsync(5000);
    expect(send).toHaveBeenNthCalledWith(2, { price_eur: '15' });
    expect(queue.state().error).toBeNull();
  });

  it('can flush a filtered-out row without updating its unmounted UI', async () => {
    const send = vi.fn(async (changes: MenuChanges) => changes);
    const onState = vi.fn();
    const saved = vi.fn();
    const queue = createMenuAutosave({ send, onSaved: saved, onState });
    queue.update({ name: 'Edited' });
    queue.setListening(false);
    onState.mockClear();
    await queue.flush();
    expect(onState).not.toHaveBeenCalled();
    expect(saved).toHaveBeenCalledWith({ name: 'Edited' });
  });

  it('keeps different products independent and preserves the complete latest size list', async () => {
    const sendDish = vi.fn(async (changes: MenuChanges) => changes);
    const sendDrink = vi.fn(async (changes: MenuChanges) => changes);
    const dish = createMenuAutosave({ send: sendDish, onSaved: vi.fn(), onState: vi.fn() });
    const drink = createMenuAutosave({ send: sendDrink, onSaved: vi.fn(), onState: vi.fn() });
    dish.update({ discount: 0 });
    drink.update({ sizes: [{ size: '25cl', price_eur: '4', discount: 0.9 }] });
    const sizes = [{ size: '25cl', price_eur: '4.50', discount: 0.9 }, { size: '50cl', price_eur: '7', discount: null }];
    drink.update({ sizes });
    await vi.advanceTimersByTimeAsync(5000);
    expect(sendDish).toHaveBeenCalledExactlyOnceWith({ discount: 0 });
    expect(sendDrink).toHaveBeenCalledExactlyOnceWith({ sizes });
  });
});
