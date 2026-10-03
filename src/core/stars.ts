export type Stars = 1 | 2 | 3;

/**
 * Estrelas a partir das jogadas feitas e do mínimo do solver:
 * 3 = até 1,3x o mínimo; 2 = até 2x; 1 = concluído.
 */
export function computeStars(moves: number, minMoves: number): Stars {
  if (minMoves <= 0) return 3;
  // Aritmética inteira para evitar erros de vírgula flutuante (1.3 * x).
  if (moves * 10 <= minMoves * 13) return 3;
  if (moves <= minMoves * 2) return 2;
  return 1;
}
