import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { words } from './appTexts.js';
import { watchRewardedAd } from './ads.js';
import { Button, Dialog } from './ui.js';

/**
 * Shown when the hints or the undos are used up: a short ad gives two more. It tells the
 * player when no ad is ready, or when the ad was left before its end.
 * @param {object} props
 * @param {'hint' | 'undo'} props.kind
 * @param {import('./theme.js').Colors} props.colors
 * @param {() => void} props.onRewarded called once the ad was watched to the end
 * @param {() => void} props.onClose
 */
export function OfferDialog({ kind, colors, onRewarded, onClose }) {
  const [status, setStatus] = useState('idle');
  const hint = kind === 'hint';
  const tube = kind === 'tube';

  async function watch() {
    if (status === 'loading') return;
    setStatus('loading');
    const result = await watchRewardedAd();
    if (result === 'rewarded') onRewarded();
    else setStatus(result);
  }

  const message = {
    idle: null,
    loading: words.adLoading,
    closed: words.adNotFinished,
    unavailable: words.adUnavailable
  }[status];

  return (
    <Dialog colors={colors} onDismiss={status === 'loading' ? undefined : onClose}>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.ink }]}>
          {tube ? words.offerTubeTitle : hint ? words.offerHintTitle : words.offerUndoTitle}
        </Text>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>
          {tube ? words.offerTubeText : hint ? words.offerHintText : words.offerUndoText}
        </Text>
        {message ? (
          <Text style={{ color: colors.accent, textAlign: 'center' }}>{message}</Text>
        ) : null}
        <View style={styles.actions}>
          <Button
            label={tube ? words.watchAdTube : hint ? words.watchAdHints : words.watchAdUndos}
            onPress={watch}
            colors={colors}
            primary
          />
          <Button label={words.notNow} onPress={onClose} colors={colors} link />
        </View>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: '800' },
  actions: { alignItems: 'center', gap: 4, marginTop: 6 }
});
