import { describe, expect, it } from 'vitest';
import { GameController } from '../src/app/controller.js';
import { DailyBoard } from '../src/app/dailyBoard.js';
import { loadDailyRecord, saveDailyRecord } from '../src/app/dailyResults.js';
import { getLanguage, setLanguage } from '../src/app/i18n.js';
import { loadProgress, saveProgress } from '../src/app/progress.js';
import { texts } from '../src/app/texts.js';
import { fewestMovesOfPuzzle } from '../src/game/puzzleFewest.js';
import { words } from '../app/src/appTexts.js';
import { chooseLanguage, gameLanguageOf, startingLanguage } from '../app/src/language.js';
import { NativeHud } from '../app/src/NativeHud.js';
import { NativeMenu, NativeRules } from '../app/src/NativeDialogs.js';
import { THEME_IDS, colorsOf, lookOf } from '../app/src/theme.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key)
  };
}

describe('the language of the app', () => {
  it('is Turkish on a Turkish phone and English anywhere else', () => {
    expect(gameLanguageOf('tr-TR')).toBe('tr');
    expect(gameLanguageOf('tr')).toBe('tr');
    expect(gameLanguageOf('en_US')).toBe('en');
    expect(gameLanguageOf('de-DE')).toBe('en');
    expect(gameLanguageOf(undefined)).toBe('en');
  });

  it('keeps the player’s own pick over the phone’s', () => {
    const picked = memoryStorage({ 'suloop:settings:v1': JSON.stringify({ language: 'en' }) });
    expect(startingLanguage(picked, 'tr-TR')).toBe('en');
    expect(startingLanguage(memoryStorage(), 'tr-TR')).toBe('tr');
    expect(startingLanguage(memoryStorage({ 'suloop:settings:v1': '{oops' }), 'tr')).toBe('tr');
  });

  it('is set for the game’s texts', () => {
    const before = getLanguage();
    expect(chooseLanguage(memoryStorage(), 'tr-TR')).toBe('tr');
    expect(getLanguage()).toBe('tr');
    expect(words.settings).toBe('Ayarlar');
    setLanguage('en');
    expect(words.settings).toBe('Settings');
    setLanguage(before);
  });

  it('has every word of the app in both languages', () => {
    const before = getLanguage();
    const keys = new Set();
    for (const language of ['en', 'tr']) {
      setLanguage(language);
      for (const key of [
        'undo',
        'hint',
        'restart',
        'info',
        'settings',
        'levels',
        'close',
        'theme',
        'language',
        'languageNote',
        'haptics',
        'symbols',
        'symbolsNote'
      ]) {
        expect(words[key], `${language}.${key}`).toBeTruthy();
        keys.add(words[key]);
      }
      for (const id of THEME_IDS) expect(words.themeNames[id]).toBeTruthy();
      for (const key of [
        'rulesHeading',
        'starsHeading',
        'suppliesHeading',
        'noAttempts',
        'attemptsTitle',
        'yourMoves',
        'replay',
        'watchSolution',
        'shareResult'
      ]) {
        expect(texts[key], `${language}.${key}`).toBeTruthy();
      }
    }
    setLanguage(before);
  });
});

describe('the themes of the app', () => {
  it('give every theme colors and a look for the board', () => {
    for (const id of THEME_IDS) {
      const colors = colorsOf(id, 'dark');
      expect(colors.bgBottom).toMatch(/^#/);
      const look = lookOf(id, 'dark', true);
      expect(look.glassColor).toBe(colors.glass);
      expect(look.palette.length).toBeGreaterThan(5);
      expect(look.symbols).toBe(true);
    }
  });

  it('lets only the classic theme follow the phone between dark and light', () => {
    expect(colorsOf('classic', 'light').bgBottom).not.toBe(colorsOf('classic', 'dark').bgBottom);
    expect(colorsOf('neon', 'light')).toBe(colorsOf('neon', 'dark'));
    expect(colorsOf('nonsense', null)).toBe(colorsOf('classic', 'dark'));
  });
});

describe('the game on the app’s screens', () => {
  function start() {
    const storage = memoryStorage();
    const hud = new NativeHud();
    const menu = new NativeMenu();
    const rules = new NativeRules();
    const dailyBoard = new DailyBoard({
      record: loadDailyRecord(storage),
      save: (record) => saveDailyRecord(record, storage),
      service: null
    });
    const quiet = { show() {}, hide() {}, isShowingInfo: false };
    const game = new GameController({
      scene: new Proxy(
        { celebrate: () => Promise.resolve() },
        {
          get: (target, key) => target[key] ?? (() => {})
        }
      ),
      hud,
      menu,
      rules,
      feedback: { pick() {}, putDown() {}, reject() {}, undo() {}, hint() {}, win() {} },
      findFewestMoves: (puzzle) => Promise.resolve(fewestMovesOfPuzzle(puzzle)),
      onDailySolved: (day, result) => dailyBoard.record(day, result),
      getDailySummary: (today) => dailyBoard.summary(today),
      leaderboardOnline: false,
      progress: loadProgress(storage),
      saveProgress: (progress) => saveProgress(progress, storage)
    });
    game.start();
    return { game, hud, menu, rules, quiet };
  }

  it('opens the level list with the daily puzzle and the chapters', () => {
    const { game, menu } = start();
    expect(menu.model).toBeNull();
    game.showLevels();
    expect(menu.model.daily.title).toBeTruthy();
    expect(menu.model.chapters.length).toBeGreaterThan(5);
    const first = menu.model.chapters[0].levels[0];
    expect(first).toMatchObject({ level: 1, playing: true });
    game.closeLevels();
    expect(menu.model).toBeNull();
  });

  it('plays a level picked from the list, and the daily puzzle', () => {
    const { game, hud, menu } = start();
    game.showLevels();
    game.playLevel(1);
    expect(menu.model).toBeNull();
    expect(hud.state.view.title).toBe(texts.levelTitle(1));
    game.playDaily();
    expect(hud.state.view.title).toBe(texts.dailyTitle(new Date(), false));
  });

  it('tells about the rules of a level: when it opens, and from the info button', () => {
    const { game, rules } = start();
    // A new player gets the basics on the first level.
    expect(rules.model.rules.map((rule) => rule.id)).toContain('basics');
    expect(rules.isShowingInfo).toBe(false);
    game.closeRules();
    expect(rules.model).toBeNull();
    game.showInfo();
    expect(rules.isShowingInfo).toBe(true);
    expect(rules.model.supplies.length).toBeGreaterThan(0);
  });
});
