import { setLanguage } from '../../src/app/i18n.js';

const SETTINGS_KEY = 'suloop:settings:v1';

/**
 * The language of the phone, as a game language: Turkish on a Turkish phone, English
 * everywhere else. `locale` is what the phone says, like "tr-TR" or "en_US".
 * @param {string | null | undefined} locale
 */
export function gameLanguageOf(locale) {
  return String(locale ?? '')
    .toLowerCase()
    .startsWith('tr')
    ? 'tr'
    : 'en';
}

/**
 * The language to start in: the one the player picked in the settings, otherwise the phone's.
 * @param {{ getItem: (key: string) => string | null }} storage
 * @param {string} locale what the phone says (see deviceLocale.js)
 */
export function startingLanguage(storage, locale) {
  try {
    const saved = JSON.parse(storage.getItem(SETTINGS_KEY) ?? 'null')?.language;
    if (saved === 'tr' || saved === 'en') return saved;
  } catch {
    // Settings that cannot be read are as good as none.
  }
  return gameLanguageOf(locale);
}

/** Sets the game's language; call it before the first text is drawn. */
export function chooseLanguage(storage, locale) {
  const language = startingLanguage(storage, locale);
  setLanguage(language);
  return language;
}
