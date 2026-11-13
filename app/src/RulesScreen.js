import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { texts } from '../../src/app/texts.js';
import { caps } from './caps.js';
import { Button, Dialog, Stars } from './ui.js';

/**
 * The rules a level brings in, or from the info button everything about the level: its rules,
 * what each star takes, the undos and hints left, and the last solutions (see RulesModel in
 * src/app/rulesDialog.js). The sample tubes of the website's dialog are left out.
 */
export function RulesScreen({ model, colors, onClose }) {
  return (
    <Dialog colors={colors} onDismiss={onClose}>
      <Text style={[styles.title, { color: colors.ink }]}>{model.title}</Text>
      <ScrollView style={styles.scroll} contentContainerStyle={{ gap: 14 }}>
        <Section heading={texts.rulesHeading} colors={colors}>
          {model.rules.map((rule) => (
            <View key={rule.id} style={{ gap: 2 }}>
              <Text style={[styles.ruleName, { color: colors.ink }]}>{rule.name}</Text>
              <Text style={{ color: colors.muted }}>{rule.text}</Text>
            </View>
          ))}
        </Section>

        {model.info ? (
          <Section heading={texts.starsHeading} colors={colors}>
            {model.stars ? (
              model.stars.map((row) => (
                <View key={row.stars} style={styles.row}>
                  <Stars count={row.stars} colors={colors} size={14} />
                  <Text style={{ color: colors.muted, flex: 1 }}>{row.text}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: colors.muted }}>{model.starsPending}</Text>
            )}
          </Section>
        ) : null}

        {model.info && model.supplies?.length ? (
          <Section heading={texts.suppliesHeading} colors={colors}>
            {model.supplies.map((line) => (
              <Text key={line} style={{ color: colors.muted }}>
                {line}
              </Text>
            ))}
          </Section>
        ) : null}

        {model.info && model.attempts ? (
          <Section heading={texts.attemptsTitle} colors={colors}>
            {model.attempts.length === 0 ? (
              <Text style={{ color: colors.muted }}>{texts.noAttempts}</Text>
            ) : (
              model.attempts.map((attempt, index) => (
                <View key={index} style={styles.row}>
                  <Stars count={attempt.stars} colors={colors} size={14} />
                  <Text style={{ color: colors.muted }}>{texts.attemptMoves(attempt.moves)}</Text>
                </View>
              ))
            )}
          </Section>
        ) : null}
      </ScrollView>
      <View style={styles.actions}>
        <Button label={model.action} onPress={onClose} colors={colors} primary />
      </View>
    </Dialog>
  );
}

function Section({ heading, colors, children }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.heading, { color: colors.accent }]}>{caps(heading)}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  scroll: { flexGrow: 0 },
  heading: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6 },
  ruleName: { fontWeight: '800', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: { alignItems: 'center', marginTop: 14 }
});
