import { expect, it } from 'vitest';
import { GameController } from '../src/app/controller.js';
import { loadProgress, saveProgress } from '../src/app/progress.js';
import { setLanguage } from '../src/app/i18n.js';
import { createLevelPuzzle } from '../src/game/levels.js';
import { fewestMovesOfPuzzle } from '../src/game/puzzleFewest.js';
import { solveShortest } from '../src/game/shortest.js';
import { NativeHud } from '../app/src/NativeHud.js';
import { NativeMenu, NativeRules } from '../app/src/NativeDialogs.js';

it('goes on to level 2 when Next level is pressed after solving level 1', async () => {
  setLanguage('en');
  const mem = new Map();
  const storage = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => mem.set(k, v),
    removeItem: (k) => mem.delete(k)
  };
  const hud = new NativeHud();
  const scene = new Proxy(
    { pour: () => Promise.resolve(), celebrate: () => Promise.resolve() },
    { get: (t, k) => t[k] ?? (() => {}) }
  );
  const game = new GameController({
    scene,
    hud,
    menu: new NativeMenu(),
    rules: new NativeRules(),
    feedback: { pick() {}, putDown() {}, reject() {}, undo() {}, hint() {}, win() {} },
    findFewestMoves: (p) => Promise.resolve(fewestMovesOfPuzzle(p)),
    progress: loadProgress(storage),
    saveProgress: (p) => saveProgress(p, storage)
  });
  game.start();
  const { tubes, board } = createLevelPuzzle(1);
  for (const [from, to] of solveShortest(tubes, { board })) {
    await game.tapTube(from);
    await game.tapTube(to);
  }
  expect(hud.state.win).not.toBeNull();
  game.continueAfterWin();
  expect(hud.state.win).toBeNull();
  expect(hud.state.view.title).toBe('Level 2');
});
