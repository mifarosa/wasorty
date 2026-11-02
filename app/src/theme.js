import { COCKTAIL_COLORS, LIQUID_COLORS, NEON_COLORS } from '../../src/scene/palette.js';

/**
 * The colors of each theme, as the website's stylesheet has them (src/styles.css). The classic
 * theme follows the phone between dark and light; the others are dark.
 * @typedef {{ bgTop: string, bgBottom: string, ink: string, muted: string, panel: string,
 *   line: string, accent: string, accentInk: string, star: string, starOff: string,
 *   glass: string, glow: string | null, bar: 'light' | 'dark' }} Colors
 */

/** @type {Colors} */
const CLASSIC_DARK = {
  bgTop: '#1b2142',
  bgBottom: '#0b0e1d',
  ink: '#eef2ff',
  muted: '#9aa5c9',
  panel: '#141932',
  line: 'rgba(223,230,255,0.14)',
  accent: '#7dd3fc',
  accentInk: '#0b1430',
  star: '#fbbf24',
  starOff: 'rgba(223,230,255,0.2)',
  glass: '#ffffff',
  glow: null,
  bar: 'light'
};

/** @type {Colors} */
const CLASSIC_LIGHT = {
  bgTop: '#f3f6fc',
  bgBottom: '#d6deef',
  ink: '#141a33',
  muted: '#55607f',
  panel: '#f6f8fd',
  line: 'rgba(20,26,51,0.12)',
  accent: '#0369a1',
  accentInk: '#ffffff',
  star: '#f59e0b',
  starOff: 'rgba(20,26,51,0.15)',
  glass: '#5a6a99',
  glow: null,
  bar: 'dark'
};

/** @type {Record<string, { colors: Colors | { dark: Colors, light: Colors }, palette: string[] }>} */
const THEMES = {
  classic: { colors: { dark: CLASSIC_DARK, light: CLASSIC_LIGHT }, palette: LIQUID_COLORS },
  neon: {
    colors: {
      ...CLASSIC_DARK,
      bgTop: '#1a0638',
      bgBottom: '#06010f',
      ink: '#f6f3ff',
      muted: '#a99fd6',
      panel: '#150a2e',
      line: 'rgba(200,182,255,0.18)',
      accent: '#19f0e0',
      accentInk: '#06010f',
      star: '#ffe94d',
      starOff: 'rgba(200,182,255,0.2)',
      glass: '#b8fbff',
      glow: 'rgba(25, 240, 224, 0.55)'
    },
    palette: NEON_COLORS
  },
  cocktail: {
    colors: {
      ...CLASSIC_DARK,
      bgTop: '#3d2116',
      bgBottom: '#150b07',
      ink: '#fff4e6',
      muted: '#cfae8e',
      panel: '#26150d',
      line: 'rgba(255,220,176,0.18)',
      accent: '#f4a259',
      accentInk: '#1d0f08',
      star: '#ffc94d',
      starOff: 'rgba(255,220,176,0.2)',
      glass: '#ffe3b3'
    },
    palette: COCKTAIL_COLORS
  }
};

export const THEME_IDS = Object.keys(THEMES);

/** The colors of the screens for a theme. @param {'light' | 'dark' | null | undefined} scheme */
export function colorsOf(themeId, scheme) {
  const { colors } = THEMES[themeId] ?? THEMES.classic;
  return 'dark' in colors ? (scheme === 'light' ? colors.light : colors.dark) : colors;
}

/** How the board is drawn in a theme (see TubeScene.setLook). */
export function lookOf(themeId, scheme, symbols = false) {
  const colors = colorsOf(themeId, scheme);
  return {
    glassColor: colors.glass,
    glassGlow: colors.glow,
    palette: (THEMES[themeId] ?? THEMES.classic).palette,
    symbols
  };
}

/** The colors of the chapters, from green to red as the levels get harder. */
export const CHAPTER_COLORS = {
  easy: '#22c55e',
  oneWay: '#84cc16',
  tall: '#eab308',
  hidden: '#f59e0b',
  cracked: '#f97316',
  locked: '#ef4444',
  half: '#fb7185',
  oil: '#f472b6',
  master: '#a855f7'
};
