// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import Draggable from './Draggable';

let host: HTMLDivElement;
let root: Root;
let resized: () => void;
let height: number;
beforeEach(() => {
  height = 100;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('innerWidth', 375);
  vi.stubGlobal('innerHeight', 667);
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resized = callback; }
    observe() {}
    disconnect() {}
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    width: 280, height, x: 0, y: 0, left: 0, top: 0, right: 280, bottom: height, toJSON() {},
  }));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('moves a wallet upward as it expands and keeps it above the footer after a viewport resize', () => {
  act(() => root.render(<Draggable keepInViewport bottomInset={40} initialPosition={{ x: 200, y: 550 }}>Wallet</Draggable>));
  const card = host.firstElementChild as HTMLElement;
  expect(card.style.left).toBe('87px');
  expect(card.style.top).toBe('527px');
  height = 250;
  act(() => resized());
  expect(card.style.top).toBe('377px');
  vi.stubGlobal('innerHeight', 480);
  act(() => window.dispatchEvent(new Event('resize')));
  expect(card.style.top).toBe('190px');
});
