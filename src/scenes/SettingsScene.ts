import Phaser from 'phaser';
import { store } from '../app/context';
import { PRIVACY_POLICY_URL } from '../config/app';
import { COLORS, dp } from '../config/display';
import { LOCALES, STRINGS, type Locale } from '../i18n/strings';
import { audio } from '../services/audio';
import { t } from '../services/i18n';
import type { Settings } from '../services/save';
import { Button } from '../ui/Button';
import { textStyle } from '../ui/text';
import { BUTTON_KEY } from '../ui/textures';

export interface SettingsData {
  readonly from: string;
}

type BoolSetting = 'sound' | 'music' | 'vibration' | 'colorBlind';

/** Definições (sobreposto à cena que o abriu, que fica em pausa). */
export class SettingsScene extends Phaser.Scene {
  private from = 'menu';
  private items: Phaser.GameObjects.GameObject[] = [];
  private toast: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('settings');
  }

  init(data: SettingsData): void {
    this.from = data.from;
  }

  create(): void {
    this.build();
    const onResize = (): void => this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));
  }

  private build(): void {
    this.items.forEach((o) => o.destroy());
    this.items = [];
    const { width, height } = this.scale;
    const s = store.value.settings;
    const cx = width / 2;
    const pw = Math.min(width - dp(24), dp(380));
    const rowH = dp(58);
    const rows = 7;
    const ph = dp(70) + rows * rowH + dp(84);
    const top = Math.max(dp(8), (height - ph) / 2);

    const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0).setInteractive();
    const panel = this.add.nineslice(cx, top + ph / 2, BUTTON_KEY, undefined, pw, ph, 20, 20, 20, 20).setTint(COLORS.panel);
    const title = this.add.text(cx, top + dp(20), t('settings'), textStyle(24)).setOrigin(0.5, 0);
    this.items.push(dim, panel, title);

    const left = cx - pw / 2 + dp(20);
    const ctrlW = dp(132);
    const ctrlX = cx + pw / 2 - dp(20) - ctrlW / 2;
    let y = top + dp(70) + rowH / 2;

    const row = (label: string): void => {
      this.items.push(this.add.text(left, y, label, textStyle(17, COLORS.text, false)).setOrigin(0, 0.5));
    };
    const toggle = (key: BoolSetting, label: string): void => {
      row(label);
      const on = s[key];
      const b = new Button(this, ctrlX, y, {
        label: on ? t('on') : t('off'),
        width: ctrlW,
        height: dp(48),
        color: on ? 0x3cb44b : COLORS.buttonDisabled,
        onClick: () => this.set({ [key]: !store.value.settings[key] }),
      });
      this.items.push(b);
      y += rowH;
    };

    toggle('sound', t('sound'));
    toggle('music', t('music'));
    toggle('vibration', t('vibration'));

    row(t('language'));
    const lang = new Button(this, ctrlX, y, {
      label: s.locale === null ? `${t('languageAuto')}` : STRINGS[s.locale].languageName,
      width: ctrlW,
      height: dp(48),
      onClick: () => this.set({ locale: nextLocale(store.value.settings.locale) }),
    });
    this.items.push(lang);
    y += rowH;

    toggle('colorBlind', t('colorBlind'));

    const wide = pw - dp(40);
    const privacy = new Button(this, cx, y, {
      label: t('privacy'),
      width: wide,
      height: dp(48),
      onClick: () => {
        audio.play(this, 'click');
        window.open(PRIVACY_POLICY_URL, '_blank', 'noopener');
      },
    });
    y += rowH;
    const consent = new Button(this, cx, y, {
      label: t('manageConsent'),
      width: wide,
      height: dp(48),
      // Fase 5: abre o formulário da Google UMP na app Android.
      onClick: () => this.showToast(t('consentAppOnly')),
    });
    y += rowH;
    const close = new Button(this, cx, top + ph - dp(46), {
      label: t('close'),
      width: wide,
      height: dp(52),
      color: 0x3cb44b,
      onClick: () => this.close(),
    });
    this.items.push(privacy, consent, close);
    this.toast = this.add.text(cx, top + ph + dp(18), '', textStyle(15)).setOrigin(0.5).setAlpha(0);
    this.items.push(this.toast);
  }

  private set(patch: Partial<Settings>): void {
    store.updateSettings(patch);
    audio.play(this, 'click');
    if (patch.vibration === true) audio.vibrate(30);
    this.build();
  }

  private showToast(text: string): void {
    if (this.toast === null) return;
    this.toast.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 1500, duration: 300 });
  }

  private close(): void {
    audio.play(this, 'click');
    void store.flush();
    this.scene.stop();
    this.scene.resume(this.from);
  }
}

/** Automático → Português → English → Automático. */
export function nextLocale(current: Locale | null): Locale | null {
  if (current === null) return LOCALES[0] ?? null;
  const i = LOCALES.indexOf(current);
  return i + 1 < LOCALES.length ? (LOCALES[i + 1] ?? null) : null;
}
