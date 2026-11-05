import { createContext, useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { words } from './appTexts.js';
import { Icon } from './Icon.js';

/** What a tap on a button of the app does besides its work: a small vibration (see App.js). */
export const TapContext = createContext(() => {});
export const useTap = () => useContext(TapContext);

/** Earned stars, then the ones that are not (always three together). */
export function Stars({ count, colors, size = 18 }) {
  return (
    <View style={{ flexDirection: 'row', gap: Math.round(size * 0.12) }}>
      {[1, 2, 3].map((place) => (
        <Icon
          key={place}
          name="star"
          size={size}
          color={place <= count ? colors.star : colors.starOff}
        />
      ))}
    </View>
  );
}

/** A soft shadow in the color of a button, so it seems to float a little. */
export function glow(color, strength = 1) {
  return {
    shadowColor: color,
    shadowOpacity: 0.45 * strength,
    shadowRadius: 8 * strength,
    shadowOffset: { width: 0, height: 4 * strength },
    elevation: 6 * strength
  };
}

/** A light stripe along the top of a button, as if light fell on it. */
export function Gloss({ radius = 14 }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 3,
        left: 8,
        right: 8,
        height: '34%',
        borderRadius: radius,
        backgroundColor: 'rgba(255,255,255,0.22)'
      }}
    />
  );
}

/** A full screen over the game, with a title and a close button. */
export function Sheet({ title, colors, onClose, children }) {
  const tap = useTap();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgBottom }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.ink }]}>{title}</Text>
          <Pressable
            onPress={() => {
              tap();
              onClose();
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={words.close}
            style={[styles.closeButton, { backgroundColor: colors.panel }]}
          >
            <Icon name="close" size={22} color={colors.ink} />
          </Pressable>
        </View>
        {children}
      </SafeAreaView>
    </View>
  );
}

/**
 * A card in the middle of the screen over a dark veil, like the website's dialogs. With
 * `onDismiss`, a tap on the veil (outside the card) closes it.
 */
export function Dialog({ colors, onDismiss, children }) {
  const card = (
    <View
      // The card takes its own touches, so a tap on it does not reach the veil.
      onStartShouldSetResponder={onDismiss ? () => true : undefined}
      style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}
    >
      {children}
    </View>
  );
  // Without a way out the veil is plain, as it was: nothing around the card takes a touch.
  if (!onDismiss) return <View style={[StyleSheet.absoluteFill, styles.veil]}>{card}</View>;
  return (
    <Pressable
      style={[StyleSheet.absoluteFill, styles.veil]}
      onPress={onDismiss}
      accessible={false}
    >
      {card}
    </Pressable>
  );
}

/** A button: `primary` is filled with the accent color, the others have an outline. */
export function Button({ label, onPress, colors, primary = false, link = false }) {
  const tap = useTap();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      style={[
        styles.button,
        link
          ? null
          : primary
            ? [{ backgroundColor: colors.accent }, glow(colors.accent, 0.7)]
            : { borderColor: colors.line, borderWidth: 1 }
      ]}
    >
      {primary ? <Gloss radius={18} /> : null}
      <Text
        style={{
          fontWeight: '800',
          color: primary ? colors.accentInk : link ? colors.muted : colors.ink
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  sheetTitle: { fontSize: 26, fontWeight: '800' },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  veil: {
    backgroundColor: 'rgba(5,3,20,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '86%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 22
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 22,
    alignItems: 'center'
  }
});
