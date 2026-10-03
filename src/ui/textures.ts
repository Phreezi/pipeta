import Phaser from 'phaser';
import { BALL_COLORS } from '../config/palette';
import { BALL_STEP_FACTOR, TUBE_BOTTOM_PAD_FACTOR, TUBE_TOP_PAD_FACTOR, TUBE_WIDTH_FACTOR } from '../ui/layout';

/** Resolução base das texturas geradas (as sprites são escaladas). */
export const BALL_TEX = 96;

export const ballKey = (color: number, colorBlind = false): string => (colorBlind ? `ballcb-${color}` : `ball-${color}`);
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

function polygon(g: Phaser.GameObjects.Graphics, cx: number, cy: number, radius: number, sides: number, rotation: number): void {
  const pts: Phaser.Math.Vector2[] = [];
  for (let k = 0; k < sides; k++) {
    const a = rotation + (k * 2 * Math.PI) / sides;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius));
  }
  g.fillPoints(pts, true);
}

function starPoints(cx: number, cy: number, outer: number, inner: number): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 === 0 ? outer : inner;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
  }
  return pts;
}

/** Símbolo do modo daltónico: uma forma diferente por cor. */
function drawSymbol(g: Phaser.GameObjects.Graphics, index: number, cx: number, cy: number, s: number, color: number, alpha: number): void {
  g.fillStyle(color, alpha);
  g.lineStyle(s * 0.32, color, alpha);
  switch (index % 12) {
    case 0: g.fillCircle(cx, cy, s * 0.72); break; // círculo
    case 1: polygon(g, cx, cy + s * 0.12, s * 0.85, 3, -Math.PI / 2); break; // triângulo
    case 2: g.fillRect(cx - s * 0.62, cy - s * 0.62, s * 1.24, s * 1.24); break; // quadrado
    case 3: polygon(g, cx, cy, s * 0.85, 4, 0); break; // losango
    case 4: g.fillPoints(starPoints(cx, cy, s * 0.95, s * 0.42), true); break; // estrela
    case 5: // cruz
      g.fillRect(cx - s * 0.2, cy - s * 0.8, s * 0.4, s * 1.6);
      g.fillRect(cx - s * 0.8, cy - s * 0.2, s * 1.6, s * 0.4);
      break;
    case 6: // coração
      g.fillCircle(cx - s * 0.36, cy - s * 0.2, s * 0.42);
      g.fillCircle(cx + s * 0.36, cy - s * 0.2, s * 0.42);
      g.fillTriangle(cx - s * 0.76, cy - s * 0.05, cx + s * 0.76, cy - s * 0.05, cx, cy + s * 0.8);
      break;
    case 7: polygon(g, cx, cy - s * 0.12, s * 0.85, 3, Math.PI / 2); break; // triângulo invertido
    case 8: polygon(g, cx, cy, s * 0.8, 5, -Math.PI / 2); break; // pentágono
    case 9: // X
      g.lineStyle(s * 0.38, color, alpha);
      g.lineBetween(cx - s * 0.6, cy - s * 0.6, cx + s * 0.6, cy + s * 0.6);
      g.lineBetween(cx + s * 0.6, cy - s * 0.6, cx - s * 0.6, cy + s * 0.6);
      break;
    case 10: g.strokeCircle(cx, cy, s * 0.6); break; // anel
    default: polygon(g, cx, cy, s * 0.8, 6, 0); break; // hexágono
  }
}

/** Bolas, tubo, botão, partículas e estrela, desenhados com Graphics e convertidos em texturas. */
export function generateTextures(scene: Phaser.Scene, capacity: number): void {
  const g = scene.make.graphics({}, false);
  const r = BALL_TEX / 2;

  const drawBall = (color: number): void => {
    // Sombra inferior + corpo + brilho: aspeto de esfera sem imagens.
    g.fillStyle(shade(color, 0.62), 1);
    g.fillCircle(r, r, r);
    g.fillStyle(color, 1);
    g.fillCircle(r - 3, r - 4, r - 5);
    g.fillStyle(shade(color, 1.25), 1);
    g.fillCircle(r - 10, r - 12, r * 0.45);
    g.fillStyle(0xffffff, 0.75);
    g.fillEllipse(r - 16, r - 20, r * 0.42, r * 0.26);
  };

  BALL_COLORS.forEach((color, i) => {
    if (!scene.textures.exists(ballKey(i))) {
      g.clear();
      drawBall(color);
      g.generateTexture(ballKey(i), BALL_TEX, BALL_TEX);
    }
    if (!scene.textures.exists(ballKey(i, true))) {
      g.clear();
      drawBall(color);
      const c = Phaser.Display.Color.IntegerToColor(color);
      const light = (0.299 * c.red + 0.587 * c.green + 0.114 * c.blue) / 255 > 0.6;
      drawSymbol(g, i, r, r + 2, r * 0.42, light ? 0x1a1a2e : 0xffffff, light ? 0.75 : 0.95);
      g.generateTexture(ballKey(i, true), BALL_TEX, BALL_TEX);
    }
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
    g.fillPoints(starPoints(96, 100, 96, 40), true);
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
