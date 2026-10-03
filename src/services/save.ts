import type { Locale } from '../i18n/strings';
import { LOCALES } from '../i18n/strings';
import type { SessionSnapshot } from '../core/session';
import type { Stars } from '../core/stars';
import type { KeyValueStorage } from './storage';

export const SAVE_KEY = 'pipeta.save';
export const SAVE_VERSION = 1;

export interface Settings {
  sound: boolean;
  music: boolean;
  vibration: boolean;
  /** `null` = seguir o idioma do dispositivo. */
  locale: Locale | null;
  colorBlind: boolean;
}

export interface SaveData {
  version: number;
  currentLevel: number;
  /** Melhor número de estrelas por nível. */
  stars: Record<string, Stars>;
  settings: Settings;
  /** Nível em curso, para retomar ao reabrir a app. */
  inProgress: SessionSnapshot | null;
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    currentLevel: 1,
    stars: {},
    settings: { sound: true, music: true, vibration: true, locale: null, colorBlind: false },
    inProgress: null,
  };
}

// ------------------------------------------------------------ validação

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min = 0): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min;
const isColorArray = (v: unknown): v is number[] => Array.isArray(v) && v.every((c) => isInt(c) && c < 64);
const isBoard = (v: unknown): v is number[][] => Array.isArray(v) && v.every(isColorArray);

function readSnapshot(v: unknown): SessionSnapshot | null {
  if (!isObj(v)) return null;
  const { level, initialBoard, board, history, moveCount, undosLeft, extraTubeUsed, restarts } = v;
  if (!isInt(level, 1) || !isBoard(initialBoard) || !isBoard(board) || !Array.isArray(history)) return null;
  if (!isInt(moveCount) || !isInt(undosLeft) || typeof extraTubeUsed !== 'boolean' || !isInt(restarts)) return null;
  if (board.length !== initialBoard.length) return null;
  const moves = history.filter((m): m is { from: number; to: number } => isObj(m) && isInt(m['from']) && isInt(m['to']));
  if (moves.length !== history.length) return null;
  return { level, initialBoard, board, history: moves, moveCount, undosLeft, extraTubeUsed, restarts };
}

function readSettings(v: unknown): Settings {
  const d = defaultSave().settings;
  if (!isObj(v)) return d;
  const bool = (x: unknown, def: boolean): boolean => (typeof x === 'boolean' ? x : def);
  const locale = LOCALES.find((l) => l === v['locale']) ?? null;
  return {
    sound: bool(v['sound'], d.sound),
    music: bool(v['music'], d.music),
    vibration: bool(v['vibration'], d.vibration),
    locale,
    colorBlind: bool(v['colorBlind'], d.colorBlind),
  };
}

/**
 * Lê dados guardados de qualquer versão conhecida e devolve-os na versão
 * atual. Dados inválidos ou de uma versão futura dão os valores por omissão
 * (campo a campo, sem perder o resto).
 */
export function migrate(raw: unknown): SaveData {
  const base = defaultSave();
  if (!isObj(raw)) return base;
  const version = isInt(raw['version']) ? raw['version'] : 0;
  if (version > SAVE_VERSION) return base;
  // Versão 0 (sem número de versão): mesmo formato que a 1.
  const stars: Record<string, Stars> = {};
  if (isObj(raw['stars'])) {
    for (const [k, s] of Object.entries(raw['stars'])) {
      if (/^\d+$/.test(k) && (s === 1 || s === 2 || s === 3)) stars[k] = s;
    }
  }
  return {
    version: SAVE_VERSION,
    currentLevel: isInt(raw['currentLevel'], 1) ? raw['currentLevel'] : base.currentLevel,
    stars,
    settings: readSettings(raw['settings']),
    inProgress: readSnapshot(raw['inProgress']),
  };
}

export function parseSave(json: string | null): SaveData {
  if (json === null) return defaultSave();
  try {
    return migrate(JSON.parse(json));
  } catch {
    return defaultSave();
  }
}

export function totalStars(save: SaveData): number {
  return Object.values(save.stars).reduce<number>((a, b) => a + b, 0);
}

/** Guarda o resultado de um nível concluído e avança o nível atual. */
export function recordWin(save: SaveData, level: number, stars: Stars): SaveData {
  const prev = save.stars[String(level)] ?? 0;
  return {
    ...save,
    stars: { ...save.stars, [String(level)]: stars > prev ? stars : (prev as Stars) },
    currentLevel: Math.max(save.currentLevel, level + 1),
    inProgress: null,
  };
}

/**
 * Estado do jogo carregado em memória, gravado no armazenamento com um
 * pequeno atraso (várias alterações seguidas => uma só escrita).
 */
export class SaveStore {
  private data: SaveData = defaultSave();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<(d: SaveData) => void>();

  constructor(private readonly storage: KeyValueStorage, private readonly delayMs = 300) {}

  async load(): Promise<SaveData> {
    this.data = parseSave(await this.storage.get(SAVE_KEY));
    return this.data;
  }

  get value(): SaveData {
    return this.data;
  }

  update(fn: (d: SaveData) => SaveData): void {
    this.data = fn(this.data);
    this.listeners.forEach((l) => l(this.data));
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.delayMs);
  }

  updateSettings(patch: Partial<Settings>): void {
    this.update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }

  onChange(listener: (d: SaveData) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async flush(): Promise<void> {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    await this.storage.set(SAVE_KEY, JSON.stringify(this.data));
  }
}
