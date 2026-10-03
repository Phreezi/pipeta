import { describe, expect, it } from 'vitest';
import { FREE_UNDOS_PER_LEVEL, GameSession, generateLevel, RESTARTS_BEFORE_SKIP, type Board } from '../../src/core';

const board: Board = [[0, 0, 0, 1], [1, 1, 1, 0], []];

describe('GameSession', () => {
  it('tocar seleciona; tocar no mesmo tubo cancela', () => {
    const s = new GameSession(1, board);
    expect(s.tap(0)).toEqual({ kind: 'select', tube: 0 });
    expect(s.selected).toBe(0);
    expect(s.tap(0)).toEqual({ kind: 'deselect', tube: 0 });
    expect(s.selected).toBeNull();
  });

  it('tocar num tubo vazio sem seleção é ignorado', () => {
    expect(new GameSession(1, board).tap(2)).toEqual({ kind: 'ignored' });
  });

  it('jogada inválida não altera o tabuleiro nem conta', () => {
    const s = new GameSession(1, board);
    s.tap(0);
    const r = s.tap(1);
    expect(r.kind).toBe('invalid');
    expect(s.board).toEqual(board);
    expect(s.moveCount).toBe(0);
    expect(s.selected).toBeNull();
  });

  it('jogada válida move e conta; deteta tubo completo e vitória', () => {
    const s = new GameSession(1, board);
    s.tap(0);
    expect(s.tap(2)).toMatchObject({ kind: 'move', completedTube: false, solved: false });
    s.tap(1);
    expect(s.tap(0)).toMatchObject({ kind: 'move', completedTube: true, solved: false });
    s.tap(2);
    expect(s.tap(1)).toMatchObject({ kind: 'move', completedTube: true, solved: true });
    expect(s.moveCount).toBe(3);
    expect(s.solved).toBe(true);
    expect(s.tap(0)).toEqual({ kind: 'ignored' });
  });

  it('desfazer: 5 usos grátis, depois +5 por recompensa', () => {
    const s = new GameSession(1, board);
    expect(s.undo()).toEqual({ ok: false, reason: 'nothing-to-undo' });
    for (let i = 0; i < FREE_UNDOS_PER_LEVEL; i++) {
      s.tap(0);
      s.tap(2);
      expect(s.undo().ok).toBe(true);
      expect(s.board).toEqual(board);
    }
    expect(s.undosLeft).toBe(0);
    s.tap(0);
    s.tap(2);
    expect(s.undo()).toEqual({ ok: false, reason: 'no-undos-left' });
    s.grantUndos();
    expect(s.undosLeft).toBe(5);
    expect(s.undo().ok).toBe(true);
    // Desfazer não desconta jogadas.
    expect(s.moveCount).toBe(6);
  });

  it('tubo extra só uma vez por nível e mantém-se ao reiniciar', () => {
    const s = new GameSession(1, board);
    expect(s.addExtraTube()).toBe(true);
    expect(s.addExtraTube()).toBe(false);
    expect(s.board.length).toBe(4);
    s.restart();
    expect(s.board.length).toBe(4);
  });

  it('reiniciar repõe o tabuleiro; saltar após 3 reinícios', () => {
    const s = new GameSession(1, board);
    s.tap(0);
    s.tap(2);
    for (let i = 0; i < RESTARTS_BEFORE_SKIP; i++) {
      expect(s.canSkip).toBe(false);
      s.restart();
    }
    expect(s.board).toEqual(board);
    expect(s.moveCount).toBe(0);
    expect(s.canSkip).toBe(true);
  });

  it('snapshot permite retomar exatamente o mesmo estado', () => {
    const lv = generateLevel(25);
    const s = new GameSession(lv.level, lv.board);
    const first = lv.solution[0];
    if (first === undefined) throw new Error('solution vazia');
    s.tap(first.from);
    s.tap(first.to);
    s.addExtraTube();
    const snap = JSON.parse(JSON.stringify(s.toSnapshot())) as ReturnType<GameSession['toSnapshot']>;
    const r = GameSession.fromSnapshot(snap);
    expect(r.toSnapshot()).toEqual(s.toSnapshot());
    expect(r.undo().ok).toBe(true);
  });

  it('a solução do gerador resolve o nível através da sessão', () => {
    const lv = generateLevel(42);
    const s = new GameSession(lv.level, lv.board);
    for (const m of lv.solution) {
      s.tap(m.from);
      expect(s.tap(m.to).kind).toBe('move');
    }
    expect(s.solved).toBe(true);
    expect(s.moveCount).toBe(lv.minMoves);
  });
});
