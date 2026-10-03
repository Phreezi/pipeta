import Phaser from 'phaser';
import type { Stars } from '../core';
import { COLORS, dp } from '../config/display';
import { audio } from '../services/audio';
import { t } from '../services/i18n';
import { Button } from '../ui/Button';
import { textStyle } from '../ui/text';
import { BUTTON_KEY, STAR_KEY } from '../ui/textures';

export interface WinData {
  readonly level: number;
  readonly moves: number;
  readonly minMoves: number;
  readonly stars: Stars;
}

/** Ecrã de vitória: estrelas, jogadas feitas e Próximo nível. */
export class WinScene extends Phaser.Scene {
  private info!: WinData;
  private items: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('win');
  }

  init(data: WinData): void {
    this.info = data;
  }

  create(): void {
    this.build(true);
    const onResize = (): void => this.build(false);
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));
  }

  private build(animate: boolean): void {
    this.items.forEach((o) => o.destroy());
    this.items = [];
    const { width, height } = this.scale;
    const { level, moves, minMoves, stars } = this.info;
    const cx = width / 2;
    const cy = height / 2;
    const pw = Math.min(width - dp(32), dp(340));
    const ph = dp(400);

    const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.45).setOrigin(0).setInteractive();
    const panel = this.add.container(cx, cy);
    const box = this.add.nineslice(0, 0, BUTTON_KEY, undefined, pw, ph, 20, 20, 20, 20).setTint(COLORS.panel);
    const title = this.add.text(0, -ph / 2 + dp(24), t('levelComplete'), textStyle(24)).setOrigin(0.5, 0);
    const sub = this.add.text(0, -ph / 2 + dp(60), t('level', { n: level }), textStyle(16, COLORS.textDim, false)).setOrigin(0.5, 0);
    const size = dp(60);
    const starObjs = [0, 1, 2].map((k) =>
      this.add
        .image((k - 1) * dp(70), -dp(52) + (k === 1 ? -dp(10) : 0), STAR_KEY)
        .setDisplaySize(size, size)
        .setTint(k < stars ? COLORS.star : COLORS.starEmpty),
    );
    const movesText = this.add.text(0, dp(18), t('movesMade', { n: moves }), textStyle(20)).setOrigin(0.5);
    const best = this.add.text(0, dp(46), t('minMoves', { n: minMoves }), textStyle(15, COLORS.textDim, false)).setOrigin(0.5);
    const next = new Button(this, 0, ph / 2 - dp(96), {
      label: t('nextLevel'),
      width: pw - dp(48),
      height: dp(56),
      color: 0x3cb44b,
      onClick: () => this.go('next'),
    });
    const menu = new Button(this, 0, ph / 2 - dp(36), {
      label: t('menu'),
      width: pw - dp(48),
      height: dp(48),
      onClick: () => this.go('menu'),
    });
    panel.add([box, title, sub, ...starObjs, movesText, best, next, menu]);
    this.items.push(dim, panel);

    if (animate) {
      panel.setScale(0.85).setAlpha(0);
      this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
      starObjs.forEach((st, k) => {
        st.setDisplaySize(1, 1);
        this.tweens.add({
          targets: st,
          displayWidth: size,
          displayHeight: size,
          delay: 220 + k * 160,
          duration: 230,
          ease: 'Back.easeOut',
          onStart: () => k < stars && audio.play(this, 'lift'),
        });
      });
    }
  }

  private go(where: 'next' | 'menu'): void {
    audio.play(this, 'click');
    if (where === 'next') {
      this.scene.get('game').events.emit('next-level');
      this.scene.stop();
    } else {
      this.scene.stop('game');
      this.scene.start('menu');
    }
  }
}
