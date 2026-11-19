import { parseColor } from './color.js';

const TAU = Math.PI * 2;
/** The most paints kept for reuse; a board uses a few dozen. */
const MAX_PAINTS = 512;

/**
 * Just enough of a `CanvasRenderingContext2D` to draw the board with the same code as the
 * website (src/scene/renderer.js), on top of React Native Skia. Each frame is recorded into a
 * picture: the first `clearRect` over the whole canvas starts it, and it is handed to
 * `onPicture` once the code that draws has finished.
 *
 * `skia` is the `@shopify/react-native-skia` module (a stand-in in tests).
 */
export class SkiaContext2D {
  fillStyle = '#000000';
  strokeStyle = '#000000';
  lineWidth = 1;
  globalAlpha = 1;
  lineCap = 'butt';
  lineJoin = 'miter';
  textAlign = 'start';
  textBaseline = 'alphabetic';
  font = '10px sans-serif';

  #skia;
  #size;
  #onPicture;
  #fontFor;
  #recorder = null;
  #canvas = null;
  #path = null;
  #current = null;
  #stack = [];
  #flushQueued = false;
  #paints;
  #offscreen;
  #pixelRatio;
  #background;
  #imagePaint = null;
  #textures;
  #transform;

  /**
   * @param {object} skia
   * @param {object} options
   * @param {() => { width: number, height: number }} options.size the canvas size in pixels
   * @param {(picture: object) => void} options.onPicture
   * @param {(size: number, bold: boolean) => object} options.fontFor a Skia font of a size
   * @param {boolean} [options.offscreen] draws into a picture of its own, handed over by `finish`,
   *   not onto the screen (the picture of a tube, see `createCanvas`)
   * @param {Map<string, object>} [options.paints] paints already made, shared with the contexts
   *   made by this one
   * @param {number} [options.pixelRatio] device pixels in a dp: what a picture of a tube is made
   *   as sharp as
   * @param {() => string | null} [options.background] the color the whole board is painted in
   *   first, for a canvas that covers its place completely (an opaque one is the cheapest to show)
   * @param {boolean} [options.textures] keep a tube at rest as an image the graphics card holds,
   *   not as a picture of drawing commands that is played again in every frame (a phone that
   *   is slow needs it; a fast one does well with the picture)
   */
  constructor(
    skia,
    {
      size,
      onPicture,
      fontFor,
      offscreen = false,
      paints = new Map(),
      pixelRatio = 1,
      background,
      textures = false
    }
  ) {
    this.#skia = skia;
    this.#size = size;
    this.#onPicture = onPicture;
    this.#fontFor = fontFor;
    this.#paints = paints;
    this.#offscreen = offscreen;
    this.#pixelRatio = pixelRatio;
    this.#background = background ?? null;
    this.#textures = textures;
    this.#transform = Object.freeze({ a: pixelRatio, b: 0, c: 0, d: pixelRatio, e: 0, f: 0 });
    if (offscreen) this.#startRecording();
  }

  // The board is drawn in dp, which Skia uses too, so the pixel ratio needs no scaling.
  setTransform() {}

  clearRect(x, y, width, height) {
    const size = this.#size();
    if (this.#offscreen || this.#canvas) return;
    if (x > 0 || y > 0 || width < size.width || height < size.height) return;
    this.#startRecording();
    this.#queueFlush();
  }

  #startRecording() {
    const { width, height } = this.#size();
    this.#recorder = this.#skia.Skia.PictureRecorder();
    this.#canvas = this.#recorder.beginRecording(this.#skia.Skia.XYWHRect(0, 0, width, height));
    this.#stack = [];
    const background = this.#offscreen ? null : this.#background?.();
    if (background) {
      this.#canvas.drawRect(this.#skia.Skia.XYWHRect(0, 0, width, height), this.#solid(background));
    }
  }

  /**
   * The board is drawn in dp, which Skia uses too, so the board itself is not scaled. The scale
   * that is told is the one of the screen, so that a picture of a tube is made with as many
   * pixels as the tube takes on the screen.
   */
  getTransform() {
    return this.#transform;
  }

  /**
   * A canvas to draw something that does not change into once, and put on the board as often as
   * needed (the website does the same with the canvases of a page): the board code draws a tube
   * at rest into it and then `drawImage`s it. What is drawn stays a picture of drawing commands,
   * so Skia plays it back without JavaScript, which is what keeps a board of many tubes smooth
   * on a phone that is slower than an iPhone.
   */
  createCanvas() {
    const sprite = { width: 0, height: 0, context: null, made: null, image: undefined };
    sprite.getContext = () => {
      // Every new drawing starts a new picture.
      sprite.made = null;
      sprite.image = undefined;
      sprite.context = new SkiaContext2D(this.#skia, {
        size: () => ({ width: sprite.width, height: sprite.height }),
        fontFor: this.#fontFor,
        offscreen: true,
        paints: this.#paints,
        pixelRatio: this.#pixelRatio
      });
      return sprite.context;
    };
    sprite.picture = () => (sprite.made ??= sprite.context?.finish() ?? null);
    // The picture as an image the graphics card keeps, which costs it far less to put on the
    // board than the many shapes of the picture. null when no image could be made.
    sprite.texture = () => {
      if (sprite.image === undefined) {
        const picture = sprite.picture();
        sprite.image = picture ? this.#rasterize(picture, sprite.width, sprite.height) : null;
      }
      return sprite.image;
    };
    return sprite;
  }

  #rasterize(picture, width, height) {
    try {
      const surface = this.#skia.Skia.Surface?.Make(Math.ceil(width), Math.ceil(height));
      if (!surface) return null;
      surface.getCanvas().drawPicture(picture);
      surface.flush?.();
      return surface.makeImageSnapshot();
    } catch {
      // The picture itself does as well, only slower.
      return null;
    }
  }

  /** Ends an offscreen drawing and gives its picture. */
  finish() {
    if (!this.#recorder) return null;
    const picture = this.#recorder.finishRecordingAsPicture();
    this.#canvas = null;
    this.#recorder = null;
    return picture;
  }

  /** Puts a canvas made by `createCanvas` on this one, in the box given. */
  drawImage(image, x, y, width, height) {
    if (!this.#canvas || !image) return;
    const texture = this.#textures ? image.texture?.() : null;
    if (texture) {
      // One image pixel on one pixel of the screen: the box is moved to the pixel grid and
      // takes the size of the image, so thin lines stay as sharp as they were drawn.
      const ratio = this.#pixelRatio;
      // Called on `Skia`, not taken out of it: the native functions need their `this`.
      const { Skia } = this.#skia;
      this.#canvas.drawImageRect(
        texture,
        Skia.XYWHRect(0, 0, image.width, image.height),
        Skia.XYWHRect(
          Math.round(x * ratio) / ratio,
          Math.round(y * ratio) / ratio,
          image.width / ratio,
          image.height / ratio
        ),
        this.#plainPaint()
      );
      return;
    }
    const picture = image.picture?.();
    if (!picture) return;
    this.#canvas.save();
    this.#canvas.translate(x, y);
    this.#canvas.scale(width / image.width, height / image.height);
    this.#canvas.drawPicture(picture);
    this.#canvas.restore();
  }

  #plainPaint() {
    if (!this.#imagePaint) {
      this.#imagePaint = this.#skia.Skia.Paint();
      this.#imagePaint.setAntiAlias(true);
    }
    return this.#imagePaint;
  }

  save() {
    this.#stack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      globalAlpha: this.globalAlpha,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      font: this.font
    });
    this.#canvas?.save();
  }

  restore() {
    const state = this.#stack.pop();
    if (state) Object.assign(this, state);
    this.#canvas?.restore();
  }

  translate(x, y) {
    this.#canvas?.translate(x, y);
  }

  scale(x, y) {
    this.#canvas?.scale(x, y);
  }

  /** @param {number} angle radians */
  rotate(angle) {
    this.#canvas?.rotate((angle * 180) / Math.PI, 0, 0);
  }

  beginPath() {
    // A Skia path cannot be changed; a builder collects the segments and makes the path.
    this.#path = this.#skia.Skia.PathBuilder.Make();
    this.#current = null;
  }

  closePath() {
    this.#path?.close();
  }

  moveTo(x, y) {
    this.#ensurePath().moveTo(x, y);
    this.#current = { x, y };
  }

  lineTo(x, y) {
    if (!this.#current) return this.moveTo(x, y);
    this.#path.lineTo(x, y);
    this.#current = { x, y };
  }

  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
    if (!this.#current) this.moveTo(c1x, c1y);
    this.#path.cubicTo(c1x, c1y, c2x, c2y, x, y);
    this.#current = { x, y };
  }

  rect(x, y, width, height) {
    this.moveTo(x, y);
    this.lineTo(x + width, y);
    this.lineTo(x + width, y + height);
    this.lineTo(x, y + height);
    this.closePath();
  }

  /** A circular arc, as Canvas draws it: a line joins it to where the path was. */
  arc(cx, cy, radius, start, end, counterclockwise = false) {
    let sweep = end - start;
    if (counterclockwise) {
      if (sweep > 0) sweep -= Math.ceil(sweep / TAU) * TAU;
      sweep = Math.max(sweep, -TAU);
    } else {
      if (sweep < 0) sweep += Math.ceil(-sweep / TAU) * TAU;
      sweep = Math.min(sweep, TAU);
    }
    const first = { x: cx + radius * Math.cos(start), y: cy + radius * Math.sin(start) };
    if (this.#current) this.lineTo(first.x, first.y);
    else this.moveTo(first.x, first.y);
    this.#arcSegments(cx, cy, radius, start, sweep);
  }

  /** The rounded corner of Canvas: an arc of `radius` between the lines to (x1,y1) and (x2,y2). */
  arcTo(x1, y1, x2, y2, radius) {
    const from = this.#current ?? { x: x1, y: y1 };
    if (!this.#current) this.moveTo(x1, y1);
    const ax = from.x - x1;
    const ay = from.y - y1;
    const bx = x2 - x1;
    const by = y2 - y1;
    const lengthA = Math.hypot(ax, ay);
    const lengthB = Math.hypot(bx, by);
    const cross = ax * by - ay * bx;
    if (radius === 0 || lengthA === 0 || lengthB === 0 || Math.abs(cross) < 1e-9) {
      this.lineTo(x1, y1);
      return;
    }
    const cosAngle = (ax * bx + ay * by) / (lengthA * lengthB);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    const tangent = radius / Math.tan(angle / 2);
    const startPoint = { x: x1 + (ax / lengthA) * tangent, y: y1 + (ay / lengthA) * tangent };
    const endPoint = { x: x1 + (bx / lengthB) * tangent, y: y1 + (by / lengthB) * tangent };
    // The center sits on the bisector, `radius` away from both lines.
    const bisectorX = ax / lengthA + bx / lengthB;
    const bisectorY = ay / lengthA + by / lengthB;
    const bisectorLength = Math.hypot(bisectorX, bisectorY);
    const distance = radius / Math.sin(angle / 2);
    const cx = x1 + (bisectorX / bisectorLength) * distance;
    const cy = y1 + (bisectorY / bisectorLength) * distance;
    const startAngle = Math.atan2(startPoint.y - cy, startPoint.x - cx);
    const endAngle = Math.atan2(endPoint.y - cy, endPoint.x - cx);
    let sweep = endAngle - startAngle;
    if (cross < 0) {
      // Turning one way.
      if (sweep < 0) sweep += TAU;
      if (sweep > Math.PI) sweep -= TAU;
    } else {
      if (sweep > 0) sweep -= TAU;
      if (sweep < -Math.PI) sweep += TAU;
    }
    this.lineTo(startPoint.x, startPoint.y);
    this.#arcSegments(cx, cy, radius, startAngle, sweep);
  }

  fill() {
    if (this.#path) this.#canvas?.drawPath(this.#path.build(), this.#paint('fill'));
  }

  stroke() {
    if (this.#path) this.#canvas?.drawPath(this.#path.build(), this.#paint('stroke'));
  }

  fillRect(x, y, width, height) {
    this.#canvas?.drawRect(this.#skia.Skia.XYWHRect(x, y, width, height), this.#paint('fill'));
  }

  clip() {
    if (this.#path) {
      this.#canvas?.clipPath(this.#path.build(), this.#skia.ClipOp.Intersect, true);
    }
  }

  fillText(text, x, y) {
    if (!this.#canvas) return;
    const size = parseFloat(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? '10');
    const bold = /\b(bold|[6-9]00)\b/.test(this.font);
    const font = this.#fontFor(size, bold);
    const width = font.getTextWidth?.(text) ?? font.measureText?.(text)?.width ?? 0;
    const dx = this.textAlign === 'center' ? -width / 2 : this.textAlign === 'right' ? -width : 0;
    const dy = this.textBaseline === 'middle' ? size * 0.35 : 0;
    this.#canvas.drawText(text, x + dx, y + dy, this.#paint('fill'), font);
  }

  #ensurePath() {
    if (!this.#path) this.beginPath();
    return this.#path;
  }

  /** Appends a circular arc as cubic curves (at most a quarter turn each). */
  #arcSegments(cx, cy, radius, start, sweep) {
    const pieces = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2)));
    const step = sweep / pieces;
    const k = (4 / 3) * Math.tan(step / 4);
    let angle = start;
    for (let i = 0; i < pieces; i++) {
      const next = angle + step;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const cosB = Math.cos(next);
      const sinB = Math.sin(next);
      this.bezierCurveTo(
        cx + radius * (cosA - k * sinA),
        cy + radius * (sinA + k * cosA),
        cx + radius * (cosB + k * sinB),
        cy + radius * (sinB - k * cosB),
        cx + radius * cosB,
        cy + radius * sinB
      );
      angle = next;
    }
  }

  /** A paint for what is being drawn; the same paint is used again for the same colors and widths. */
  #paint(kind) {
    const style = kind === 'fill' ? this.fillStyle : this.strokeStyle;
    const key =
      kind === 'fill'
        ? `f|${style}|${this.globalAlpha}`
        : `s|${style}|${this.globalAlpha}|${this.lineWidth}|${this.lineCap}|${this.lineJoin}`;
    let paint = this.#paints.get(key);
    if (!paint) {
      paint = this.#makePaint(kind);
      if (this.#paints.size >= MAX_PAINTS) this.#paints.clear();
      this.#paints.set(key, paint);
    }
    return paint;
  }

  /** A paint that fills with one color. */
  #solid(color) {
    const key = `background|${color}`;
    let paint = this.#paints.get(key);
    if (!paint) {
      const { Skia, PaintStyle } = this.#skia;
      const [r, g, b, a] = parseColor(color);
      paint = Skia.Paint();
      paint.setColor(
        Skia.Color(
          `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`
        )
      );
      paint.setStyle(PaintStyle.Fill);
      this.#paints.set(key, paint);
    }
    return paint;
  }

  #makePaint(kind) {
    const { Skia, PaintStyle, StrokeCap, StrokeJoin } = this.#skia;
    const paint = Skia.Paint();
    const [r, g, b, a] = parseColor(kind === 'fill' ? this.fillStyle : this.strokeStyle);
    paint.setAntiAlias(true);
    const channel = (value) => Math.round(value * 255);
    paint.setColor(
      Skia.Color(`rgba(${channel(r)}, ${channel(g)}, ${channel(b)}, ${a * this.globalAlpha})`)
    );
    if (kind === 'stroke') {
      paint.setStyle(PaintStyle.Stroke);
      paint.setStrokeWidth(this.lineWidth);
      paint.setStrokeCap(this.lineCap === 'round' ? StrokeCap.Round : StrokeCap.Butt);
      paint.setStrokeJoin(this.lineJoin === 'round' ? StrokeJoin.Round : StrokeJoin.Miter);
    } else {
      paint.setStyle(PaintStyle.Fill);
    }
    return paint;
  }

  /** Hands the recorded frame on once the drawing code has run to its end. */
  #queueFlush() {
    if (this.#flushQueued) return;
    this.#flushQueued = true;
    queueMicrotask(() => {
      this.#flushQueued = false;
      if (!this.#canvas) return;
      const picture = this.#recorder.finishRecordingAsPicture();
      this.#canvas = null;
      this.#recorder = null;
      this.#onPicture(picture);
    });
  }
}
