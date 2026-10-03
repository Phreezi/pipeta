/** Paleta de 12 cores bem distintas (índice = cor no núcleo do jogo). */
export const BALL_COLORS: readonly number[] = [
  0xe6194b, // vermelho
  0x3cb44b, // verde
  0xffe119, // amarelo
  0x4363d8, // azul
  0xf58231, // laranja
  0x911eb4, // roxo
  0x42d4f4, // ciano
  0xf032e6, // magenta
  0xbfef45, // lima
  0x9a6324, // castanho
  0xffffff, // branco
  0x469990, // verde-azulado
];

/** Símbolos do modo daltónico (um por cor). */
export const BALL_SYMBOLS: readonly string[] = ['●', '▲', '■', '◆', '★', '✚', '♥', '▼', '⬟', '✖', '◯', '☾'];

export function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
