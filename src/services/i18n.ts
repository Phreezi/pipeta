import { LOCALES, STRINGS, type Locale, type StringKey } from '../i18n/strings';

/** Escolhe o idioma a partir do dispositivo: português => pt-PT, resto => en. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const lang of languages) {
    const l = lang.toLowerCase();
    if (l.startsWith('pt')) return 'pt-PT';
    if (l.startsWith('en')) return 'en';
  }
  return 'en';
}

class I18n {
  private current: Locale = 'en';

  get locale(): Locale {
    return this.current;
  }

  setLocale(locale: Locale): void {
    if (LOCALES.includes(locale)) this.current = locale;
  }

  t(key: StringKey, params: Readonly<Record<string, string | number>> = {}): string {
    const text: string = STRINGS[this.current][key];
    return text.replace(/\{(\w+)\}/g, (m, name: string) => {
      const v = params[name];
      return v === undefined ? m : String(v);
    });
  }
}

export const i18n = new I18n();

export function initI18n(): void {
  const langs = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : [];
  i18n.setLocale(detectLocale(langs));
}

export const t = (key: StringKey, params?: Readonly<Record<string, string | number>>): string => i18n.t(key, params);
