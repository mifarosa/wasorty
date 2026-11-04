import { getLanguage } from '../../src/app/i18n.js';

/** The words only the app has (the game's own are in src/app/texts), in both languages. */
const WORDS = {
  en: {
    undo: 'Undo',
    hint: 'Hint',
    restart: 'Restart',
    info: 'Info',
    settings: 'Settings',
    levels: 'Levels',
    close: 'Close',
    tagline: 'Water sort puzzle',
    aboutTitle: 'About',
    aboutText: 'Wasorty is made by mifarosa.',
    visitSite: 'Visit mifarosa.com',
    theme: 'Theme',
    themeNames: { classic: 'Classic Lab', neon: 'Neon Night', cocktail: 'Cocktail Bar' },
    language: 'Language',
    languageNames: { tr: 'Türkçe', en: 'English' },
    haptics: 'Vibration',
    symbols: 'Add symbols to colors',
    symbolsNote: 'If colors are hard to tell apart, a shape is drawn on each one.',
    shared: 'Result copied',
    stagesOf: (solved, total) => `${solved}/${total}`
  },
  tr: {
    undo: 'Geri al',
    hint: 'İpucu',
    restart: 'Yeniden',
    info: 'Bilgi',
    settings: 'Ayarlar',
    levels: 'Seviyeler',
    close: 'Kapat',
    tagline: 'Su sıralama bulmaca oyunu',
    aboutTitle: 'Hakkında',
    aboutText: 'Wasorty, mifarosa tarafından yapıldı.',
    visitSite: 'mifarosa.com’u ziyaret et',
    theme: 'Tema',
    themeNames: { classic: 'Klasik Laboratuvar', neon: 'Neon Gece', cocktail: 'Kokteyl Bar' },
    language: 'Dil',
    languageNames: { tr: 'Türkçe', en: 'English' },
    haptics: 'Titreşim',
    symbols: 'Renklere sembol ekle',
    symbolsNote: 'Renkleri ayırt etmek zorsa her rengin üstüne bir şekil çizer.',
    shared: 'Sonuç kopyalandı',
    stagesOf: (solved, total) => `${solved}/${total}`
  }
};

/** The app's words in the language of the game; read when a screen is drawn. */
export const words = new Proxy(
  {},
  { get: (_, key) => (WORDS[getLanguage()] ?? WORDS.en)[key] ?? WORDS.en[key] }
);
