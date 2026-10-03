import Phaser from 'phaser';
import { COLORS } from '../config/display';
import { BG_KEY, drawBackground } from './textures';

/** Fundo em gradiente que acompanha o tamanho do ecrã. */
export function addBackground(scene: Phaser.Scene): Phaser.GameObjects.Image {
  const bg = scene.add.image(0, 0, BG_KEY).setOrigin(0).setDepth(-10);
  const fit = (): void => {
    const { width, height } = scene.scale;
    if (!scene.textures.exists(BG_KEY)) drawBackground(scene, width, height, COLORS.bgTop, COLORS.bgBottom);
    bg.setTexture(BG_KEY).setDisplaySize(width, height);
  };
  fit();
  scene.scale.on(Phaser.Scale.Events.RESIZE, fit);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, fit));
  return bg;
}
