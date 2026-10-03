import { describe, expect, it } from 'vitest';
import { computeStars } from '../../src/core';

describe('computeStars', () => {
  it('3 estrelas até 1,3x o mínimo', () => {
    expect(computeStars(10, 10)).toBe(3);
    expect(computeStars(13, 10)).toBe(3);
    expect(computeStars(14, 10)).toBe(2);
  });

  it('2 estrelas até 2x o mínimo', () => {
    expect(computeStars(20, 10)).toBe(2);
    expect(computeStars(21, 10)).toBe(1);
  });

  it('1 estrela acima de 2x', () => {
    expect(computeStars(100, 10)).toBe(1);
  });
});
