import { TUBE_CAPACITY, type Board, type Color, type Move, type Tube } from './types';

export function topColor(tube: Tube): Color | undefined {
  return tube[tube.length - 1];
}

export function isEmpty(tube: Tube): boolean {
  return tube.length === 0;
}

export function isFull(tube: Tube, capacity: number = TUBE_CAPACITY): boolean {
  return tube.length >= capacity;
}

/** Todas as bolas do tubo têm a mesma cor (um tubo vazio conta como uniforme). */
export function isUniform(tube: Tube): boolean {
  for (let i = 1; i < tube.length; i++) {
    if (tube[i] !== tube[0]) return false;
  }
  return true;
}

/** Tubo cheio com uma só cor. */
export function isTubeComplete(tube: Tube, capacity: number = TUBE_CAPACITY): boolean {
  return tube.length === capacity && isUniform(tube);
}

export type MoveError = 'same-tube' | 'invalid-index' | 'source-empty' | 'target-full' | 'color-mismatch';

/** Verifica se a jogada é válida; devolve `null` se for, ou o motivo da recusa. */
export function validateMove(board: Board, move: Move, capacity: number = TUBE_CAPACITY): MoveError | null {
  const { from, to } = move;
  if (from === to) return 'same-tube';
  const src = board[from];
  const dst = board[to];
  if (src === undefined || dst === undefined) return 'invalid-index';
  const ball = topColor(src);
  if (ball === undefined) return 'source-empty';
  if (dst.length >= capacity) return 'target-full';
  const dstTop = topColor(dst);
  if (dstTop !== undefined && dstTop !== ball) return 'color-mismatch';
  return null;
}

export function canMove(board: Board, move: Move, capacity: number = TUBE_CAPACITY): boolean {
  return validateMove(board, move, capacity) === null;
}

/** Aplica uma jogada (uma bola) e devolve um novo tabuleiro. Lança erro se for inválida. */
export function applyMove(board: Board, move: Move, capacity: number = TUBE_CAPACITY): Board {
  const err = validateMove(board, move, capacity);
  if (err !== null) throw new Error(`Invalid move ${move.from}->${move.to}: ${err}`);
  const src = board[move.from] as Tube;
  const dst = board[move.to] as Tube;
  const ball = src[src.length - 1] as Color;
  return board.map((tube, i) => {
    if (i === move.from) return src.slice(0, -1);
    if (i === move.to) return [...dst, ball];
    return tube;
  });
}

/** Nível resolvido: todos os tubos vazios ou completos com uma só cor. */
export function isSolved(board: Board, capacity: number = TUBE_CAPACITY): boolean {
  return board.every((tube) => tube.length === 0 || isTubeComplete(tube, capacity));
}

/** Lista todas as jogadas válidas. */
export function legalMoves(board: Board, capacity: number = TUBE_CAPACITY): Move[] {
  const moves: Move[] = [];
  for (let from = 0; from < board.length; from++) {
    for (let to = 0; to < board.length; to++) {
      if (canMove(board, { from, to }, capacity)) moves.push({ from, to });
    }
  }
  return moves;
}

export function cloneBoard(board: Board): Color[][] {
  return board.map((tube) => [...tube]);
}
