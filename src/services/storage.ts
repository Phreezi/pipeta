/**
 * Armazenamento chave/valor assíncrono. Implementações:
 * - LocalStorageAdapter (web)
 * - PreferencesStorage (Android, Capacitor Preferences — ligado na Fase 5)
 * - MemoryStorage (testes, ou quando o localStorage está bloqueado)
 */
export interface KeyValueStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export class MemoryStorage implements KeyValueStorage {
  private readonly data = new Map<string, string>();

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.data.get(key) ?? null);
  }
  set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
    return Promise.resolve();
  }
  remove(key: string): Promise<void> {
    this.data.delete(key);
    return Promise.resolve();
  }
}

export class LocalStorageAdapter implements KeyValueStorage {
  constructor(private readonly ls: Storage) {}

  get(key: string): Promise<string | null> {
    try {
      return Promise.resolve(this.ls.getItem(key));
    } catch {
      return Promise.resolve(null);
    }
  }
  set(key: string, value: string): Promise<void> {
    try {
      this.ls.setItem(key, value);
    } catch {
      // Quota cheia ou armazenamento bloqueado: o jogo continua sem gravar.
    }
    return Promise.resolve();
  }
  remove(key: string): Promise<void> {
    try {
      this.ls.removeItem(key);
    } catch {
      // Ignorar.
    }
    return Promise.resolve();
  }
}

/** API mínima do plugin @capacitor/preferences (evita depender dele na web). */
export interface PreferencesApi {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
}

export class PreferencesStorage implements KeyValueStorage {
  constructor(private readonly prefs: PreferencesApi) {}

  async get(key: string): Promise<string | null> {
    return (await this.prefs.get({ key })).value;
  }
  set(key: string, value: string): Promise<void> {
    return this.prefs.set({ key, value });
  }
  remove(key: string): Promise<void> {
    return this.prefs.remove({ key });
  }
}

/** Escolhe a implementação para a plataforma atual. */
export function createStorage(): KeyValueStorage {
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__pipeta_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return new LocalStorageAdapter(localStorage);
    }
  } catch {
    // localStorage indisponível.
  }
  return new MemoryStorage();
}
