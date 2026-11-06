import { describe, expect, it } from 'vitest';
import { ACTIVE_POLL_MS, PASSIVE_POLL_MS, pulseAfterQuery, pulsePreCheck } from './pulse';

const MIN = 60_000;
const now = 1_800_000_000_000;

describe('pulsePreCheck', () => {
  it('stops when no order is tracked', () => {
    expect(pulsePreCheck({ memo: null, orderTime: now, fulfilledAt: 0, now })).toEqual({ action: 'stop' });
    expect(pulsePreCheck({ memo: 'x', orderTime: 0, fulfilledAt: 0, now })).toEqual({ action: 'stop' });
  });
  it('keeps solid green for 10 minutes after fulfilment, then cleans up', () => {
    expect(pulsePreCheck({ memo: 'x', orderTime: now - 30 * MIN, fulfilledAt: now - 9 * MIN, now }))
      .toEqual({ action: 'show', state: 'green-solid', nextMs: PASSIVE_POLL_MS });
    expect(pulsePreCheck({ memo: 'x', orderTime: now - 30 * MIN, fulfilledAt: now - 10 * MIN, now }))
      .toEqual({ action: 'cleanup' });
  });
  it('gives up after 2 hours', () => {
    expect(pulsePreCheck({ memo: 'x', orderTime: now - 121 * MIN, fulfilledAt: 0, now })).toEqual({ action: 'cleanup' });
  });
  it('otherwise asks the server, with the order age', () => {
    expect(pulsePreCheck({ memo: 'x', orderTime: now - 5 * MIN, fulfilledAt: 0, now }))
      .toEqual({ action: 'query', memo: 'x', ageMin: 5 });
  });
});

describe('pulseAfterQuery', () => {
  it('no transfer yet: blue, red after 20 min, slow polling', () => {
    expect(pulseAfterQuery(false, false, 19)).toEqual({ state: 'blue', nextMs: PASSIVE_POLL_MS, markFulfilled: false });
    expect(pulseAfterQuery(false, false, 20).state).toBe('red');
  });
  it('kitchen has it: green, green-slow from 20 min, red from 30 min, fast polling', () => {
    expect(pulseAfterQuery(true, false, 5)).toEqual({ state: 'green', nextMs: ACTIVE_POLL_MS, markFulfilled: false });
    expect(pulseAfterQuery(true, false, 25).state).toBe('green-slow');
    expect(pulseAfterQuery(true, false, 30).state).toBe('red');
  });
  it('fulfilled: solid green and start the 10-minute window', () => {
    expect(pulseAfterQuery(true, true, 12)).toEqual({ state: 'green-solid', nextMs: PASSIVE_POLL_MS, markFulfilled: true });
  });
});
