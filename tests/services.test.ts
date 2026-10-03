import { describe, expect, it } from 'vitest';
import { GameSession, generateLevel } from '../src/core';
import { STRINGS } from '../src/i18n/strings';
import { detectLocale } from '../src/services/i18n';
import { defaultSave, migrate, parseSave, recordWin, SAVE_KEY, SAVE_VERSION, SaveStore, totalStars } from '../src/services/save';
import { MemoryStorage } from '../src/services/storage';

describe('i18n', () => {
  it('pt-PT e en têm exatamente as mesmas chaves e nenhum texto vazio', () => {
    const pt = Object.keys(STRINGS['pt-PT']).sort();
    const en = Object.keys(STRINGS.en).sort();
    expect(pt).toEqual(en);
    for (const table of Object.values(STRINGS)) for (const v of Object.values(table)) expect(v.trim()).not.toBe('');
  });

  it('deteta o idioma do dispositivo', () => {
    expect(detectLocale(['pt-PT'])).toBe('pt-PT');
    expect(detectLocale(['pt-BR'])).toBe('pt-PT');
    expect(detectLocale(['en-US'])).toBe('en');
    expect(detectLocale(['fr-FR', 'pt'])).toBe('pt-PT');
    expect(detectLocale(['de'])).toBe('en');
    expect(detectLocale([])).toBe('en');
  });
});

describe('save', () => {
  it('dados em falta ou corrompidos dão os valores por omissão', () => {
    expect(parseSave(null)).toEqual(defaultSave());
    expect(parseSave('{lixo')).toEqual(defaultSave());
    expect(migrate(42)).toEqual(defaultSave());
  });

  it('inclui a versão e migra dados sem versão (v0)', () => {
    const d = migrate({ currentLevel: 7, stars: { '1': 3, '2': 2, x: 3, '3': 9 } });
    expect(d.version).toBe(SAVE_VERSION);
    expect(d.currentLevel).toBe(7);
    expect(d.stars).toEqual({ '1': 3, '2': 2 });
  });

  it('versões futuras não são interpretadas', () => {
    expect(migrate({ version: SAVE_VERSION + 1, currentLevel: 50 }).currentLevel).toBe(1);
  });

  it('valida as definições campo a campo', () => {
    const d = migrate({ version: 1, settings: { sound: false, locale: 'xx', colorBlind: 'sim' } });
    expect(d.settings).toEqual({ ...defaultSave().settings, sound: false });
  });

  it('descarta um nível em curso inválido', () => {
    expect(migrate({ version: 1, inProgress: { level: 1 } }).inProgress).toBeNull();
  });

  it('recordWin guarda a melhor pontuação e avança o nível', () => {
    let d = recordWin(defaultSave(), 1, 2);
    expect(d.currentLevel).toBe(2);
    d = recordWin(d, 1, 1);
    expect(d.stars['1']).toBe(2);
    d = recordWin(d, 1, 3);
    expect(d.stars['1']).toBe(3);
    expect(d.currentLevel).toBe(2);
    expect(totalStars(recordWin(d, 2, 2))).toBe(5);
  });

  it('fechar e reabrir retoma exatamente o mesmo nível em curso', async () => {
    const storage = new MemoryStorage();
    const lv = generateLevel(12);
    const s = new GameSession(lv.level, lv.board);
    for (const m of lv.solution.slice(0, 3)) {
      s.tap(m.from);
      s.tap(m.to);
    }
    s.undo();
    s.addExtraTube();
    const store = new SaveStore(storage, 0);
    await store.load();
    store.update((d) => ({ ...d, currentLevel: 12, inProgress: s.toSnapshot() }));
    await store.flush();

    const reopened = new SaveStore(storage, 0);
    const data = await reopened.load();
    expect(data.currentLevel).toBe(12);
    expect(data.inProgress).not.toBeNull();
    const restored = GameSession.fromSnapshot(data.inProgress ?? s.toSnapshot());
    expect(restored.toSnapshot()).toEqual(s.toSnapshot());
    expect(JSON.parse((await storage.get(SAVE_KEY)) ?? '{}').version).toBe(SAVE_VERSION);
  });
});
