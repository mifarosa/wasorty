import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { words } from './appTexts.js';

/** Earned stars, then the ones that are not (always three together). */
export function Stars({ count, colors, size = 18 }) {
  return (
    <Text style={{ fontSize: size, letterSpacing: 2 }}>
      <Text style={{ color: colors.star }}>{'★'.repeat(count)}</Text>
      <Text style={{ color: colors.starOff }}>{'★'.repeat(Math.max(0, 3 - count))}</Text>
    </Text>
  );
}

/** A full screen over the game, with a title and a close button. */
export function Sheet({ title, colors, onClose, children }) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgBottom }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.ink }]}>{title}</Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={words.close}
            style={[styles.closeButton, { backgroundColor: colors.panel }]}
          >
            <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>✕</Text>
          </Pressable>
        </View>
        {children}
      </SafeAreaView>
    </View>
  );
}

/** A card in the middle of the screen over a dark veil, like the website's dialogs. */
export function Dialog({ colors, children }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.veil]}>
      <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        {children}
      </View>
    </View>
  );
}

/** A button: `primary` is filled with the accent color, the others have an outline. */
export function Button({ label, onPress, colors, primary = false, link = false }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.button,
        link
          ? null
          : primary
            ? { backgroundColor: colors.accent }
            : { borderColor: colors.line, borderWidth: 1 }
      ]}
    >
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
