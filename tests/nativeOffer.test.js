import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameController, DAILY_HINTS } from '../src/app/controller.js';
import { AD_REWARD } from '../src/app/economy.js';
import { setLanguage } from '../src/app/i18n.js';
import { INITIAL_PROGRESS } from '../src/app/progress.js';
import { createLevelPuzzle } from '../src/game/levels.js';
import { fewestMovesOfPuzzle } from '../src/game/puzzleFewest.js';
import { solve } from '../src/game/solver.js';
import { NativeHud } from '../app/src/NativeHud.js';
import { NativeMenu, NativeRules } from '../app/src/NativeDialogs.js';

describe('offering an ad when the hints or the undos are used up', () => {
  let hud;
  let scene;

  /** A game on `progress`, played through the app's own holders. */
  function start(progress) {
    hud = new NativeHud();
    scene = new Proxy(
      { pour: () => Promise.resolve(), celebrate: () => Promise.resolve(), highlight: vi.fn() },
      { get: (target, key) => target[key] ?? (() => {}) }
    );
    const game = new GameController({
      scene,
      hud,
      menu: new NativeMenu(),
      rules: new NativeRules(),
      feedback: { pick() {}, putDown() {}, reject() {}, undo() {}, hint() {}, win() {} },
      findFewestMoves: (puzzle) => Promise.resolve(fewestMovesOfPuzzle(puzzle)),
      progress,
      saveProgress: () => {}
    });
    game.start();
    return game;
  }

  beforeEach(() => setLanguage('en'));

  it('offers an ad instead of saying "no hints" when none is left, and shows the hint after', () => {
    const game = start({ ...INITIAL_PROGRESS, hints: 0 });
    game.showHint();
    expect(hud.state.offer).toEqual({ kind: 'hint' });
    expect(hud.state.toast).toBeNull();

    game.grantReward('hint');
    expect(game.progress().hints).toBe(AD_REWARD);
    hud.closeOffer();
    game.showHint();
    expect(scene.highlight).toHaveBeenCalledOnce();
    expect(game.progress().hints).toBe(AD_REWARD - 1);
  });

  it('puts the hints of the daily puzzle with the daily puzzle, not in the stock', () => {
    const game = start({ ...INITIAL_PROGRESS, hints: 0 });
    game.playDaily();
    expect(hud.state.view.hintCount).toBe(String(DAILY_HINTS));
    game.grantReward('hint');
    expect(hud.state.view.hintCount).toBe(String(DAILY_HINTS + AD_REWARD));
    expect(game.progress().hints).toBe(0);
  });

  it('adds hints to the stock from the win dialog without a message', () => {
    const game = start({ ...INITIAL_PROGRESS, hints: 1 });
    game.grantReward('savedHint');
    expect(game.progress().hints).toBe(1 + AD_REWARD);
    expect(hud.state.toast).toBeNull();
  });

  it('offers an ad when the undos of a level are used up, and takes a spare undo from it', async () => {
    const game = start({ ...INITIAL_PROGRESS, solved: 79, current: 80, spareUndos: 0 });
    const { tubes, board } = createLevelPuzzle(80);
    const [first, second, third] = solve(tubes, { board });
    const play = async ([from, to]) => {
      await game.tapTube(from);
      await game.tapTube(to);
    };
    await play(first);
    await play(second);
    await play(third);
    game.undo();
    game.undo();
    game.undo();
    await play(first);

    // Three undos were allowed; there is a move to take back, but no undo left.
    expect(hud.state.view.canUndo).toBe(false);
    expect(hud.state.view.undoOffer).toBe(true);
    game.undo();
    expect(hud.state.offer).toEqual({ kind: 'undo' });

    game.grantReward('undo');
    expect(game.progress().spareUndos).toBe(AD_REWARD);
    expect(hud.state.view.canUndo).toBe(true);
    expect(hud.state.view.undoOffer).toBe(false);
  });

  it('never offers an ad for undos on a level that has no limit', async () => {
    const game = start({ ...INITIAL_PROGRESS });
    expect(hud.state.view.undoOffer).toBe(false);
    game.undo();
    expect(hud.state.offer).toBeNull();
  });
});

describe('the extra tube', () => {
  let hud;
  let scene;

  function start(progress = { ...INITIAL_PROGRESS }) {
    hud = new NativeHud();
    scene = new Proxy(
      {
        pour: () => Promise.resolve(),
        celebrate: () => Promise.resolve(),
        showPuzzle: vi.fn(),
        showTubeStates: vi.fn()
      },
      { get: (target, key) => target[key] ?? (() => {}) }
    );
    const game = new GameController({
      scene,
      hud,
      menu: new NativeMenu(),
      rules: new NativeRules(),
      feedback: { pick() {}, putDown() {}, reject() {}, undo() {}, hint() {}, win() {} },
      findFewestMoves: (puzzle) => Promise.resolve(fewestMovesOfPuzzle(puzzle)),
      progress,
      saveProgress: () => {}
    });
    game.start();
    return game;
  }

  const lastBoard = () => scene.showPuzzle.mock.lastCall[0];

  beforeEach(() => setLanguage('en'));

  it('is offered on a level, and the ad adds one empty tube to the board', () => {
    const game = start();
    const before = lastBoard().length;
    expect(hud.state.view.tubeOffer).toBe(true);

    game.offerTube();
    expect(hud.state.offer).toEqual({ kind: 'tube' });

    game.grantReward('tube');
    expect(lastBoard()).toHaveLength(before + 1);
    expect(lastBoard().at(-1)).toEqual([]);
    expect(hud.state.toast).toBe('An extra empty tube was added.');
    expect(hud.state.view.tubeOffer).toBe(false);
  });

  it('is given once to a level, and again on the next one', () => {
    const game = start();
    game.grantReward('tube');
    const count = lastBoard().length;
    game.grantReward('tube');
    expect(lastBoard()).toHaveLength(count);

    hud.closeOffer();
    game.offerTube();
    expect(hud.state.offer).toBeNull();
    expect(hud.state.toast).toBe('This level already has its extra tube.');

    game.restart();
    expect(lastBoard()).toHaveLength(count);
    game.playLevel(1);
    expect(lastBoard()).toHaveLength(count - 1);
    expect(hud.state.view.tubeOffer).toBe(true);
  });

  it('is not offered in the daily puzzle, which is ranked', () => {
    const game = start();
    game.playDaily();
    expect(hud.state.view.tubeOffer).toBe(false);
    game.offerTube();
    expect(hud.state.offer).toBeNull();
    const count = lastBoard().length;
    game.grantReward('tube');
    expect(lastBoard()).toHaveLength(count);
  });

  it('keeps the moves already made, and lets them be taken back', async () => {
    const game = start({ ...INITIAL_PROGRESS, solved: 79, current: 80 });
    const { tubes, board } = createLevelPuzzle(80);
    const [first] = solve(tubes, { board });
    await game.tapTube(first[0]);
    await game.tapTube(first[1]);
    expect(hud.state.view.canUndo).toBe(true);

    game.grantReward('tube');
    expect(hud.state.view.canUndo).toBe(true);
    game.undo();
    // Back at the start, with the extra tube still there.
    expect(lastBoard()).toHaveLength(tubes.length + 1);
  });
});
