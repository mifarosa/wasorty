import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { texts } from '../../src/app/texts.js';
import { words } from './appTexts.js';
import { AppleAuthentication } from './cloud/providers.js';
import { Icon } from './Icon.js';
import { useTap } from './ui.js';

/**
 * The account in the settings: sign in with Apple or Google, pick a username, see how the sync
 * goes, sign out, delete the account. It shows what it is given (the state of the account and
 * of the sync) and reports what the player does.
 *
 * @param {object} props
 * @param {import('../../src/cloud/account.js').AccountState} props.account
 * @param {import('../../src/cloud/cloudSync.js').SyncStatus} props.sync
 * @param {string | null} props.message what to tell the player, e.g. about a taken name
 * @param {{ apple: boolean, google: boolean }} props.available which sign-ins this phone has
 * @param {import('./theme.js').Colors} props.colors
 * @param {boolean} props.dark whether Apple's button is drawn for a dark screen
 * @param {{ onSignIn: (provider: 'apple' | 'google') => void, onSignOut: () => void,
 *   onDelete: () => void, onSaveName: (name: string) => void, onRetry: () => void }} props.actions
 */
export function AccountSection({ account, sync, message, available, colors, dark, actions }) {
  const tap = useTap();
  const [name, setName] = useState('');
  const signedIn = account.user !== null;
  const busy = account.status === 'signingIn';
  const error =
    message ?? (account.error ? `${texts.accountError(account.error)} (${account.error})` : '');

  const card = [styles.card, { backgroundColor: colors.panel, borderColor: colors.line }];
  return (
    <View style={card}>
      {!signedIn ? (
        <>
          <Text style={{ color: colors.muted }}>{texts.accountSignedOut}</Text>
          {available.apple && AppleAuthentication ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={
                dark
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={14}
              style={[styles.apple, busy && { opacity: 0.5 }]}
              onPress={() => {
                if (!busy) actions.onSignIn('apple');
              }}
            />
          ) : null}
          {available.google ? (
            <Pressable
              disabled={busy}
              onPress={() => {
                tap();
                actions.onSignIn('google');
              }}
              accessibilityRole="button"
              style={[styles.google, { borderColor: colors.line, opacity: busy ? 0.5 : 1 }]}
            >
              <Icon name="google" size={20} color={colors.ink} />
              <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>
                {words.continueGoogle}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
          <Text style={[styles.who, { color: colors.ink }]}>
            {account.username
              ? texts.accountSignedInAs(`@${account.username}`)
              : account.user.name
                ? texts.accountSignedInAs(account.user.name)
                : texts.accountSignedIn}
          </Text>

          {account.status === 'needsName' ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.muted }}>{texts.accountNeedsName}</Text>
              <View style={styles.nameRow}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={words.usernamePlaceholder}
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  style={[styles.input, { color: colors.ink, borderColor: colors.line }]}
                />
                <Pressable
                  onPress={() => {
                    tap();
                    actions.onSaveName(name);
                  }}
                  accessibilityRole="button"
                  style={[styles.save, { backgroundColor: colors.accent }]}
                >
                  <Text style={{ color: colors.accentInk, fontWeight: '800' }}>
                    {words.saveName}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={sync === 'failed' ? actions.onRetry : undefined}>
              <Text style={{ color: sync === 'failed' ? colors.accent : colors.muted }}>
                {texts.accountSyncStatus(sync)}
              </Text>
            </Pressable>
          )}

          <View style={styles.row}>
            <Pressable
              onPress={() => {
                tap();
                actions.onSignOut();
              }}
              accessibilityRole="button"
              style={[styles.small, { borderColor: colors.line }]}
            >
              <Text style={{ color: colors.ink, fontWeight: '700' }}>{words.signOut}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                tap();
                Alert.alert(words.deleteAccount, texts.accountDeleteConfirm, [
                  { text: words.cancel, style: 'cancel' },
                  { text: words.deleteAction, style: 'destructive', onPress: actions.onDelete }
                ]);
              }}
              accessibilityRole="button"
              style={styles.small}
            >
              <Text style={{ color: '#ef4444', fontWeight: '700' }}>{words.deleteAccount}</Text>
            </Pressable>
          </View>
        </>
      )}
      {error ? <Text style={{ color: '#ef4444' }}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 2, padding: 16, gap: 12 },
  apple: { height: 46, width: '100%' },
  google: {
    height: 46,
    borderRadius: 14,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  who: { fontSize: 18, fontWeight: '800' },
  nameRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 12,
    fontSize: 16
  },
  save: { borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  small: { borderRadius: 20, borderWidth: 0, paddingHorizontal: 14, paddingVertical: 8 }
});
