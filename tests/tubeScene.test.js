import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TubeScene } from '../src/scene/tubeScene.js';

describe('TubeScene', () => {
  let frames;
  let clears;

  beforeEach(() => {
    frames = [];
    clears = 0;
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

  function makeScene() {
    const context = new Proxy(
      {},
      {
        get: (_, name) => (name === 'clearRect' ? () => clears++ : () => {}),
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
    return new TubeScene(canvas);
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
});
