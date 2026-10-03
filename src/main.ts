// Fase 1: página de teste da lógica (sem Phaser). Será substituída pela
// cena de jogo na Fase 2.
import { mountLevelViewer } from './debug/levelViewer';

const root = document.getElementById('app');
if (root !== null) mountLevelViewer(root);
