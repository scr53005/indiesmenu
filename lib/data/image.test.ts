import { describe, expect, it } from 'vitest';
import { isOptimizableImage } from './image';

describe('isOptimizableImage', () => {
  it('resizes local images and Vercel Blob uploads', () => {
    expect(isOptimizableImage('/images/burger.PNG')).toBe(true);
    expect(isOptimizableImage('https://abc123.public.blob.vercel-storage.com/menu/menu-x1.webp')).toBe(true);
  });
  it('leaves other hosts alone (next/image would throw on them)', () => {
    expect(isOptimizableImage('https://example.com/a.jpg')).toBe(false);
    expect(isOptimizableImage('https://public.blob.vercel-storage.com.evil.com/a.jpg')).toBe(false);
    expect(isOptimizableImage('http://abc.public.blob.vercel-storage.com/a.jpg')).toBe(false);
    expect(isOptimizableImage('//cdn.example.com/a.jpg')).toBe(false);
    expect(isOptimizableImage('not a url')).toBe(false);
  });
});
