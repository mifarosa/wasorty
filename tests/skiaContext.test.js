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
function fakeSkia({ surfaces = true } = {}) {
  const state = { recordings: 0, images: 0 };
  const recordingCanvas = (log) => ({
    save: () => log.push(['save']),
    restore: () => log.push(['restore']),
    translate: (x, y) => log.push(['translate', x, y]),
    scale: (x, y) => log.push(['scale', x, y]),
    rotate: (degrees) => log.push(['rotate', degrees]),
    drawPath: (path, paint) => log.push(['drawPath', path.ops.length, paint.style, paint.color]),
    drawRect: (rect, paint) => log.push(['drawRect', rect, paint.style, paint.color]),
    drawPicture: (picture) => log.push(['drawPicture', picture]),
    clipPath: () => log.push(['clip']),
    drawText: (text) => log.push(['text', text]),
    drawImageRect: (image, src, dest) => log.push(['drawImageRect', image, src, dest])
  });
  const skia = {
    state,
    Skia: {
      PictureRecorder: () => {
        state.recordings++;
        const log = [];
        const canvas = recordingCanvas(log);
        return {
          beginRecording: () => canvas,
          finishRecordingAsPicture: () => ({ log })
        };
      },
      // A raster surface: what is drawn on it is kept as an image.
      Surface: {
        Make: (width, height) => {
          if (!surfaces) return null;
          const log = [];
          return {
            getCanvas: () => recordingCanvas(log),
            flush: () => {},
            makeImageSnapshot: () => {
              state.images++;
              return { width, height, log };
            }
          };
        }
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
  return log.flatMap((entry) =>
    entry[0] === 'drawPicture' || entry[0] === 'drawImageRect' ? flatten(entry[1].log) : [entry]
  );
}

/** A board drawn on a Skia context, which can be drawn again (frame after frame). */
function board(setUp, { surfaces, pixelRatio, background, textures = true } = {}) {
  const skia = fakeSkia({ surfaces });
  let picture = null;
  const context = new SkiaContext2D(skia, {
    size: () => ({ width: 390, height: 600 }),
    onPicture: (made) => (picture = made),
    fontFor: () => ({ getTextWidth: () => 10 }),
    pixelRatio,
    background,
    textures
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

  describe('tubes kept as images', () => {
    const resting = () => {
      const tubes = [0, 1, 2].map((index) => new TubeView(index));
      tubes.forEach((tube) => tube.showColors([0, 1, 2, 0]));
      return tubes;
    };
    const placed = (picture, kind) => picture.log.filter((entry) => entry[0] === kind);

    it('puts a tube at rest on the board as an image the graphics card keeps', async () => {
      const { frame } = board(resting);
      const picture = await frame();
      const images = placed(picture, 'drawImageRect');
      expect(images).toHaveLength(3);
      // The tube is in the image, not drawn again on the board: only the stream is.
      expect(picture.log.filter((entry) => entry[0] === 'drawPath')).toHaveLength(1);
      expect(flatten(images).filter((entry) => entry[0] === 'drawPath').length).toBeGreaterThan(30);
      // The whole image goes into the box of the tube.
      const [, image, source, box] = images[0];
      expect(source).toEqual({ x: 0, y: 0, width: image.width, height: image.height });
      expect(box.width).toBeGreaterThan(0);
    });

    it('draws them again from the images it has, which costs no new drawing', async () => {
      const { frame, skia } = board(resting);
      await frame();
      // The board, and a picture and an image for each of the three tubes.
      expect(skia.state.recordings).toBe(1 + 3);
      expect(skia.state.images).toBe(3);
      const paints = skia.state.paints;
      await frame();
      await frame();
      // Only the board is recorded again: the tubes still look the same.
      expect(skia.state.recordings).toBe(1 + 3 + 2);
      expect(skia.state.images).toBe(3);
      expect(skia.state.paints).toBe(paints);
    });

    it('makes the image of a tube again when the tube changes', async () => {
      const { frame, skia, tubes } = board(resting);
      await frame();
      tubes[1].showColors([1, 1, 1, 1]);
      await frame();
      expect(skia.state.recordings).toBe(1 + 3 + 2);
      expect(skia.state.images).toBe(4);
    });

    it('makes them as sharp as the screen is, in as many pixels as the tube takes there', async () => {
      const sizeOf = async (pixelRatio) => {
        const { frame } = board(resting, { pixelRatio });
        const [, image] = placed(await frame(), 'drawImageRect')[0];
        return image;
      };
      const one = await sizeOf(1);
      const two = await sizeOf(2);
      expect(two.width).toBeGreaterThanOrEqual(one.width * 1.9);
      expect(two.height).toBeGreaterThanOrEqual(one.height * 1.9);
    });

    it('puts an image on the pixel grid of the screen, one pixel for one', async () => {
      const { frame } = board(resting, { pixelRatio: 2 });
      const picture = await frame();
      for (const [, image, , box] of placed(picture, 'drawImageRect')) {
        expect(box.x * 2).toBeCloseTo(Math.round(box.x * 2), 6);
        expect(box.y * 2).toBeCloseTo(Math.round(box.y * 2), 6);
        expect(box.width * 2).toBeCloseTo(image.width, 6);
        expect(box.height * 2).toBeCloseTo(image.height, 6);
      }
    });

    it('keeps the pictures, and makes no images, where textures are not asked for', async () => {
      const { frame, skia } = board(resting, { textures: false });
      const picture = await frame();
      expect(placed(picture, 'drawImageRect')).toHaveLength(0);
      expect(placed(picture, 'drawPicture')).toHaveLength(3);
      expect(skia.state.images).toBe(0);
    });

    it('falls back on the picture when no image can be made', async () => {
      const { frame } = board(resting, { surfaces: false });
      const picture = await frame();
      expect(placed(picture, 'drawImageRect')).toHaveLength(0);
      expect(placed(picture, 'drawPicture')).toHaveLength(3);
      const at = picture.log.findIndex((entry) => entry[0] === 'drawPicture');
      expect(picture.log.slice(at - 3, at).map((entry) => entry[0])).toEqual([
        'save',
        'translate',
        'scale'
      ]);
    });

    it('draws a tube that moves on the board itself, in every frame', async () => {
      const { frame, tubes } = board(resting);
      tubes[0].body.tilt = 0.6;
      const picture = await frame();
      expect(placed(picture, 'drawImageRect')).toHaveLength(2);
      expect(picture.log.filter((entry) => entry[0] === 'drawPath').length).toBeGreaterThan(5);
    });

    it('paints the board in its own color first when it has one', async () => {
      const { frame } = board(resting, { background: () => '#102030' });
      const picture = await frame();
      expect(picture.log[0][0]).toBe('drawRect');
      expect(picture.log[0][1]).toEqual({ x: 0, y: 0, width: 390, height: 600 });
      expect(picture.log[0][3]).toBe('rgba(16, 32, 48, 1)');
      // A tube's own picture has no background.
      expect(
        flatten(placed(picture, 'drawImageRect')).some(
          (entry) => entry[3] === 'rgba(16, 32, 48, 1)'
        )
      ).toBe(false);
    });

    it('leaves the board transparent when it has no color', async () => {
      const { frame } = board(resting);
      const picture = await frame();
      expect(picture.log.some((entry) => entry[0] === 'drawRect')).toBe(false);
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
