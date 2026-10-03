import { audio } from '../services/audio';
import { applyLocale } from '../services/i18n';
import { LevelService } from '../services/levels';
import { SaveStore, type SaveData } from '../services/save';
import { createStorage } from '../services/storage';

/** Serviços partilhados por todas as cenas. */
export const store = new SaveStore(createStorage());
export const levels = new LevelService();

function applySettings(d: SaveData): void {
  applyLocale(d.settings.locale);
  audio.enabled = d.settings.sound;
  audio.vibration = d.settings.vibration;
}

export async function initApp(): Promise<void> {
  applySettings(await store.load());
  store.onChange(applySettings);
  // Garante a gravação ao sair/minimizar.
  const flush = (): void => void store.flush();
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
