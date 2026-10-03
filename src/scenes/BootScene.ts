import Phaser from 'phaser';
import { TUBE_CAPACITY } from '../core';
import { SFX_FILES, sfxKey, type Sfx } from '../services/audio';
import { generateTextures } from '../ui/textures';

/** Ícones do Kenney (Game Icons, PNG/White/2x). Opcionais: o jogo corre sem eles. */
export const ICONS = ['return', 'rewind', 'plus', 'fastForward', 'gear', 'home', 'star', 'video', 'next'] as const;
export const iconKey = (name: (typeof ICONS)[number]): string => `icon-${name}`;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    // Falhas de carregamento são ignoradas: os placeholders gerados em código substituem.
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`[assets] em falta: ${file.src} (a usar placeholder)`);
    });
    for (const name of ICONS) this.load.image(iconKey(name), `assets/kenney/icons/${name}.png`);
    for (const [sfx, path] of Object.entries(SFX_FILES) as [Sfx, string][]) this.load.audio(sfxKey(sfx), path);
  }

  create(): void {
    generateTextures(this, TUBE_CAPACITY);
    this.scene.start('game');
  }
}
