import Phaser from 'phaser';
import { computeStars, GameSession, type Level, type Move } from '../core';
import { ANIM, COLORS, dp, DPR, FONT_FAMILY } from '../config/display';
import { audio, type Sfx } from '../services/audio';
import { t } from '../services/i18n';
import { LevelService } from '../services/levels';
import { Button } from '../ui/Button';
import { ballPosition, computeLayout, liftPosition, type Layout } from '../ui/layout';
import { BALL_TEX, ballKey, BG_KEY, drawBackground, PARTICLE_KEY, STAR_KEY, TUBE_KEY } from '../ui/textures';
import { BALL_COLORS } from '../config/palette';
import { iconKey } from './BootScene';

const HUD_TOP_DP = 84;
const HUD_BOTTOM_DP = 96;

export interface GameSceneData {
  readonly level?: number;
}

/** Cena principal: tubos, bolas, HUD e botões. Toda a lógica vem de `GameSession`. */
export class GameScene extends Phaser.Scene {
  private readonly levels = new LevelService();
  private levelNumber = 1;
  private level: Level | null = null;
  private session: GameSession | null = null;
  private layout: Layout | null = null;

  private bg!: Phaser.GameObjects.Image;
  private levelText!: Phaser.GameObjects.Text;
  private movesText!: Phaser.GameObjects.Text;
  private tagText!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;
  private undoBtn!: Button;
  private restartBtn!: Button;
  private extraBtn!: Button;

  private tubeImages: Phaser.GameObjects.Image[] = [];
  private hitZones: Phaser.GameObjects.Zone[] = [];
  private balls: Phaser.GameObjects.Image[][] = [];
  private readonly tweensBySprite = new Map<Phaser.GameObjects.Image, Phaser.Tweens.Tween>();
  private winPanel: Phaser.GameObjects.Container | null = null;
  private loading = false;

  constructor() {
    super('game');
  }

  init(data: GameSceneData): void {
    const hashLevel = /^(?:level)?(\d+)$/.exec(window.location.hash.replace(/^#/, ''))?.[1];
    const fromUrl = Number(new URLSearchParams(window.location.search).get('level') ?? hashLevel);
    this.levelNumber = data.level ?? (Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : 1);
  }

  create(): void {
    this.bg = this.add.image(0, 0, BG_KEY).setOrigin(0).setDepth(-10);
    const textStyle = (size: number, color: string = COLORS.text): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontFamily: FONT_FAMILY,
      fontSize: `${Math.round(dp(size))}px`,
      fontStyle: 'bold',
      color,
    });
    this.levelText = this.add.text(0, 0, '', textStyle(26)).setOrigin(0.5, 0);
    this.movesText = this.add.text(0, 0, '', textStyle(16, COLORS.textDim)).setOrigin(0.5, 0);
    this.tagText = this.add.text(0, 0, '', textStyle(13, '#ffd84a')).setOrigin(0.5, 0);
    this.toast = this.add.text(0, 0, '', textStyle(15)).setOrigin(0.5).setAlpha(0).setDepth(20);

    const btnW = dp(100);
    this.undoBtn = new Button(this, 0, 0, { label: '', icon: iconKey('return'), width: btnW, onClick: () => this.onUndo() });
    this.restartBtn = new Button(this, 0, 0, { label: t('restart'), icon: iconKey('rewind'), width: btnW, onClick: () => this.onRestart() });
    this.extraBtn = new Button(this, 0, 0, { label: t('extraTube'), icon: iconKey('plus'), width: btnW, onClick: () => this.onExtraTube() });

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this));

    this.layoutChrome();
    void this.loadLevel(this.levelNumber);
  }

  // ---------------------------------------------------------------- níveis

  private async loadLevel(n: number): Promise<void> {
    this.loading = true;
    this.levelNumber = n;
    this.clearBoard();
    this.closeWinPanel();
    this.levelText.setText(t('level', { n }));
    this.movesText.setText(t('loading'));
    this.tagText.setText('');
    this.updateButtons();
    const level = await this.levels.get(n);
    if (this.levelNumber !== n) return;
    this.level = level;
    this.session = new GameSession(level.level, level.board, level.capacity);
    this.loading = false;
    this.buildBoard();
    this.updateHud();
    // Pré-gera o seguinte enquanto se joga.
    this.levels.prefetch(n + 1);
  }

  private clearBoard(): void {
    for (const s of this.tweensBySprite.keys()) s.destroy();
    this.tweensBySprite.clear();
    this.tubeImages.forEach((o) => o.destroy());
    this.hitZones.forEach((o) => o.destroy());
    this.balls.flat().forEach((o) => o.destroy());
    this.tubeImages = [];
    this.hitZones = [];
    this.balls = [];
  }

  private buildBoard(): void {
    const session = this.session;
    if (session === null) return;
    this.clearBoard();
    session.board.forEach((tube, i) => {
      this.addTubeObjects(i);
      this.balls.push(tube.map((color) => this.add.image(0, 0, ballKey(color)).setDepth(2)));
    });
    this.relayout(false);
  }

  private addTubeObjects(i: number): void {
    this.tubeImages.push(this.add.image(0, 0, TUBE_KEY).setOrigin(0.5, 0).setDepth(1));
    const zone = this.add.zone(0, 0, 10, 10).setOrigin(0).setInteractive();
    zone.on('pointerdown', () => this.onTubeTap(i));
    this.hitZones.push(zone);
  }

  // ---------------------------------------------------------------- layout

  private onResize(): void {
    this.layoutChrome();
    this.relayout(false);
  }

  private layoutChrome(): void {
    const { width, height } = this.scale;
    drawBackground(this, width, height, COLORS.bgTop, COLORS.bgBottom);
    this.bg.setTexture(BG_KEY).setDisplaySize(width, height);
    this.levelText.setPosition(width / 2, dp(14));
    this.movesText.setPosition(width / 2, dp(48));
    this.tagText.setPosition(width / 2, dp(68));
    this.toast.setPosition(width / 2, height - dp(HUD_BOTTOM_DP) - dp(18));
    const btnH = dp(64);
    const gap = dp(10);
    const btnW = Math.min(dp(120), (width - dp(16) * 2 - gap * 2) / 3);
    const y = height - dp(16) - btnH / 2;
    [this.undoBtn, this.restartBtn, this.extraBtn].forEach((b, i) => {
      b.resize(btnW, btnH).setPosition(width / 2 + (i - 1) * (btnW + gap), y);
    });
    this.winPanel !== null && this.showWinPanel(false);
  }

  private relayout(animate: boolean): void {
    const session = this.session;
    if (session === null) return;
    const { width, height } = this.scale;
    const layout = computeLayout({
      count: session.board.length,
      capacity: session.capacity,
      width,
      height,
      top: dp(HUD_TOP_DP),
      bottom: dp(HUD_BOTTOM_DP + 8),
      dpr: DPR,
    });
    this.layout = layout;
    const scale = layout.ball / BALL_TEX;
    layout.tubes.forEach((slot, i) => {
      const tube = this.tubeImages[i];
      const zone = this.hitZones[i];
      if (tube === undefined || zone === undefined) return;
      tube.setScale(scale).setPosition(slot.x, slot.top);
      zone.setPosition(slot.hit.x, slot.hit.y).setSize(slot.hit.width, slot.hit.height);
      if (zone.input !== null) zone.input.hitArea = new Phaser.Geom.Rectangle(0, 0, slot.hit.width, slot.hit.height);
      (this.balls[i] ?? []).forEach((ball, k) => {
        ball.setScale(scale);
        const lifted = session.selected === i && k === (this.balls[i]?.length ?? 0) - 1;
        const p = lifted ? liftPosition(slot, layout.ball) : ballPosition(slot, k, layout.ball);
        if (animate) this.tweenTo(ball, p.x, p.y, ANIM.arc, 'Sine.easeInOut');
        else {
          this.stopTween(ball);
          ball.setPosition(p.x, p.y);
        }
      });
      this.tintTube(i);
    });
  }

  private tintTube(i: number): void {
    const s = this.session;
    const img = this.tubeImages[i];
    if (s === null || img === undefined) return;
    img.setTint(s.selected === i ? COLORS.tubeSelected : s.isTubeComplete(i) ? COLORS.tubeComplete : COLORS.tube);
  }

  // ---------------------------------------------------------------- animação

  private stopTween(sprite: Phaser.GameObjects.Image): void {
    this.tweensBySprite.get(sprite)?.stop();
    this.tweensBySprite.delete(sprite);
  }

  private track(sprite: Phaser.GameObjects.Image, tween: Phaser.Tweens.Tween): void {
    this.tweensBySprite.set(sprite, tween);
  }

  private tweenTo(sprite: Phaser.GameObjects.Image, x: number, y: number, duration: number, ease: string, onDone?: () => void): void {
    this.stopTween(sprite);
    this.track(
      sprite,
      this.tweens.add({
        targets: sprite,
        x,
        y,
        duration,
        ease,
        onComplete: () => {
          this.tweensBySprite.delete(sprite);
          onDone?.();
        },
      }),
    );
  }

  /** Levantar → arco até acima do destino → pousar com pequeno ressalto. */
  private arcTo(sprite: Phaser.GameObjects.Image, toTube: number, toIndex: number, onLanded: () => void): void {
    const layout = this.layout;
    const slot = layout?.tubes[toTube];
    if (layout === null || slot === undefined) return;
    const d = layout.ball;
    const start = { x: sprite.x, y: sprite.y };
    const hover = liftPosition(slot, d);
    const end = ballPosition(slot, toIndex, d);
    const ctrl = { x: (start.x + hover.x) / 2, y: Math.min(start.y, hover.y) - d * 1.1 };
    const state = { p: 0 };
    this.stopTween(sprite);
    sprite.setDepth(5);
    const arc = this.tweens.add({
      targets: state,
      p: 1,
      duration: ANIM.arc,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const u = state.p;
        const a = (1 - u) * (1 - u);
        const b = 2 * (1 - u) * u;
        const c = u * u;
        sprite.setPosition(a * start.x + b * ctrl.x + c * hover.x, a * start.y + b * ctrl.y + c * hover.y);
      },
      onComplete: () => {
        this.tweenTo(sprite, end.x, end.y, ANIM.land, 'Back.easeOut', () => {
          sprite.setDepth(2);
          onLanded();
        });
      },
    });
    this.track(sprite, arc);
  }

  private shake(sprite: Phaser.GameObjects.Image, onDone: () => void): void {
    this.stopTween(sprite);
    const x = sprite.x;
    const amp = (this.layout?.ball ?? dp(30)) * 0.16;
    this.track(
      sprite,
      this.tweens.add({
        targets: sprite,
        x: { from: x - amp, to: x + amp },
        duration: ANIM.shake / 4,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          sprite.setX(x);
          this.tweensBySprite.delete(sprite);
          onDone();
        },
      }),
    );
  }

  private celebrateTube(i: number): void {
    const img = this.tubeImages[i];
    const layout = this.layout;
    if (img === undefined || layout === null) return;
    const base = layout.ball / BALL_TEX;
    this.tweens.add({ targets: img, scaleX: base * 1.08, scaleY: base * 1.04, duration: ANIM.complete / 2, yoyo: true, ease: 'Quad.easeOut' });
    const balls = this.balls[i] ?? [];
    balls.forEach((b, k) =>
      this.tweens.add({ targets: b, scale: base * 1.15, duration: ANIM.complete / 2, delay: k * 30, yoyo: true, ease: 'Quad.easeOut' }),
    );
    this.sfx('complete');
  }

  private confetti(): void {
    const { width } = this.scale;
    const emitter = this.add.particles(0, -dp(10), PARTICLE_KEY, {
      x: { min: 0, max: width },
      lifespan: 2200,
      speedY: { min: dp(180), max: dp(380) },
      speedX: { min: -dp(60), max: dp(60) },
      rotate: { start: 0, end: 540 },
      scale: { min: DPR * 0.7, max: DPR * 1.2 },
      gravityY: dp(220),
      tint: [...BALL_COLORS],
      quantity: 6,
      frequency: 30,
      emitting: true,
    });
    emitter.setDepth(30);
    this.time.delayedCall(700, () => emitter.stop());
    this.time.delayedCall(3200, () => emitter.destroy());
  }

  private sfx(s: Sfx): void {
    audio.play(this, s);
  }

  // ---------------------------------------------------------------- input

  private onTubeTap(i: number): void {
    const session = this.session;
    const layout = this.layout;
    if (session === null || layout === null || this.loading || this.winPanel !== null) return;
    const r = session.tap(i);
    switch (r.kind) {
      case 'ignored':
        return;
      case 'select': {
        const ball = this.topBall(i);
        const slot = layout.tubes[i];
        if (ball !== undefined && slot !== undefined) {
          const p = liftPosition(slot, layout.ball);
          ball.setDepth(5);
          this.tweenTo(ball, p.x, p.y, ANIM.lift, 'Quad.easeOut');
        }
        this.sfx('lift');
        break;
      }
      case 'deselect':
        this.dropBack(i);
        this.sfx('drop');
        break;
      case 'invalid': {
        const from = r.move.from;
        const ball = this.topBall(from);
        if (ball !== undefined) this.shake(ball, () => this.dropBack(from));
        this.sfx('error');
        audio.vibrate(40);
        break;
      }
      case 'move':
        this.animateMove(r.move, r.completedTube, r.solved);
        break;
    }
    this.tintAll();
    this.updateHud();
  }

  private topBall(i: number): Phaser.GameObjects.Image | undefined {
    const stack = this.balls[i];
    return stack?.[stack.length - 1];
  }

  private dropBack(i: number): void {
    const ball = this.topBall(i);
    const slot = this.layout?.tubes[i];
    const layout = this.layout;
    if (ball === undefined || slot === undefined || layout === null) return;
    const p = ballPosition(slot, (this.balls[i]?.length ?? 1) - 1, layout.ball);
    this.tweenTo(ball, p.x, p.y, ANIM.drop, 'Back.easeOut', () => ball.setDepth(2));
  }

  private animateMove(move: Move, completed: boolean, solved: boolean): void {
    const ball = this.balls[move.from]?.pop();
    const dest = this.balls[move.to];
    if (ball === undefined || dest === undefined) return;
    dest.push(ball);
    this.arcTo(ball, move.to, dest.length - 1, () => {
      this.sfx('drop');
      if (completed) this.celebrateTube(move.to);
      if (solved) this.onSolved();
    });
  }

  private tintAll(): void {
    this.tubeImages.forEach((_, i) => this.tintTube(i));
  }

  // ---------------------------------------------------------------- botões

  private dropSelection(): void {
    const s = this.session;
    if (s === null || s.selected === null) return;
    const i = s.selected;
    s.clearSelection();
    this.dropBack(i);
  }

  private onUndo(): void {
    const s = this.session;
    if (s === null || this.winPanel !== null) return;
    this.dropSelection();
    const r = s.undo();
    if (!r.ok) {
      if (r.reason === 'no-undos-left') this.showToast(t('noUndos'));
      return;
    }
    this.sfx('click');
    const ball = this.balls[r.move.from]?.pop();
    const dest = this.balls[r.move.to];
    if (ball !== undefined && dest !== undefined) {
      dest.push(ball);
      this.arcTo(ball, r.move.to, dest.length - 1, () => undefined);
    }
    this.tintAll();
    this.updateHud();
  }

  private onRestart(): void {
    const s = this.session;
    if (s === null || this.winPanel !== null) return;
    this.sfx('click');
    s.restart();
    this.buildBoard();
    this.updateHud();
  }

  private onExtraTube(): void {
    const s = this.session;
    if (s === null || this.winPanel !== null) return;
    this.dropSelection();
    if (!s.addExtraTube()) {
      this.showToast(t('extraUsed'));
      return;
    }
    // Fase 4: só depois de um vídeo com recompensa.
    this.sfx('extra');
    const i = s.board.length - 1;
    this.addTubeObjects(i);
    this.balls.push([]);
    this.relayout(true);
    this.updateHud();
  }

  private updateHud(): void {
    const s = this.session;
    if (s !== null) {
      this.movesText.setText(t('moves', { n: s.moveCount }));
      this.tagText.setText(this.level?.params.hard === true ? t('hardLevel') : '');
    }
    this.updateButtons();
  }

  private updateButtons(): void {
    const s = this.session;
    const ready = s !== null && !this.loading && !s.solved;
    this.undoBtn.setLabel(`${t('undo')} (${s?.undosLeft ?? 0})`);
    this.undoBtn.setEnabled(ready && s.canUndoMove && s.undosLeft > 0);
    this.restartBtn.setEnabled(ready && s.moveCount > 0);
    this.extraBtn.setEnabled(ready && !s.extraTubeUsed);
  }

  private showToast(text: string): void {
    this.toast.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 1200, duration: 300 });
  }

  // ---------------------------------------------------------------- vitória

  private onSolved(): void {
    this.time.delayedCall(250, () => {
      this.sfx('win');
      this.confetti();
      this.showWinPanel(true);
    });
  }

  private closeWinPanel(): void {
    this.winPanel?.destroy();
    this.winPanel = null;
  }

  /** Painel simples de vitória (o ecrã completo chega na Fase 3). */
  private showWinPanel(animate: boolean): void {
    const s = this.session;
    const level = this.level;
    if (s === null || level === null) return;
    this.closeWinPanel();
    const { width, height } = this.scale;
    const pw = Math.min(width - dp(32), dp(340));
    const ph = dp(300);
    const panel = this.add.container(width / 2, height / 2).setDepth(40);
    const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.45).setInteractive();
    const box = this.add.nineslice(0, 0, 'button', undefined, pw, ph, 20, 20, 20, 20).setTint(COLORS.panel);
    const title = this.add
      .text(0, -ph / 2 + dp(28), t('levelComplete'), { fontFamily: FONT_FAMILY, fontSize: `${Math.round(dp(24))}px`, fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5, 0);
    const stars = computeStars(s.moveCount, level.minMoves);
    const starObjs = [0, 1, 2].map((k) =>
      this.add
        .image((k - 1) * dp(64), -dp(28), STAR_KEY)
        .setDisplaySize(dp(56), dp(56))
        .setTint(k < stars ? COLORS.star : COLORS.starEmpty),
    );
    const info = this.add
      .text(0, dp(28), `${t('movesMade', { n: s.moveCount })} · ${t('minMoves', { n: level.minMoves })}`, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(dp(16))}px`,
        color: COLORS.textDim,
      })
      .setOrigin(0.5);
    const next = new Button(this, 0, ph / 2 - dp(52), {
      label: t('nextLevel'),
      width: pw - dp(48),
      height: dp(56),
      color: 0x3cb44b,
      onClick: () => {
        this.sfx('click');
        void this.loadLevel(this.levelNumber + 1);
      },
    });
    panel.add([dim, box, title, ...starObjs, info, next]);
    this.winPanel = panel;
    if (animate) {
      panel.setScale(0.85).setAlpha(0);
      this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
      starObjs.forEach((st, k) => {
        const size = dp(56);
        st.setDisplaySize(1, 1);
        this.tweens.add({ targets: st, displayWidth: size, displayHeight: size, delay: 200 + k * 140, duration: 220, ease: 'Back.easeOut' });
      });
    }
  }
}
