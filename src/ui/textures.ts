import Phaser from 'phaser';
import { BALL_COLORS } from '../config/palette';
import { BALL_STEP_FACTOR, TUBE_BOTTOM_PAD_FACTOR, TUBE_TOP_PAD_FACTOR, TUBE_WIDTH_FACTOR } from '../ui/layout';

/** Resolução base das texturas geradas (as sprites são escaladas). */
export const BALL_TEX = 96;

export const ballKey = (color: number): string => `ball-${color}`;
export const TUBE_KEY = 'tube';
export const BUTTON_KEY = 'button';
export const PARTICLE_KEY = 'particle';
export const STAR_KEY = 'star-shape';
export const BG_KEY = 'background';

function shade(color: number, factor: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const f = (v: number): number => Math.max(0, Math.min(255, Math.round(factor >= 1 ? v + (255 - v) * (factor - 1) : v * factor)));
  return Phaser.Display.Color.GetColor(f(c.red), f(c.green), f(c.blue));
}

/** Bolas, tubo, botão, partículas e estrela, desenhados com Graphics e convertidos em texturas. */
export function generateTextures(scene: Phaser.Scene, capacity: number): void {
  const g = scene.make.graphics({}, false);
  const r = BALL_TEX / 2;

  BALL_COLORS.forEach((color, i) => {
    const key = ballKey(i);
    if (scene.textures.exists(key)) return;
    g.clear();
    // Sombra inferior + corpo + brilho: aspeto de esfera sem imagens.
    g.fillStyle(shade(color, 0.62), 1);
    g.fillCircle(r, r, r);
    g.fillStyle(color, 1);
    g.fillCircle(r - 3, r - 4, r - 5);
    g.fillStyle(shade(color, 1.25), 1);
    g.fillCircle(r - 10, r - 12, r * 0.45);
    g.fillStyle(0xffffff, 0.75);
    g.fillEllipse(r - 16, r - 20, r * 0.42, r * 0.26);
    g.generateTexture(key, BALL_TEX, BALL_TEX);
  });

  if (!scene.textures.exists(TUBE_KEY)) {
    const d = BALL_TEX;
    const w = Math.round(d * TUBE_WIDTH_FACTOR);
    const h = Math.round(d * (capacity * BALL_STEP_FACTOR + TUBE_BOTTOM_PAD_FACTOR + TUBE_TOP_PAD_FACTOR));
    const lw = 6;
    const radius = w / 2 - lw;
    g.clear();
    g.fillStyle(0xffffff, 0.13);
    g.fillRoundedRect(lw / 2, lw, w - lw, h - lw * 1.5, { tl: 0, tr: 0, bl: radius, br: radius });
    g.lineStyle(lw, 0xffffff, 0.85);
    g.strokeRoundedRect(lw / 2, lw, w - lw, h - lw * 1.5, { tl: 0, tr: 0, bl: radius, br: radius });
    // Rebordo.
    g.fillStyle(0xffffff, 0.9);
    g.fillRoundedRect(0, 0, w, lw * 1.6, lw * 0.8);
    // Reflexo.
    g.fillStyle(0xffffff, 0.18);
    g.fillRoundedRect(lw * 2.2, lw * 3, lw * 1.6, h * 0.62, lw * 0.8);
    g.generateTexture(TUBE_KEY, w, h);
  }

  if (!scene.textures.exists(BUTTON_KEY)) {
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, 64, 64, 18);
    g.generateTexture(BUTTON_KEY, 64, 64);
  }

  if (!scene.textures.exists(PARTICLE_KEY)) {
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 12, 8);
    g.generateTexture(PARTICLE_KEY, 12, 8);
  }

  if (!scene.textures.exists(STAR_KEY)) {
    g.clear();
    g.fillStyle(0xffffff, 1);
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? 96 : 40;
      pts.push(new Phaser.Math.Vector2(96 + Math.cos(a) * rr, 100 + Math.sin(a) * rr));
    }
    g.fillPoints(pts, true);
    g.generateTexture(STAR_KEY, 192, 192);
  }
  g.destroy();
}

/** Fundo em gradiente suave (textura de canvas, regenerada ao redimensionar). */
export function drawBackground(scene: Phaser.Scene, width: number, height: number, top: string, bottom: string): void {
  if (scene.textures.exists(BG_KEY)) scene.textures.remove(BG_KEY);
  // Textura pequena esticada: o gradiente vertical não precisa de resolução total.
  const h = Math.max(2, Math.min(256, Math.round(height / 4)));
  const tex = scene.textures.createCanvas(BG_KEY, 2, h);
  if (tex === null) return;
  const ctx = tex.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, h);
  tex.refresh();
  void width;
}
