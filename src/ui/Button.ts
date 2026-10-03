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
  private readonly baseColor: number;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOptions) {
    super(scene, x, y);
    const h = opts.height ?? dp(56);
    this.baseColor = opts.color ?? COLORS.button;
    this.bg = scene.add.nineslice(0, 0, BUTTON_KEY, undefined, opts.width, h, 20, 20, 20, 20);
    this.bg.setTint(this.baseColor);
    this.add(this.bg);

    const hasIcon = opts.icon !== undefined && scene.textures.exists(opts.icon);
    this.iconImg = hasIcon && opts.icon !== undefined ? scene.add.image(0, -h * 0.14, opts.icon) : null;
    if (this.iconImg !== null) {
      this.iconImg.setDisplaySize(h * 0.42, h * 0.42);
      this.add(this.iconImg);
    }
    this.text = scene.add
      .text(0, hasIcon ? h * 0.26 : 0, opts.label, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(hasIcon ? dp(12) : dp(17))}px`,
        fontStyle: 'bold',
        color: COLORS.text,
        align: 'center',
      })
      .setOrigin(0.5);
    this.add(this.text);

    this.setSize(opts.width, h);
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
    this.input?.hitArea.setSize?.(width, height);
    if (this.iconImg !== null) {
      this.iconImg.setDisplaySize(height * 0.42, height * 0.42).setY(-height * 0.14);
      this.text.setY(height * 0.26);
    }
    return this;
  }
}
