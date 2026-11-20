import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, Platform, View } from 'react-native';
import * as Skia from '@shopify/react-native-skia';
import { TubeScene } from '../../src/scene/tubeScene.js';
import { SkiaContext2D } from './skiaContext.js';

const ANDROID = Platform.OS === 'android';
/**
 * Whether the board is an opaque canvas that paints the screen color itself. Android would show
 * it on a surface of its own (a SurfaceView), the cheapest way, but on a Redmi 9C that surface
 * hid the title above the board and stood out from the screen as a box, so the board is the
 * transparent canvas it has always been. Everything else made for slow phones stays.
 */
const OPAQUE_BOARD = false;

const fonts = new Map();

/** A Skia font for the "?" of a hidden color; the system's own, one per size. */
function fontFor(size, bold) {
  const key = `${size}-${bold}`;
  if (!fonts.has(key)) {
    fonts.set(
      key,
      Skia.matchFont({
        fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
        fontSize: size,
        fontWeight: bold ? 'bold' : 'normal'
      })
    );
  }
  return fonts.get(key);
}

/**
 * The board. The web scene (src/scene/tubeScene.js) runs here as it is: it is handed a small
 * stand-in for a canvas element, which draws through Skia (see skiaContext.js) and passes taps
 * on. The game only sees the scene, which reports taps and is told what to show.
 *
 * @param {object} props
 * @param {(scene: TubeScene) => void} props.onScene called once the scene is ready
 * @param {string} props.background the color of the screen behind the board
 */
export const NativeBoard = memo(function NativeBoard({ onScene, background }) {
  const [picture, setPicture] = useState(null);
  const size = useRef({ width: 0, height: 0 });
  const scene = useRef(null);
  // What the context paints first; read when a frame is made, so a new theme shows at once.
  const backgroundRef = useRef(background);
  backgroundRef.current = background;
  useEffect(() => {
    scene.current?.redraw();
  }, [background]);
  const host = useMemo(() => {
    const resizeCallbacks = [];
    // A still board is drawn once, and that last frame can fail to reach the screen. So when
    // frames stop coming, one more is drawn (that one does not start another round).
    let settleTimer = null;
    let settling = false;
    const settle = () => {
      if (settling) {
        settling = false;
        return;
      }
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        settling = true;
        scene.current?.redraw();
      }, 150);
    };
    const element = {
      clientWidth: 0,
      clientHeight: 0,
      width: 0,
      height: 0,
      pointerDown: null,
      getContext: () =>
        new SkiaContext2D(Skia, {
          size: () => size.current,
          onPicture: (next) => {
            setPicture(next);
            settle();
          },
          fontFor,
          pixelRatio: PixelRatio.get(),
          textures: ANDROID,
          background: () => (OPAQUE_BOARD ? backgroundRef.current : null)
        }),
      addEventListener: (type, listener) => {
        if (type === 'pointerdown') element.pointerDown = listener;
      },
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      resize: (width, height) => {
        size.current = { width, height };
        element.clientWidth = width;
        element.clientHeight = height;
        for (const callback of resizeCallbacks) callback();
      }
    };
    // The scene watches its canvas for a new size, as a page does.
    globalThis.ResizeObserver ??= class {
      constructor(callback) {
        this.callback = callback;
      }
      observe() {
        resizeCallbacks.push(this.callback);
      }
    };
    return element;
  }, []);

  return (
    <View
      style={{ flex: 1 }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        host.resize(width, height);
        // A new size moves the tubes; draw them again once the layout has settled.
        for (const delay of [0, 120]) setTimeout(() => scene.current?.redraw(), delay);
        // The scene needs a size to lay the tubes out, so it starts with the first one.
        if (!scene.current && width > 0 && height > 0) {
          scene.current = new TubeScene(host);
          onScene(scene.current);
        }
      }}
      onTouchStart={(event) => {
        const { locationX, locationY } = event.nativeEvent;
        host.pointerDown?.({ clientX: locationX, clientY: locationY });
      }}
    >
      <Skia.Canvas
        style={{ flex: 1 }}
        pointerEvents="none"
        opaque={OPAQUE_BOARD}
        colorSpace={ANDROID ? 'srgb' : 'p3'}
        androidWarmup
      >
        {picture && <Skia.Picture picture={picture} />}
      </Skia.Canvas>
    </View>
  );
});
