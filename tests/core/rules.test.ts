import { describe, expect, it } from 'vitest';
import { applyMove, canMove, isSolved, isTubeComplete, legalMoves, validateMove, type Board } from '../../src/core';

describe('rules', () => {
  const board: Board = [[0, 1], [1], [], [2, 2, 2, 2]];

  it('permite pousar num tubo vazio', () => {
    expect(validateMove(board, { from: 0, to: 2 })).toBeNull();
  });

  it('permite pousar sobre bola da mesma cor', () => {
    expect(validateMove(board, { from: 0, to: 1 })).toBeNull();
  });

  it('recusa cor diferente', () => {
    expect(validateMove([[0, 1], [0]], { from: 0, to: 1 })).toBe('color-mismatch');
  });

  it('recusa tubo cheio', () => {
    expect(validateMove([[2], [2, 2, 2, 2]], { from: 0, to: 1 })).toBe('target-full');
  });

  it('recusa origem vazia, mesmo tubo e índices inválidos', () => {
    expect(validateMove(board, { from: 2, to: 0 })).toBe('source-empty');
    expect(validateMove(board, { from: 0, to: 0 })).toBe('same-tube');
    expect(validateMove(board, { from: 0, to: 9 })).toBe('invalid-index');
  });

  it('move apenas a bola do topo e não altera o original', () => {
    const next = applyMove(board, { from: 0, to: 1 });
    expect(next).toEqual([[0], [1, 1], [], [2, 2, 2, 2]]);
    expect(board[0]).toEqual([0, 1]);
  });

  it('lança erro em jogada inválida', () => {
    expect(() => applyMove(board, { from: 2, to: 0 })).toThrow();
  });

  it('respeita a capacidade de 4', () => {
    expect(canMove([[1], [1, 1, 1]], { from: 0, to: 1 })).toBe(true);
    expect(canMove([[1], [1, 1, 1, 1]], { from: 0, to: 1 })).toBe(false);
  });

  it('deteta tubos completos', () => {
    expect(isTubeComplete([3, 3, 3, 3])).toBe(true);
    expect(isTubeComplete([3, 3, 3])).toBe(false);
    expect(isTubeComplete([3, 3, 1, 3])).toBe(false);
  });

  it('nível resolvido: tubos vazios ou completos de uma cor', () => {
    expect(isSolved([[0, 0, 0, 0], [], [1, 1, 1, 1]])).toBe(true);
    expect(isSolved([[0, 0, 0], [0], [1, 1, 1, 1]])).toBe(false);
  });

  it('lista jogadas legais', () => {
    expect(legalMoves([[0], [1], []])).toEqual([
      { from: 0, to: 2 },
      { from: 1, to: 2 },
    ]);
  });
});
