import { describe, expect, it } from 'vitest';
import { parseColor } from '../app/src/color.js';
import { SkiaContext2D } from '../app/src/skiaContext.js';
import { drawScene } from '../src/scene/renderer.js';
import { TubeView } from '../src/scene/tubeView.js';
import { arrangeTubes, fitToView } from '../src/scene/layout.js';
import { HIDDEN } from '../src/game/rules.js';

/**
 * A stand-in for React Native Skia that writes down what it is asked to draw. Every recording
 * has a log of its own, as a picture of Skia has, and `recordings` counts how many were made.
 */
function fakeSkia() {
  const state = { recordings: 0 };
  const skia = {
    state,
    Skia: {
      PictureRecorder: () => {
        state.recordings++;
        const log = [];
        const canvas = {
          save: () => log.push(['save']),
          restore: () => log.push(['restore']),
          translate: (x, y) => log.push(['translate', x, y]),
          scale: (x, y) => log.push(['scale', x, y]),
          rotate: (degrees) => log.push(['rotate', degrees]),
          drawPath: (path, paint) =>
            log.push(['drawPath', path.ops.length, paint.style, paint.color]),
          drawRect: (rect, paint) => log.push(['drawRect', rect, paint.style, paint.color]),
          drawPicture: (picture) => log.push(['drawPicture', picture]),
          clipPath: () => log.push(['clip']),
          drawText: (text) => log.push(['text', text])
        };
        return {
          beginRecording: () => canvas,
          finishRecordingAsPicture: () => ({ log })
        };
      },
      XYWHRect: (x, y, width, height) => ({ x, y, width, height }),
      // As in React Native Skia 2: a path is immutable, a builder makes it (a path has no moveTo).
      PathBuilder: {
        Make: () => {
          const ops = [];
          const builder = { build: () => ({ ops: [...ops] }) };
          for (const name of ['moveTo', 'lineTo', 'cubicTo', 'close']) {
            builder[name] = (...args) => ops.push([name, ...args]);
          }
          return builder;
        }
      },
      Paint: () => {
        state.paints = (state.paints ?? 0) + 1;
        const paint = {};
        paint.setAntiAlias = () => {};
        paint.setColor = (color) => (paint.color = color);
        paint.setStyle = (style) => (paint.style = style);
        paint.setStrokeWidth = (width) => (paint.width = width);
        paint.setStrokeCap = () => {};
        paint.setStrokeJoin = () => {};
        return paint;
      },
      Color: (css) => css
    },
    PaintStyle: { Fill: 'fill', Stroke: 'stroke' },
    StrokeCap: { Round: 'round', Butt: 'butt' },
    StrokeJoin: { Round: 'round', Miter: 'miter' },
    ClipOp: { Intersect: 'intersect' }
  };
  return skia;
}

/** What a picture draws, with the pictures it puts inside it opened up. */
function flatten(log) {
  return log.flatMap((entry) => (entry[0] === 'drawPicture' ? flatten(entry[1].log) : [entry]));
}

/** A board drawn on a Skia context, which can be drawn again (frame after frame). */
function board(setUp) {
  const skia = fakeSkia();
  let picture = null;
  const context = new SkiaContext2D(skia, {
    size: () => ({ width: 390, height: 600 }),
    onPicture: (made) => (picture = made),
    fontFor: () => ({ getTextWidth: () => 10 })
  });
  const tubes = setUp();
  const { positions, bounds } = arrangeTubes(tubes.length, 390 / 600, tubes[0].height);
  tubes.forEach((tube, index) => Object.assign(tube, positions[index]));
  const view = fitToView(bounds, 390, 600, 80, 120);
  const frame = () => {
    drawScene(context, {
      width: 390,
      height: 600,
      tubes,
      streams: new Set([{ visible: true, color: 0, x: 0, top: 3, bottom: 1 }]),
      view,
      glassColor: '#ffffff',
      symbols: true
    });
    return new Promise((resolve) => queueMicrotask(() => resolve(picture)));
  };
  return { skia, tubes, frame };
}

function drawOnce(setUp) {
  return board(setUp).frame();
}

describe('colors', () => {
  it('reads the colors the board is drawn with', () => {
    expect(parseColor('#ff0000')).toEqual([1, 0, 0, 1]);
    expect(parseColor('#f00')).toEqual([1, 0, 0, 1]);
    expect(parseColor('rgba(255, 255, 255, 0.22)')).toEqual([1, 1, 1, 0.22]);
    expect(parseColor('rgba(255, 214, 120, 1)')[3]).toBe(1);
    expect(parseColor('not a color')).toEqual([0, 0, 0, 1]);
  });
});

describe('the Skia context', () => {
  it('draws a whole board with the code of the website', async () => {
    const picture = await drawOnce(() => {
      const plain = new TubeView(0);
      plain.showColors([0, 1, 2, 0]);
      const hidden = new TubeView(1);
      hidden.showColors([HIDDEN, HIDDEN, 3, 4]);
      const locked = new TubeView(2, 4, { lockKey: 0 });
      locked.showColors([1, 1, 1, 1]);
      const capped = new TubeView(3);
      capped.showColors([2, 2, 2, 2]);
      capped.capped = true;
      capped.cap = 1;
      const tilted = new TubeView(4, 5, { oneWay: true, fills: 2 });
      tilted.showColors([0, 1]);
      tilted.body.tilt = 0.6;
      return [plain, hidden, locked, capped, tilted, new TubeView(5)];
    });

    const kinds = flatten(picture.log).map((entry) => entry[0]);
    expect(kinds).toContain('drawPath');
    expect(kinds).toContain('clip');
    expect(kinds).toContain('text');
    // Every save has its restore.
    expect(kinds.filter((kind) => kind === 'save')).toHaveLength(
      kinds.filter((kind) => kind === 'restore').length
    );
    // Strokes and fills both appear, with their alpha.
    const drawn = flatten(picture.log);
    const styles = new Set(drawn.filter((e) => e[0] === 'drawPath').map((e) => e[2]));
    expect(styles).toEqual(new Set(['fill', 'stroke']));
    expect(drawn.some((e) => e[0] === 'drawPath' && /rgba\(.*, 0\.\d+\)/.test(e[3]))).toBe(true);
  });

  describe('tubes kept as pictures', () => {
    const resting = () => {
      const tubes = [0, 1, 2].map((index) => new TubeView(index));
      tubes.forEach((tube) => tube.showColors([0, 1, 2, 0]));
      return tubes;
    };

    it('puts a tube at rest on the board as a picture of its own', async () => {
      const { frame } = board(resting);
      const picture = await frame();
      const placed = picture.log.filter((entry) => entry[0] === 'drawPicture');
      expect(placed).toHaveLength(3);
      // What the tubes draw is inside those pictures, not drawn again on the board.
      expect(picture.log.some((entry) => entry[0] === 'drawPath')).toBe(true); // the stream
      expect(flatten(placed.map((entry) => entry)).length).toBeGreaterThan(placed.length);
      // Each one is moved and scaled into its box first.
      const at = picture.log.findIndex((entry) => entry[0] === 'drawPicture');
      expect(picture.log[at - 3].slice(0, 1)).toEqual(['save']);
      expect(picture.log[at - 2][0]).toBe('translate');
      expect(picture.log[at - 1][0]).toBe('scale');
    });

    it('draws them again from the pictures it has, which costs no new drawing', async () => {
      const { frame, skia } = board(resting);
      await frame();
      // The board, and a picture for each of the three tubes.
      expect(skia.state.recordings).toBe(1 + 3);
      const paints = skia.state.paints;
      await frame();
      await frame();
      // Only the board is recorded again: the tubes still look the same.
      expect(skia.state.recordings).toBe(1 + 3 + 2);
      expect(skia.state.paints).toBe(paints);
    });

    it('makes the picture of a tube again when the tube changes', async () => {
      const { frame, skia, tubes } = board(resting);
      await frame();
      const before = skia.state.recordings;
      tubes[1].showColors([1, 1, 1, 1]);
      await frame();
      // The board and the one tube that changed.
      expect(skia.state.recordings).toBe(before + 2);
    });

    it('draws a tube that moves on the board itself, in every frame', async () => {
      const { frame, tubes } = board(resting);
      tubes[0].body.tilt = 0.6;
      const picture = await frame();
      expect(picture.log.filter((entry) => entry[0] === 'drawPicture')).toHaveLength(2);
      expect(picture.log.filter((entry) => entry[0] === 'drawPath').length).toBeGreaterThan(5);
    });
  });

  it('reuses a paint for the same color and width', () => {
    const skia = fakeSkia();
    const context = new SkiaContext2D(skia, {
      size: () => ({ width: 100, height: 100 }),
      onPicture: () => {},
      fontFor: () => ({})
    });
    context.clearRect(0, 0, 100, 100);
    context.fillStyle = '#336699';
    for (let i = 0; i < 20; i++) context.fillRect(i, 0, 5, 5);
    context.strokeStyle = '#336699';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(10, 10);
    context.stroke();
    context.stroke();
    // One paint to fill and one to stroke, not one for every shape.
    expect(skia.state.paints).toBe(2);
    context.lineWidth = 3;
    context.stroke();
    expect(skia.state.paints).toBe(3);
  });

  it('turns arcs into curves that start where Canvas would start them', async () => {
    const skia = fakeSkia();
    let picture = null;
    const context = new SkiaContext2D(skia, {
      size: () => ({ width: 100, height: 100 }),
      onPicture: (made) => (picture = made),
      fontFor: () => ({})
    });
    context.clearRect(0, 0, 100, 100);
    context.beginPath();
    context.moveTo(0, 0);
    context.arc(10, 10, 5, 0, Math.PI * 2);
    context.fill();
    await new Promise((resolve) => queueMicrotask(resolve));
    const drawn = picture.log.find((entry) => entry[0] === 'drawPath');
    // moveTo, a line to the arc's start, and four quarter-turn curves for a circle.
    expect(drawn[1]).toBe(2 + 4);
  });

  it('keeps colors and widths apart between save and restore', async () => {
    const skia = fakeSkia();
    let picture = null;
    const context = new SkiaContext2D(skia, {
      size: () => ({ width: 100, height: 100 }),
      onPicture: (made) => (picture = made),
      fontFor: () => ({})
    });
    context.clearRect(0, 0, 100, 100);
    context.fillStyle = '#00ff00';
    context.save();
    context.fillStyle = '#ff0000';
    context.restore();
    context.fillRect(0, 0, 5, 5);
    await new Promise((resolve) => queueMicrotask(resolve));
    expect(picture.log.at(-1)[3]).toBe('rgba(0, 255, 0, 1)');
  });
});
