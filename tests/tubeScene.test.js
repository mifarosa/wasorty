import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TubeScene } from '../src/scene/tubeScene.js';

describe('TubeScene', () => {
  let frames;
  let clears;

  beforeEach(() => {
    frames = [];
    clears = 0;
    clock = 0;
    drawCost = 1;
    vi.stubGlobal('window', globalThis);
    vi.stubGlobal('requestAnimationFrame', (callback) => frames.push(callback));
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
      }
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  /** Runs the frames that were asked for, and the ones they ask for in turn. */
  const runFrames = () => {
    for (let i = 0; i < 100 && frames.length > 0; i++) frames.shift()(i * 16);
  };

  /** One refresh of the screen (16 ms): the frame asked for, drawn within that time. */
  const refresh = () => {
    const start = clock;
    frames.shift()();
    clock = Math.max(clock, start + 16);
  };

  /** The clock of the scene, in ms; drawing a frame moves it by `drawCost`. */
  let clock;
  let drawCost;

  function makeScene() {
    const context = new Proxy(
      {},
      {
        get: (_, name) =>
          name === 'clearRect'
            ? () => {
                clears++;
                clock += drawCost;
              }
            : name === 'getTransform' || name === 'createCanvas'
              ? undefined
              : () => {},
        set: () => true
      }
    );
    const canvas = {
      clientWidth: 390,
      clientHeight: 600,
      width: 0,
      height: 0,
      getContext: () => context,
      addEventListener() {},
      getBoundingClientRect: () => ({ left: 0, top: 0 })
    };
    return new TubeScene(canvas, { now: () => clock });
  }

  it('draws a board that sits still once, and again when it is asked to', () => {
    const scene = makeScene();
    scene.showPuzzle([[0, 1, 0, 1], [1, 0, 1, 0], [], []]);
    runFrames();
    const drawn = clears;
    expect(drawn).toBeGreaterThan(0);
    // Nothing moves, so nothing is drawn again by itself.
    runFrames();
    expect(clears).toBe(drawn);

    scene.redraw();
    runFrames();
    expect(clears).toBeGreaterThan(drawn);
  });

  describe('keeping up on a slow phone', () => {
    /** Frames drawn while a tube lifts, as the screen refreshes `refreshes` times. */
    const drawnDuring = (refreshes) => {
      const scene = makeScene();
      scene.showPuzzle([[0, 1, 0, 1], [1, 0, 1, 0], [], []]);
      runFrames();
      const before = clears;
      // A long animation, so that the board keeps moving for the whole time.
      scene.setLifted(0, true);
      for (let i = 0; i < refreshes && frames.length > 0; i++) refresh();
      return clears - before;
    };

    it('draws at every refresh of the screen when a frame is cheap', () => {
      drawCost = 1;
      expect(drawnDuring(60)).toBe(60);
    });

    it('draws about every other refresh once frames cost more than a frame is worth', () => {
      drawCost = 14;
      const drawn = drawnDuring(60);
      // It takes a few frames to learn, then about half of the refreshes are left out.
      expect(drawn).toBeLessThan(40);
      expect(drawn).toBeGreaterThan(20);
    });

    it('goes back to every refresh when frames get cheap again', () => {
      const scene = makeScene();
      scene.showPuzzle([[0, 1, 0, 1], [1, 0, 1, 0], [], []]);
      runFrames();
      const tick = (refreshes) => {
        const before = clears;
        for (let i = 0; i < refreshes && frames.length > 0; i++) refresh();
        return clears - before;
      };
      drawCost = 14;
      scene.setLifted(0, true);
      tick(40);
      drawCost = 1;
      scene.setLifted(1, true);
      tick(40);
      // Learnt again by now: every refresh is drawn.
      scene.setLifted(2, true);
      expect(tick(20)).toBe(20);
    });

    it('does not count the first drawing of a puzzle as slow', () => {
      drawCost = 200;
      const scene = makeScene();
      scene.showPuzzle([[0, 1, 0, 1], [1, 0, 1, 0], [], []]);
      runFrames();
      drawCost = 1;
      expect(drawnDuring(30)).toBe(30);
      void scene;
    });
  });
});
