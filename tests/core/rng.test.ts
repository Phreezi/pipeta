import { describe, expect, it } from 'vitest';
import { mixSeed, Rng } from '../../src/core';

describe('Rng', () => {
  it('é determinístico', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.nextUint32()).toBe(b.nextUint32());
  });

  it('seeds diferentes dão sequências diferentes', () => {
    expect(new Rng(1).nextUint32()).not.toBe(new Rng(2).nextUint32());
  });

  it('int respeita os limites', () => {
    const r = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it('shuffle preserva os elementos', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const shuffled = new Rng(3).shuffle([...items]);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(items);
  });

  it('mixSeed é estável', () => {
    expect(mixSeed(10, 1)).toBe(mixSeed(10, 1));
    expect(mixSeed(10, 1)).not.toBe(mixSeed(10, 2));
  });
});
