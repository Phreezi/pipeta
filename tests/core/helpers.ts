import { applyMove, isSolved, legalMoves, type Board, type Move } from '../../src/core';

/** Aplica uma sequência de jogadas validando cada uma pelas regras do jogo. */
export function replay(board: Board, moves: readonly Move[]): Board {
  return moves.reduce<Board>((b, m) => applyMove(b, m), board);
}

/** BFS "ingénuo" sem podas nem heurística — referência para o mínimo. */
export function bruteForceMin(board: Board, limit = 2_000_000): number | null {
  const key = (b: Board): string => b.map((t) => t.join('.')).join('|');
  let frontier: Board[] = [board];
  const seen = new Set<string>([key(board)]);
  let depth = 0;
  while (frontier.length > 0) {
    const next: Board[] = [];
    for (const b of frontier) {
      if (isSolved(b)) return depth;
      for (const m of legalMoves(b)) {
        const nb = applyMove(b, m);
        const k = key(nb);
        if (seen.has(k)) continue;
        seen.add(k);
        if (seen.size > limit) throw new Error('bruteForceMin limit exceeded');
        next.push(nb);
      }
    }
    frontier = next;
    depth++;
  }
  return null;
}
