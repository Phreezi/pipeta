import Phaser from 'phaser';
import { store } from '../app/context';
import { COLORS, dp } from '../config/display';
import { audio } from '../services/audio';
import { t } from '../services/i18n';
import { totalStars } from '../services/save';
import { addBackground } from '../ui/background';
import { Button } from '../ui/Button';
import { textStyle } from '../ui/text';
import { BALL_TEX, ballKey, STAR_KEY, TUBE_KEY } from '../ui/textures';
import { iconKey } from './BootScene';

/** Menu principal: Jogar (continua no nível atual), nível atual, definições. */
export class MenuScene extends Phaser.Scene {
  private items: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('menu');
  }

  create(): void {
    addBackground(this);
    this.build();
    const onResize = (): void => this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));
    // Ao voltar das definições (ex.: mudança de idioma), reconstrói os textos.
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.build());
  }

  private build(): void {
    this.items.forEach((o) => o.destroy());
    this.items = [];
    const { width, height } = this.scale;
    const save = store.value;
    const cx = width / 2;
    const colorBlind = save.settings.colorBlind;

    // Logótipo: três tubos com bolas.
    const d = Math.min(dp(40), width / 9);
    const scale = d / BALL_TEX;
    const logoY = height * 0.16;
    const logo: number[][] = [
      [0, 3, 0, 2],
      [3, 2, 3, 0],
      [2, 0, 2, 3],
    ];
    logo.forEach((tube, i) => {
      const x = cx + (i - 1) * d * 1.9;
      this.items.push(this.add.image(x, logoY, TUBE_KEY).setOrigin(0.5, 0).setScale(scale));
      tube.forEach((c, k) => {
        const ball = this.add.image(x, logoY + d * 4.4 - d * 0.66 - k * d * 1.06, ballKey(c, colorBlind)).setScale(scale);
        this.items.push(ball);
        this.tweens.add({ targets: ball, y: ball.y - d * 0.08, duration: 900 + i * 120 + k * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      });
    });

    const titleY = logoY + d * 5;
    this.items.push(this.add.text(cx, titleY, 'Pipeta', textStyle(46)).setOrigin(0.5, 0));

    const infoY = titleY + dp(70);
    this.items.push(this.add.text(cx, infoY, t('currentLevel', { n: save.currentLevel }), textStyle(18, COLORS.textDim)).setOrigin(0.5, 0));
    const stars = totalStars(save);
    const starIcon = this.add.image(0, infoY + dp(40), STAR_KEY).setDisplaySize(dp(22), dp(22)).setTint(COLORS.star);
    const starText = this.add.text(0, infoY + dp(40), t('totalStars', { n: stars }), textStyle(16, COLORS.textDim, false)).setOrigin(0, 0.5);
    const rowW = dp(28) + starText.width;
    starIcon.setX(cx - rowW / 2 + dp(11));
    starText.setX(cx - rowW / 2 + dp(28));
    this.items.push(starIcon, starText);

    const btnW = Math.min(width - dp(64), dp(300));
    const play = new Button(this, cx, Math.min(height - dp(170), infoY + dp(130)), {
      label: `${t('play')}  ·  ${t('level', { n: save.currentLevel })}`,
      width: btnW,
      height: dp(68),
      color: 0x3cb44b,
      onClick: () => {
        audio.play(this, 'click');
        this.scene.start('game');
      },
    });
    const settings = new Button(this, cx, play.y + dp(84), {
      label: t('settings'),
      icon: iconKey('gear'),
      width: btnW,
      height: dp(56),
      onClick: () => {
        audio.play(this, 'click');
        this.scene.launch('settings', { from: 'menu' });
        this.scene.pause();
      },
    });
    this.items.push(play, settings);
    this.tweens.add({ targets: play, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
