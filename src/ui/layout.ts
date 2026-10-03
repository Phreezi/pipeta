/**
 * Disposição dos tubos (lógica pura, testável). Todas as medidas em
 * píxeis do canvas (já multiplicados pelo devicePixelRatio).
 */

/** Proporções em função do diâmetro da bola (d). */
export const TUBE_WIDTH_FACTOR = 1.28;
export const BALL_STEP_FACTOR = 1.06;
export const TUBE_BOTTOM_PAD_FACTOR = 0.16;
export const TUBE_TOP_PAD_FACTOR = 0.3;
/** Espaço livre acima do tubo para a bola levantada. */
export const LIFT_SPACE_FACTOR = 1.25;
const SLOT_FACTOR = 1.5;

export function tubeHeightFor(d: number, capacity: number): number {
  return d * (capacity * BALL_STEP_FACTOR + TUBE_BOTTOM_PAD_FACTOR + TUBE_TOP_PAD_FACTOR);
}

export interface LayoutInput {
  readonly count: number;
  readonly capacity: number;
  readonly width: number;
  readonly height: number;
  /** Área reservada em cima (HUD) e em baixo (botões). */
  readonly top: number;
  readonly bottom: number;
  readonly dpr: number;
  /** Diâmetro máximo da bola em dp. */
  readonly maxBallDp?: number;
}

export interface TubeSlot {
  readonly x: number;
  /** Topo da abertura do tubo. */
  readonly top: number;
  /** Fundo do tubo. */
  readonly bottom: number;
  /** Zona de toque (inclui o espaço da bola levantada). */
  readonly hit: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

export interface Layout {
  readonly rows: number;
  readonly ball: number;
  readonly tubeWidth: number;
  readonly tubeHeight: number;
  readonly tubes: readonly TubeSlot[];
}

function rowCounts(count: number, rows: number): number[] {
  const first = Math.ceil(count / rows);
  return rows === 1 ? [count] : [first, count - first];
}

function ballFor(input: LayoutInput, rows: number): number {
  const margin = 8 * input.dpr;
  const perRow = Math.ceil(input.count / rows);
  const dW = (input.width - 2 * margin) / (perRow * SLOT_FACTOR);
  const rowH = (input.height - input.top - input.bottom) / rows;
  const dH = rowH / (input.capacity * BALL_STEP_FACTOR + TUBE_BOTTOM_PAD_FACTOR + TUBE_TOP_PAD_FACTOR + LIFT_SPACE_FACTOR + 0.2);
  return Math.max(4, Math.min(dW, dH, (input.maxBallDp ?? 56) * input.dpr));
}

export function computeLayout(input: LayoutInput): Layout {
  // 1 ou 2 filas: a que der bolas maiores (1 fila em caso de empate).
  const rows = input.count <= 1 ? 1 : ballFor(input, 1) >= ballFor(input, 2) * 0.98 ? 1 : 2;
  const d = Math.floor(ballFor(input, rows));
  const tubeWidth = d * TUBE_WIDTH_FACTOR;
  const tubeHeight = tubeHeightFor(d, input.capacity);
  const lift = d * LIFT_SPACE_FACTOR;
  const rowBlock = lift + tubeHeight;
  const availH = input.height - input.top - input.bottom;
  const rowGap = rows > 1 ? Math.min(d * 0.6, (availH - rows * rowBlock) / (rows - 1)) : 0;
  const totalH = rows * rowBlock + (rows - 1) * rowGap;
  const startY = input.top + Math.max(0, (availH - totalH) / 2);
  const margin = 8 * input.dpr;
  const maxSpacing = (input.width - 2 * margin) / Math.ceil(input.count / rows);
  const spacing = Math.min(maxSpacing, d * 2.1);

  const tubes: TubeSlot[] = [];
  rowCounts(input.count, rows).forEach((n, r) => {
    const rowTop = startY + r * (rowBlock + rowGap);
    const top = rowTop + lift;
    const bottom = top + tubeHeight;
    const x0 = input.width / 2 - ((n - 1) * spacing) / 2;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * spacing;
      tubes.push({
        x,
        top,
        bottom,
        hit: { x: x - spacing / 2, y: rowTop, width: spacing, height: bottom - rowTop + d * 0.2 },
      });
    }
  });
  return { rows, ball: d, tubeWidth, tubeHeight, tubes };
}

/** Centro da bola na posição `index` (0 = fundo) de um tubo. */
export function ballPosition(slot: TubeSlot, index: number, d: number): { x: number; y: number } {
  return { x: slot.x, y: slot.bottom - d * TUBE_BOTTOM_PAD_FACTOR - d / 2 - index * d * BALL_STEP_FACTOR };
}

/** Posição da bola levantada, acima do tubo. */
export function liftPosition(slot: TubeSlot, d: number): { x: number; y: number } {
  return { x: slot.x, y: slot.top - d * 0.62 };
}
