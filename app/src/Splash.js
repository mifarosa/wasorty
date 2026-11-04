import { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { words } from './appTexts.js';
import { LETTERS, SITE_NAME } from './brand.js';
import { parseColor } from './color.js';

/** A darker shade of a color, for the edge under a letter. */
function shade(color) {
  const [r, g, b] = parseColor(color);
  const part = (value) => Math.round(value * 255 * 0.55);
  return `rgb(${part(r)}, ${part(g)}, ${part(b)})`;
}

/** How long the name stays before it fades away by itself. */
const STAY_MS = 2600;

/**
 * The first thing the player sees: the name drops in letter by letter, lands with a bounce,
 * then the letters hop one after the other. A tap or a moment closes it.
 * @param {object} props
 * @param {import('./theme.js').Colors} props.colors
 * @param {() => void} props.onDone called once it has faded away
 */
export function Splash({ colors, onDone }) {
  const { width } = useWindowDimensions();
  const size = Math.min(96, Math.round(width * 0.16));
  const drops = useRef(LETTERS.map(() => new Animated.Value(0))).current;
  const hops = useRef(LETTERS.map(() => new Animated.Value(0))).current;
  const tagline = useRef(new Animated.Value(0)).current;
  const site = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const closing = useRef(false);
  // The app draws itself again whenever the game says something; that must not start the
  // name over, so the latest `onDone` is kept here and the animations run once.
  const done = useRef(onDone);
  done.current = onDone;

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(fade, { toValue: 0, duration: 450, useNativeDriver: true }).start(() =>
      done.current()
    );
  }, [fade]);

  useEffect(() => {
    Animated.parallel([
      // Each letter falls in from above and bounces once.
      Animated.stagger(
        70,
        drops.map((drop) =>
          Animated.spring(drop, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true })
        )
      ),
      Animated.timing(tagline, { toValue: 1, duration: 500, delay: 650, useNativeDriver: true }),
      Animated.timing(site, { toValue: 1, duration: 600, delay: 300, useNativeDriver: true })
    ]).start(() => {
      // A wave runs through the name.
      Animated.stagger(
        90,
        hops.map((hop) =>
          Animated.sequence([
            Animated.timing(hop, { toValue: 1, duration: 170, useNativeDriver: true }),
            Animated.spring(hop, { toValue: 0, friction: 5, tension: 120, useNativeDriver: true })
          ])
        )
      ).start();
    });
    const timer = setTimeout(close, STAY_MS);
    return () => clearTimeout(timer);
  }, [drops, hops, tagline, site, close]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
      <Pressable
        onPress={close}
        accessibilityLabel="Wasorty"
        style={[styles.screen, { backgroundColor: colors.bgBottom }]}
      >
        <View style={styles.name}>
          {LETTERS.map(([letter, color], index) => {
            const fall = drops[index].interpolate({ inputRange: [0, 1], outputRange: [-90, 0] });
            const hop = hops[index].interpolate({ inputRange: [0, 1], outputRange: [0, -22] });
            return (
              <Animated.Text
                key={letter + color}
                style={{
                  fontSize: size,
                  fontWeight: '800',
                  color,
                  // A hard edge under the letter, like the website's, instead of a blur: iOS
                  // cuts a wide blur off at the box of the text.
                  lineHeight: Math.round(size * 1.2),
                  paddingHorizontal: 1,
                  textShadowColor: shade(color),
                  textShadowRadius: 0,
                  textShadowOffset: { width: 0, height: Math.max(3, Math.round(size * 0.06)) },
                  opacity: drops[index].interpolate({
                    inputRange: [0, 0.35],
                    outputRange: [0, 1],
                    extrapolate: 'clamp'
                  }),
                  transform: [
                    { translateY: Animated.add(fall, hop) },
                    {
                      scale: drops[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.6, 1]
                      })
                    }
                  ]
                }}
              >
                {letter}
              </Animated.Text>
            );
          })}
        </View>
        <Animated.View style={{ opacity: tagline }}>
          <Text style={[styles.tagline, { color: colors.muted }]}>{words.tagline}</Text>
        </Animated.View>
        <Animated.Text style={[styles.site, { color: colors.muted, opacity: site }]}>
          {SITE_NAME}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  name: { flexDirection: 'row' },
  tagline: { fontSize: 16 },
  site: { position: 'absolute', bottom: 56, fontSize: 15, fontWeight: '700', letterSpacing: 1.2 }
});
