import { getLanguage } from '../../src/app/i18n.js';

/**
 * Capital letters for a heading. The phone's own uppercasing follows the phone's language, so
 * a Turkish text on an English phone turned "dil" into "DIL" instead of "DİL". Turkish has two
 * letters i (with and without a dot) and each keeps its dot in capitals.
 */
export function caps(text, language = getLanguage()) {
  const value = String(text);
  return language === 'tr'
    ? value.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase()
    : value.toUpperCase();
}
