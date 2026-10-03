import { describe, expect, it } from 'vitest';
import {
  attemptSeed,
  generateLevel,
  isSolved,
  isTubeComplete,
  levelParams,
  TUBE_CAPACITY,
  type Color,
} from '../../src/core';
import { replay } from './helpers';

describe('levelParams (curva de dificuldade)', () => {
  it('1-5: 3 cores, 2 vazios', () => {
    for (let l = 1; l <= 5; l++) expect(levelParams(l)).toEqual({ colors: 3, emptyTubes: 2, hard: false });
  });

  it('6-20: 4-5 cores, 2 vazios', () => {
    for (let l = 6; l <= 20; l++) {
      const p = levelParams(l);
      expect(p.colors).toBeGreaterThanOrEqual(4);
      expect(p.colors).toBeLessThanOrEqual(5);
      expect(p.emptyTubes).toBe(2);
    }
  });

  it('21-50: 6-8 cores, 2 vazios', () => {
    for (let l = 21; l <= 50; l++) {
      const p = levelParams(l);
      expect(p.colors).toBeGreaterThanOrEqual(6);
      expect(p.colors).toBeLessThanOrEqual(8);
      expect(p.emptyTubes).toBe(2);
    }
  });

  it('51+: 9-12 cores; de 10 em 10 só 1 vazio', () => {
    for (let l = 51; l <= 1000; l++) {
      const p = levelParams(l);
      expect(p.colors).toBeGreaterThanOrEqual(9);
      expect(p.colors).toBeLessThanOrEqual(12);
      expect(p.emptyTubes).toBe(l % 10 === 0 ? 1 : 2);
      expect(p.hard).toBe(l % 10 === 0);
    }
  });

  it('recusa níveis inválidos', () => {
    expect(() => levelParams(0)).toThrow();
    expect(() => levelParams(1.5)).toThrow();
  });
});

describe('generateLevel', () => {
  it('a primeira tentativa usa seed = número do nível', () => {
    expect(attemptSeed(17, 0)).toBe(17);
  });

  it('é determinístico', () => {
    for (const l of [1, 7, 33, 60, 120]) {
      expect(generateLevel(l)).toEqual(generateLevel(l));
    }
  });

  it('tem a composição correta e começa sem tubos completos', () => {
    for (const l of [1, 6, 21, 51, 60, 151]) {
      const lv = generateLevel(l);
      const p = levelParams(l);
      expect(lv.board.length).toBe(p.colors + p.emptyTubes);
      expect(lv.board.filter((t) => t.length === 0).length).toBe(p.emptyTubes);
      const counts = new Map<Color, number>();
      for (const tube of lv.board) {
        expect(tube.length === 0 || tube.length === TUBE_CAPACITY).toBe(true);
        expect(isTubeComplete(tube)).toBe(false);
        for (const c of tube) counts.set(c, (counts.get(c) ?? 0) + 1);
      }
      expect(counts.size).toBe(p.colors);
      for (const n of counts.values()) expect(n).toBe(TUBE_CAPACITY);
    }
  });

  it('níveis consecutivos são diferentes', () => {
    expect(generateLevel(2).board).not.toEqual(generateLevel(3).board);
  });

  it('os primeiros 300 níveis são todos resolúveis', () => {
    for (let l = 1; l <= 300; l++) {
      const lv = generateLevel(l);
      expect(lv.minMoves).toBe(lv.solution.length);
      expect(lv.minMoves).toBeGreaterThan(0);
      // A solução do solver é validada pelas regras do jogo, jogada a jogada.
      expect(isSolved(replay(lv.board, lv.solution)), `nível ${l}`).toBe(true);
    }
  });
});
