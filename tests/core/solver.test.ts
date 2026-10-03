import { describe, expect, it } from 'vitest';
import { boardKey, heuristic, isSolved, randomBoard, solve, type Board } from '../../src/core';
import { bruteForceMin, replay } from './helpers';

describe('solver', () => {
  it('tabuleiro resolvido precisa de 0 jogadas', () => {
    const r = solve([[0, 0, 0, 0], []]);
    expect(r.status).toBe('solved');
    expect(r.moves).toEqual([]);
  });

  it('resolve um caso simples com o mínimo', () => {
    const board: Board = [[0, 0, 0, 1], [1, 1, 1, 0], []];
    const r = solve(board);
    expect(r.status).toBe('solved');
    expect(r.optimal).toBe(true);
    expect(isSolved(replay(board, r.moves ?? []))).toBe(true);
    expect(r.moves?.length).toBe(bruteForceMin(board));
  });

  it('deteta tabuleiros impossíveis', () => {
    // Sem espaço livre: nenhuma jogada é possível.
    const r = solve([[0, 1, 0, 1], [1, 0, 1, 0]]);
    expect(r.status).toBe('unsolvable');
  });

  it('a chave ignora a ordem dos tubos', () => {
    expect(boardKey([[0, 1], [2], []])).toBe(boardKey([[], [2], [0, 1]]));
    expect(boardKey([[0, 1], [2], []])).not.toBe(boardKey([[1, 0], [2], []]));
  });

  it('a heurística nunca excede o mínimo real', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const board = randomBoard(seed, { colors: 3, emptyTubes: 2, hard: false });
      const min = bruteForceMin(board);
      if (min === null) continue;
      expect(heuristic(board)).toBeLessThanOrEqual(min);
    }
  });

  it('o mínimo do A* coincide com BFS sem podas (3 cores)', () => {
    for (let seed = 100; seed < 115; seed++) {
      const board = randomBoard(seed, { colors: 3, emptyTubes: 2, hard: false });
      const r = solve(board);
      const min = bruteForceMin(board);
      if (min === null) {
        expect(r.status).toBe('unsolvable');
        continue;
      }
      expect(r.status).toBe('solved');
      expect(r.optimal).toBe(true);
      expect(r.moves?.length).toBe(min);
    }
  });

  it('o mínimo do A* coincide com BFS sem podas (4 cores, 1 vazio)', () => {
    let checked = 0;
    for (let seed = 1; seed < 40 && checked < 5; seed++) {
      const board = randomBoard(seed, { colors: 4, emptyTubes: 1, hard: true });
      const r = solve(board);
      const min = bruteForceMin(board);
      expect(r.status === 'solved' ? r.moves?.length : null).toBe(min);
      if (min !== null) checked++;
    }
  });

  it('com orçamento curto usa o modo guloso e marca como não ótimo', () => {
    const board = randomBoard(163, { colors: 12, emptyTubes: 2, hard: false });
    const r = solve(board, { optimalBudget: 10 });
    expect(r.status).toBe('solved');
    expect(r.optimal).toBe(false);
    expect(isSolved(replay(board, r.moves ?? []))).toBe(true);
  });

  it('é determinístico', () => {
    const board = randomBoard(77, { colors: 8, emptyTubes: 2, hard: false });
    expect(solve(board).moves).toEqual(solve(board).moves);
  });
});
