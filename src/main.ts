import Phaser from 'phaser';
import { DPR } from './config/display';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { initI18n } from './services/i18n';

const params = new URLSearchParams(window.location.search);
/** `#debug` ou `#60` também funcionam (o visualizador do claude.ai só passa o hash). */
const hash = window.location.hash.replace(/^#/, '');

function startGame(): void {
  initI18n();
  const host = document.getElementById('app');
  // Tamanho do contentor (respeita as margens seguras do ecrã).
  const size = (): { w: number; h: number } => {
    const r = host?.getBoundingClientRect();
    return {
      w: Math.round((r?.width || window.innerWidth) * DPR),
      h: Math.round((r?.height || window.innerHeight) * DPR),
    };
  };
  const { w, h } = size();
  // Canvas em resolução real do ecrã (até 2x) e "zoom" CSS inverso: texto e bolas nítidos.
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    backgroundColor: '#2b3266',
    scale: { mode: Phaser.Scale.NONE, width: w, height: h, zoom: 1 / DPR },
    render: { antialias: true, powerPreference: 'high-performance' },
    fps: { target: 60 },
    input: { activePointers: 2 },
    scene: [BootScene, GameScene],
  });
  if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
  const onResize = (): void => {
    const s = size();
    game.scale.resize(s.w, s.h);
    game.scale.setZoom(1 / DPR);
  };
  window.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
}

if (params.has('debug') || hash === 'debug') {
  // Página de teste da lógica (Fase 1): ?debug
  void import('./debug/levelViewer').then(({ mountLevelViewer }) => {
    const root = document.getElementById('app');
    if (root !== null) mountLevelViewer(root);
  });
} else {
  startGame();
}
