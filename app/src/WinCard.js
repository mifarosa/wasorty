import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { texts } from '../../src/app/texts.js';
import { caps } from './caps.js';
import { words } from './appTexts.js';
import { Button, Dialog, Stars } from './ui.js';

/**
 * The result of a solved puzzle: stars, moves against the fewest, what it opened or earned,
 * the last solutions, and what to do next (see Hud.showWin in src/app/hud.js for the data).
 */
export function WinCard({ win, colors, actions }) {
  // 'idle' | 'loading' | 'done' (hints were added) | 'closed' | 'unavailable'
  const [ad, setAd] = useState('idle');

  async function watchAd() {
    if (ad === 'loading') return;
    setAd('loading');
    const result = await actions.onWatchAd();
    setAd(result === 'rewarded' ? 'done' : result);
  }

  const adLabel = { loading: words.adLoading, done: words.hintsAdded }[ad] ?? words.watchAdHints;
  const adNote = { closed: words.adNotFinished, unavailable: words.adUnavailable }[ad];

  return (
    <Dialog colors={colors}>
      <ScrollView contentContainerStyle={styles.body}>
        <Stars count={win.stars} colors={colors} size={42} />
        <Text style={[styles.title, { color: colors.ink }]}>{win.title}</Text>
        <Text style={{ color: colors.muted }}>
          {texts.yourMoves}: {win.moves} · {win.fewestLabel}: {win.fewest}
        </Text>

        {win.notes.map((note) => (
          <Text key={note} style={[styles.note, { color: colors.ink, borderColor: colors.line }]}>
            {note}
          </Text>
        ))}

        {win.attempts && win.attempts.length > 0 ? (
          <View style={styles.attempts}>
            <Text style={[styles.heading, { color: colors.accent }]}>
              {caps(texts.attemptsTitle)}
            </Text>
            {win.attempts.map((attempt, index) => (
              <View key={index} style={styles.attempt}>
                <Stars count={attempt.stars} colors={colors} size={13} />
                <Text style={{ color: colors.muted }}>{texts.attemptMoves(attempt.moves)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button label={texts.replay} onPress={actions.onReplay} colors={colors} />
          <Button label={win.continueLabel} onPress={actions.onContinue} colors={colors} primary />
        </View>
        {win.leaderboard ? (
          <Button label={words.leaderboard} onPress={actions.onLeaderboard} colors={colors} />
        ) : null}
        <Button label={adLabel} onPress={watchAd} colors={colors} />
        {adNote ? <Text style={{ color: colors.muted, textAlign: 'center' }}>{adNote}</Text> : null}
        <View style={styles.actions}>
          {win.watch ? (
            <Button label={texts.watchSolution} onPress={actions.onWatch} colors={colors} link />
          ) : null}
          {win.shareText ? (
            <Button
              label={texts.shareResult}
              onPress={() => actions.onShare(win.shareText)}
              colors={colors}
              link
            />
          ) : null}
          <Button label={words.levels} onPress={actions.onLevels} colors={colors} link />
        </View>
      </ScrollView>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: 10 },
  title: { fontSize: 28, fontWeight: '800' },
  note: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center'
  },
  heading: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6 },
  attempts: { alignSelf: 'stretch', gap: 4, alignItems: 'center', marginTop: 4 },
  attempt: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }
});
