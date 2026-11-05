import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme
} from 'react-native';
import { LANGUAGES } from '../../src/app/i18n.js';
import { words } from './appTexts.js';
import { SITE_NAME, SITE_URL } from './brand.js';
import { THEME_IDS, colorsOf, paletteOf } from './theme.js';
import { Icon } from './Icon.js';
import { Sheet, useTap } from './ui.js';

/**
 * The settings: the theme, the language, vibration and symbols on the colors, and who makes
 * the game. A change applies at once.
 */
export function SettingsScreen({ settings, colors, onChange, onClose }) {
  const scheme = useColorScheme();
  return (
    <Sheet title={words.settings} colors={colors} onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 22 }}>
        <Group title={words.theme} colors={colors}>
          {THEME_IDS.map((id) => (
            <ThemeChoice
              key={id}
              label={words.themeNames[id]}
              id={id}
              scheme={scheme}
              chosen={settings.theme === id}
              onPress={() => onChange({ theme: id })}
            />
          ))}
        </Group>

        <Group title={words.language} colors={colors}>
          {LANGUAGES.map((id) => (
            <Choice
              key={id}
              label={words.languageNames[id]}
              chosen={settings.language === id}
              colors={colors}
              onPress={() => onChange({ language: id })}
            />
          ))}
        </Group>

        <Group colors={colors}>
          <Toggle
            label={words.haptics}
            value={settings.haptics}
            colors={colors}
            onChange={(haptics) => onChange({ haptics })}
          />
          <Toggle
            label={words.symbols}
            note={words.symbolsNote}
            value={settings.symbols}
            colors={colors}
            onChange={(symbols) => onChange({ symbols })}
          />
        </Group>

        <Group title={words.aboutTitle} colors={colors}>
          <View style={[styles.about, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.aboutName, { color: colors.ink }]}>{SITE_NAME}</Text>
            <Text style={{ color: colors.muted }}>{words.aboutText}</Text>
            <SiteButton colors={colors} />
          </View>
        </Group>
      </ScrollView>
    </Sheet>
  );
}

function Group({ title, colors, children }) {
  return (
    <View style={{ gap: 8 }}>
      {title ? <Text style={[styles.groupTitle, { color: colors.accent }]}>{title}</Text> : null}
      {children}
    </View>
  );
}

/** A theme, shown in its own colors: its background, its ink and a drop of each liquid. */
function ThemeChoice({ id, label, scheme, chosen, onPress }) {
  const tap = useTap();
  const theme = colorsOf(id, scheme);
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected: chosen }}
      style={[
        styles.choice,
        {
          backgroundColor: theme.bgBottom,
          borderColor: chosen ? theme.accent : theme.line,
          borderWidth: chosen ? 3 : 2
        }
      ]}
    >
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={{ color: theme.ink, fontWeight: '800', fontSize: 16 }}>{label}</Text>
        <View style={styles.drops}>
          {paletteOf(id)
            .slice(0, 7)
            .map((color, index) => (
              <View key={index} style={[styles.drop, { backgroundColor: color }]} />
            ))}
        </View>
      </View>
      <View style={{ width: 24 }}>
        {chosen ? <Icon name="check" size={24} color={theme.accent} /> : null}
      </View>
    </Pressable>
  );
}

function Choice({ label, chosen, colors, onPress }) {
  const tap = useTap();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected: chosen }}
      style={[
        styles.choice,
        { backgroundColor: colors.panel, borderColor: chosen ? colors.accent : colors.line }
      ]}
    >
      <Text style={{ color: colors.ink, fontWeight: chosen ? '800' : '600', fontSize: 16 }}>
        {label}
      </Text>
      <View style={{ width: 24 }}>
        {chosen ? <Icon name="check" size={24} color={colors.accent} /> : null}
      </View>
    </Pressable>
  );
}

function Toggle({ label, note, value, colors, onChange }) {
  const tap = useTap();
  return (
    <View style={[styles.choice, { backgroundColor: colors.panel, borderColor: colors.line }]}>
      <View style={{ flex: 1, gap: 2, paddingRight: 12 }}>
        <Text style={{ color: colors.ink, fontWeight: '600', fontSize: 16 }}>{label}</Text>
        {note ? <Text style={{ color: colors.muted, fontSize: 13 }}>{note}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(next) => {
          tap();
          onChange(next);
        }}
        trackColor={{ true: colors.accent }}
      />
    </View>
  );
}

function SiteButton({ colors }) {
  const tap = useTap();
  return (
    <Pressable
      onPress={() => {
        tap();
        // A phone that cannot open the page has nothing to tell the player about it.
        Linking.openURL(SITE_URL).catch(() => {});
      }}
      accessibilityRole="link"
      style={[styles.site, { backgroundColor: colors.accent }]}
    >
      <Text style={{ color: colors.accentInk, fontWeight: '800' }}>{words.visitSite}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  groupTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  drops: { flexDirection: 'row', gap: 6 },
  drop: { width: 18, height: 18, borderRadius: 9 },
  about: { borderRadius: 14, borderWidth: 2, padding: 16, gap: 6 },
  aboutName: { fontSize: 22, fontWeight: '800' },
  site: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 6
  }
});
