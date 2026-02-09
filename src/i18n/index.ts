import { ru } from './ru';
import { en } from './en';

export type Lang = 'ru' | 'en';

const translations: Record<Lang, Record<string, string>> = { ru, en };

let currentLang: Lang = 'ru';

export function setLang(lang: Lang): void {
  currentLang = lang;
}

export function t(key: string, params?: Record<string, string>): string {
  let value = translations[currentLang][key] ?? translations['ru'][key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.split(`{${k}}`).join(v);
    }
  }
  return value;
}
