import Phaser from 'phaser';
import { COLORS, dp, FONT_FAMILY } from '../config/display';
import { BUTTON_KEY } from './textures';

export interface ButtonOptions {
  readonly label: string;
  readonly icon?: string;
  readonly width: number;
  readonly height?: number;
  readonly color?: number;
  readonly onClick: () => void;
}

/** Botão com fundo arredondado, ícone opcional (Kenney) e texto. Altura mínima 48 dp. */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.NineSlice;
  private readonly text: Phaser.GameObjects.Text;
  private readonly iconImg: Phaser.GameObjects.Image | null;
  private enabledState = true;
  private baseColor: number;
  private readonly iconOnly: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOptions) {
    super(scene, x, y);
    const h = opts.height ?? dp(56);
    this.baseColor = opts.color ?? COLORS.button;
    this.bg = scene.add.nineslice(0, 0, BUTTON_KEY, undefined, opts.width, h, 20, 20, 20, 20);
    this.bg.setTint(this.baseColor);
    this.add(this.bg);

    const hasIcon = opts.icon !== undefined && scene.textures.exists(opts.icon);
    this.iconOnly = hasIcon && opts.label === '';
    this.iconImg = hasIcon && opts.icon !== undefined ? scene.add.image(0, 0, opts.icon) : null;
    if (this.iconImg !== null) this.add(this.iconImg);
    this.text = scene.add
      .text(0, 0, opts.label, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(hasIcon ? dp(12) : dp(17))}px`,
        fontStyle: 'bold',
        color: COLORS.text,
        align: 'center',
      })
      .setOrigin(0.5);
    this.add(this.text);

    this.resize(opts.width, h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      if (!this.enabledState) return;
      this.setScale(0.94);
    });
    this.on('pointerout', () => this.setScale(1));
    this.on('pointerup', () => {
      this.setScale(1);
      if (this.enabledState) opts.onClick();
    });
    scene.add.existing(this);
  }

  setLabel(label: string): this {
    this.text.setText(label);
    return this;
  }

  setColor(color: number): this {
    this.baseColor = color;
    if (this.enabledState) this.bg.setTint(color);
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.enabledState = enabled;
    this.bg.setTint(enabled ? this.baseColor : COLORS.buttonDisabled);
    this.setAlpha(enabled ? 1 : 0.55);
    return this;
  }

  get isEnabled(): boolean {
    return this.enabledState;
  }

  resize(width: number, height: number): this {
    this.bg.setSize(width, height);
    this.setSize(width, height);
    const hit: unknown = this.input?.hitArea;
    if (hit instanceof Phaser.Geom.Rectangle) hit.setSize(width, height);
    if (this.iconImg !== null) {
      const size = this.iconOnly ? height * 0.56 : height * 0.42;
      this.iconImg.setDisplaySize(size, size).setY(this.iconOnly ? 0 : -height * 0.14);
      this.text.setY(this.iconOnly ? 0 : height * 0.26);
    } else if (this.text.text.length > 0 && this.text.text.includes('\n') === false) {
      this.text.setY(0);
    }
    return this;
  }
}
