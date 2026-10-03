import { levelParams, type LevelParams } from './difficulty';
import { mixSeed, Rng } from './rng';
import { isSolved, isTubeComplete } from './rules';
import { solve, type SolveOptions } from './solver';
import { TUBE_CAPACITY, type Board, type Color, type Move } from './types';

export interface Level {
  readonly level: number;
  /** Seed efetivamente usada (a seed do nível ou uma das seguintes). */
  readonly seed: number;
  /** Quantas seeds foram rejeitadas antes desta. */
  readonly attempts: number;
  readonly params: LevelParams;
  readonly capacity: number;
  readonly board: Board;
  /** Número mínimo de jogadas segundo o solver (usado para as estrelas). */
  readonly minMoves: number;
  /** `true` se `minMoves` é comprovadamente ótimo. */
  readonly optimal: boolean;
  readonly solution: readonly Move[];
}

export const MAX_GENERATION_ATTEMPTS = 500;

/**
 * Seed de uma tentativa. A tentativa 0 usa a seed = número do nível; as
 * seguintes usam a "seed seguinte" dentro de um espaço próprio do nível,
 * para não repetir o puzzle de outro nível.
 */
export function attemptSeed(level: number, attempt: number): number {
  return attempt === 0 ? level : mixSeed(level, attempt);
}

/** Distribui as bolas aleatoriamente pelos tubos cheios e acrescenta os vazios. */
export function randomBoard(seed: number, params: LevelParams, capacity: number = TUBE_CAPACITY): Color[][] {
  const rng = new Rng(seed);
  const balls: Color[] = [];
  // Escolhe quais cores da paleta entram no nível (variedade visual).
  const palette = rng.shuffle(Array.from({ length: 12 }, (_, i) => i)).slice(0, params.colors);
  for (const color of palette) for (let i = 0; i < capacity; i++) balls.push(color);
  rng.shuffle(balls);
  const tubes: Color[][] = [];
  for (let t = 0; t < params.colors; t++) tubes.push(balls.slice(t * capacity, (t + 1) * capacity));
  for (let e = 0; e < params.emptyTubes; e++) tubes.push([]);
  return tubes;
}

/** Rejeita tabuleiros triviais (já resolvidos ou com tubos completos à partida). */
function isAcceptableStart(board: Board, capacity: number): boolean {
  if (isSolved(board, capacity)) return false;
  return !board.some((tube) => isTubeComplete(tube, capacity));
}

/** Gera o nível de forma determinística e garante que é resolúvel. */
export function generateLevel(level: number, solveOptions: SolveOptions = {}): Level {
  const params = levelParams(level);
  const capacity = solveOptions.capacity ?? TUBE_CAPACITY;
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const seed = attemptSeed(level, attempt);
    const board = randomBoard(seed, params, capacity);
    if (!isAcceptableStart(board, capacity)) continue;
    const result = solve(board, { ...solveOptions, capacity });
    if (result.status !== 'solved' || result.moves === null) continue;
    return {
      level,
      seed,
      attempts: attempt,
      params,
      capacity,
      board,
      minMoves: result.moves.length,
      optimal: result.optimal,
      solution: result.moves,
    };
  }
  throw new Error(`Could not generate a solvable level ${level}`);
}
