import { applyMove, isSolved, isTubeComplete, validateMove, type MoveError } from './rules';
import { TUBE_CAPACITY, type Board, type Color, type Move } from './types';

export const FREE_UNDOS_PER_LEVEL = 5;
export const REWARDED_UNDOS = 5;
export const RESTARTS_BEFORE_SKIP = 3;

/** Estado serializável de um nível em curso (para retomar ao reabrir a app). */
export interface SessionSnapshot {
  readonly level: number;
  readonly initialBoard: Color[][];
  readonly board: Color[][];
  readonly history: Move[];
  readonly moveCount: number;
  readonly undosLeft: number;
  readonly extraTubeUsed: boolean;
  readonly restarts: number;
}

export type TapResult =
  | { readonly kind: 'ignored' }
  | { readonly kind: 'select'; readonly tube: number }
  | { readonly kind: 'deselect'; readonly tube: number }
  | { readonly kind: 'move'; readonly move: Move; readonly completedTube: boolean; readonly solved: boolean }
  | { readonly kind: 'invalid'; readonly move: Move; readonly reason: MoveError };

export type UndoResult = { readonly ok: true; readonly move: Move } | { readonly ok: false; readonly reason: 'nothing-to-undo' | 'no-undos-left' };

/**
 * Sessão de jogo de um nível: tabuleiro, seleção, histórico, desfazer,
 * reiniciar e tubo extra. Lógica pura, sem dependência do Phaser.
 */
export class GameSession {
  readonly level: number;
  readonly capacity: number;
  private initialBoard: Color[][];
  private boardState: Board;
  private history: Move[];
  private moves: number;
  private undos: number;
  private extraTube: boolean;
  private restartCount: number;
  private selectedTube: number | null = null;

  constructor(level: number, board: Board, capacity: number = TUBE_CAPACITY) {
    this.level = level;
    this.capacity = capacity;
    this.initialBoard = board.map((t) => [...t]);
    this.boardState = board.map((t) => [...t]);
    this.history = [];
    this.moves = 0;
    this.undos = FREE_UNDOS_PER_LEVEL;
    this.extraTube = false;
    this.restartCount = 0;
  }

  static fromSnapshot(snap: SessionSnapshot, capacity: number = TUBE_CAPACITY): GameSession {
    const s = new GameSession(snap.level, snap.initialBoard, capacity);
    s.boardState = snap.board.map((t) => [...t]);
    s.history = snap.history.map((m) => ({ from: m.from, to: m.to }));
    s.moves = snap.moveCount;
    s.undos = snap.undosLeft;
    s.extraTube = snap.extraTubeUsed;
    s.restartCount = snap.restarts;
    return s;
  }

  toSnapshot(): SessionSnapshot {
    return {
      level: this.level,
      initialBoard: this.initialBoard.map((t) => [...t]),
      board: this.boardState.map((t) => [...t]),
      history: this.history.map((m) => ({ from: m.from, to: m.to })),
      moveCount: this.moves,
      undosLeft: this.undos,
      extraTubeUsed: this.extraTube,
      restarts: this.restartCount,
    };
  }

  get board(): Board {
    return this.boardState;
  }
  get selected(): number | null {
    return this.selectedTube;
  }
  /** Jogadas feitas (desfazer não as desconta). */
  get moveCount(): number {
    return this.moves;
  }
  get undosLeft(): number {
    return this.undos;
  }
  get canUndoMove(): boolean {
    return this.history.length > 0;
  }
  get extraTubeUsed(): boolean {
    return this.extraTube;
  }
  get restarts(): number {
    return this.restartCount;
  }
  get canSkip(): boolean {
    return this.restartCount >= RESTARTS_BEFORE_SKIP;
  }
  get solved(): boolean {
    return isSolved(this.boardState, this.capacity);
  }

  isTubeComplete(index: number): boolean {
    const tube = this.boardState[index];
    return tube !== undefined && isTubeComplete(tube, this.capacity);
  }

  /** Toque num tubo: seleciona, cancela ou tenta pousar a bola levantada. */
  tap(index: number): TapResult {
    if (index < 0 || index >= this.boardState.length || this.solved) return { kind: 'ignored' };
    const selected = this.selectedTube;
    if (selected === null) {
      if ((this.boardState[index] as Color[]).length === 0) return { kind: 'ignored' };
      this.selectedTube = index;
      return { kind: 'select', tube: index };
    }
    if (selected === index) {
      this.selectedTube = null;
      return { kind: 'deselect', tube: index };
    }
    this.selectedTube = null;
    const move: Move = { from: selected, to: index };
    const reason = validateMove(this.boardState, move, this.capacity);
    if (reason !== null) return { kind: 'invalid', move, reason };
    this.boardState = applyMove(this.boardState, move, this.capacity);
    this.history.push(move);
    this.moves++;
    return {
      kind: 'move',
      move,
      completedTube: this.isTubeComplete(index),
      solved: this.solved,
    };
  }

  clearSelection(): void {
    this.selectedTube = null;
  }

  /** Desfaz a última jogada, gastando um uso de "Desfazer". */
  undo(): UndoResult {
    if (this.history.length === 0) return { ok: false, reason: 'nothing-to-undo' };
    if (this.undos <= 0) return { ok: false, reason: 'no-undos-left' };
    const last = this.history.pop() as Move;
    const tubes = this.boardState.map((t) => [...t]);
    const ball = (tubes[last.to] as Color[]).pop() as Color;
    (tubes[last.from] as Color[]).push(ball);
    this.boardState = tubes;
    this.undos--;
    this.selectedTube = null;
    return { ok: true, move: { from: last.to, to: last.from } };
  }

  /** Acrescenta usos de "Desfazer" (ex.: após vídeo com recompensa). */
  grantUndos(count: number = REWARDED_UNDOS): void {
    this.undos += count;
  }

  /** Acrescenta um tubo vazio ao nível (uma vez por nível). */
  addExtraTube(): boolean {
    if (this.extraTube) return false;
    this.extraTube = true;
    this.boardState = [...this.boardState.map((t) => [...t]), []];
    this.initialBoard = [...this.initialBoard, []];
    this.selectedTube = null;
    return true;
  }

  /** Volta ao início do nível. Mantém o tubo extra e os usos de desfazer. */
  restart(): void {
    this.boardState = this.initialBoard.map((t) => [...t]);
    this.history = [];
    this.moves = 0;
    this.selectedTube = null;
    this.restartCount++;
  }
}
