/** Índice de cor (0..PALETTE_SIZE-1). */
export type Color = number;

/** Um tubo: bolas da base (índice 0) para o topo (último índice). */
export type Tube = readonly Color[];

/** Estado do tabuleiro: lista de tubos. */
export type Board = readonly Tube[];

export interface Move {
  readonly from: number;
  readonly to: number;
}

/** Capacidade máxima de cada tubo. */
export const TUBE_CAPACITY = 4;

/** Número de cores distintas disponíveis na paleta. */
export const PALETTE_SIZE = 12;
