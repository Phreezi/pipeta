/** devicePixelRatio limitado a 2 (nitidez vs. desempenho em gama média). */
export const DPR = Math.min(Math.max(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1), 2);

/** Converte dp (px CSS) para píxeis do canvas. */
export const dp = (v: number): number => v * DPR;

export const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const COLORS = {
  bgTop: '#2b3266',
  bgBottom: '#5a3f7a',
  text: '#ffffff',
  textDim: '#c9cbe8',
  tube: 0xffffff,
  tubeSelected: 0xffe36e,
  tubeComplete: 0x7ee08a,
  button: 0x5a67d8,
  buttonDisabled: 0x6b6f8a,
  panel: 0x232849,
  star: 0xffd84a,
  starEmpty: 0x4a4f75,
} as const;

/** Durações das animações (ms). */
export const ANIM = {
  lift: 150,
  arc: 220,
  land: 170,
  shake: 240,
  drop: 150,
  complete: 250,
} as const;
