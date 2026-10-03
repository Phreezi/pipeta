import type Phaser from 'phaser';

export type Sfx = 'lift' | 'drop' | 'error' | 'complete' | 'win' | 'click' | 'extra';

/** Ficheiros do Kenney para cada som (carregados no arranque; opcionais). */
export const SFX_FILES: Readonly<Record<Sfx, string>> = {
  lift: 'assets/kenney/sfx/select_001.ogg',
  drop: 'assets/kenney/sfx/drop_002.ogg',
  error: 'assets/kenney/sfx/error_004.ogg',
  complete: 'assets/kenney/sfx/confirmation_002.ogg',
  win: 'assets/kenney/jingles/jingles_PIZZI00.ogg',
  click: 'assets/kenney/sfx/click_002.ogg',
  extra: 'assets/kenney/sfx/maximize_006.ogg',
};

export const sfxKey = (s: Sfx): string => `sfx-${s}`;

/** Sons de substituição sintetizados (quando o ficheiro não existe ou não descodifica). */
const SYNTH: Readonly<Record<Sfx, readonly [number, number, OscillatorType][]>> = {
  lift: [[660, 0.06, 'sine']],
  drop: [[440, 0.07, 'triangle']],
  error: [[180, 0.08, 'square'], [140, 0.12, 'square']],
  complete: [[660, 0.08, 'sine'], [880, 0.12, 'sine']],
  win: [[523, 0.1, 'triangle'], [659, 0.1, 'triangle'], [784, 0.1, 'triangle'], [1047, 0.25, 'triangle']],
  click: [[900, 0.03, 'sine']],
  extra: [[500, 0.06, 'sine'], [750, 0.1, 'sine']],
};

class AudioService {
  enabled = true;
  vibration = true;
  private ctx: AudioContext | null = null;

  play(scene: Phaser.Scene, sfx: Sfx): void {
    if (!this.enabled) return;
    const key = sfxKey(sfx);
    if (scene.cache.audio.exists(key)) {
      try {
        scene.sound.play(key, { volume: sfx === 'win' ? 0.7 : 0.9 });
        return;
      } catch {
        // Cai para o som sintetizado.
      }
    }
    this.synth(sfx);
  }

  vibrate(ms: number): void {
    if (!this.vibration) return;
    try {
      navigator.vibrate?.(ms);
    } catch {
      // Sem suporte.
    }
  }

  private synth(sfx: Sfx): void {
    try {
      this.ctx ??= new AudioContext();
      const ctx = this.ctx;
      if (ctx.state === 'suspended') void ctx.resume();
      let t = ctx.currentTime;
      for (const [freq, dur, type] of SYNTH[sfx]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
        t += dur * 0.85;
      }
    } catch {
      // Sem Web Audio: silêncio.
    }
  }
}

export const audio = new AudioService();
