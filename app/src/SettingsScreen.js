import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { LANGUAGES } from '../../src/app/i18n.js';
import { words } from './appTexts.js';
import { THEME_IDS } from './theme.js';
import { Sheet } from './ui.js';

/**
 * The settings: the theme, the language, vibration and symbols on the colors. A change applies
 * at once, except the language, which takes the next start (the game's texts are read once).
 */
export function SettingsScreen({ settings, colors, onChange, onClose }) {
  return (
    <Sheet title={words.settings} colors={colors} onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 22 }}>
        <Group title={words.theme} colors={colors}>
          {THEME_IDS.map((id) => (
            <Choice
              key={id}
              label={words.themeNames[id]}
              chosen={settings.theme === id}
              colors={colors}
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
          <Text style={{ color: colors.muted, fontSize: 13 }}>{words.languageNote}</Text>
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

function Choice({ label, chosen, colors, onPress }) {
  return (
    <Pressable
      onPress={onPress}
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
      <Text style={{ color: colors.accent, fontWeight: '800' }}>{chosen ? '✓' : ''}</Text>
    </Pressable>
  );
}

function Toggle({ label, note, value, colors, onChange }) {
  return (
    <View style={[styles.choice, { backgroundColor: colors.panel, borderColor: colors.line }]}>
      <View style={{ flex: 1, gap: 2, paddingRight: 12 }}>
        <Text style={{ color: colors.ink, fontWeight: '600', fontSize: 16 }}>{label}</Text>
        {note ? <Text style={{ color: colors.muted, fontSize: 13 }}>{note}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent }} />
    </View>
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
  }
});
