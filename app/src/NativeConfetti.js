import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Skia from '@shopify/react-native-skia';
import { advancePieces, launchPieces } from '../../src/scene/confetti.js';
import { parseColor } from './color.js';

/** How long a piece lives and how long it takes to fade at the end (as on the website). */
const MAX_AGE_S = 5;
const FADE_S = 1;

/**
 * Confetti shot from both bottom corners over the whole screen, with the website's own
 * pieces and physics (src/scene/confetti.js), drawn with Skia. A burst starts whenever
 * `burst` changes.
 * @param {object} props
 * @param {number} props.burst a counter: each new value is one burst
 * @param {string[]} props.colors CSS colors the pieces come in
 */
export function NativeConfetti({ burst, colors }) {
  const [picture, setPicture] = useState(null);
  const size = useRef({ width: 0, height: 0 });
  const pieces = useRef([]);
  const frame = useRef(null);
  const last = useRef(null);
  const first = useRef(true);
  const colorsNow = useRef(colors);
  colorsNow.current = colors;

  useEffect(() => {
    const tick = (time) => {
      const dt = last.current === null ? 0 : Math.min(0.05, (time - last.current) / 1000);
      last.current = time;
      pieces.current = advancePieces(pieces.current, dt, size.current);
      if (pieces.current.length === 0) {
        frame.current = null;
        setPicture(null);
        return;
      }
      setPicture(draw(pieces.current, size.current));
      frame.current = requestAnimationFrame(tick);
    };

    // The first value is the screen opening, not a win.
    if (first.current) {
      first.current = false;
      return undefined;
    }
    const { width, height } = size.current;
    if (width === 0 || height === 0) return undefined;
    pieces.current = [
      ...pieces.current,
      ...launchPieces(Math.random, size.current, colorsNow.current)
    ];
    if (frame.current === null) {
      last.current = null;
      frame.current = requestAnimationFrame(tick);
    }
    return undefined;
  }, [burst]);

  // Nothing keeps running when the screen goes away.
  useEffect(() => () => frame.current !== null && cancelAnimationFrame(frame.current), []);

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        size.current = { width, height };
      }}
    >
      <Skia.Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {picture && <Skia.Picture picture={picture} />}
      </Skia.Canvas>
    </View>
  );
}

/** One frame: every piece turned, squashed along its length as if it flipped, and faded. */
function draw(pieces, { width, height }) {
  const recorder = Skia.Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.Skia.XYWHRect(0, 0, width, height));
  for (const piece of pieces) {
    if (piece.age < 0) continue;
    const [r, g, b] = parseColor(piece.color);
    const opacity = Math.max(0, Math.min(1, (MAX_AGE_S - piece.age) / FADE_S));
    const paint = Skia.Skia.Paint();
    paint.setAntiAlias(true);
    paint.setColor(
      Skia.Skia.Color(
        `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${opacity})`
      )
    );
    canvas.save();
    canvas.translate(piece.x, piece.y);
    canvas.rotate((piece.angle * 180) / Math.PI, 0, 0);
    canvas.scale(1, Math.cos(piece.flip));
    canvas.drawRect(
      Skia.Skia.XYWHRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height),
      paint
    );
    canvas.restore();
  }
  return recorder.finishRecordingAsPicture();
}
