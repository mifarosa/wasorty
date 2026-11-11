import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { texts } from '../../src/app/texts.js';
import { words } from './appTexts.js';
import { Button, Sheet, Stars } from './ui.js';

/**
 * The daily leaderboard: how the player did today and their streak, then the best players of
 * the day, or the player's own recent days when scores are not shared. A player without a
 * username is asked to sign in or pick one, since scores go under a username.
 *
 * @param {object} props
 * @param {Awaited<ReturnType<import('../../src/app/dailyBoard.js').DailyBoard['view']>> | null} props.view
 *   null while the scores load
 * @param {{ signedIn: boolean, username: string | null }} props.account
 */
export function LeaderboardScreen({ view, account, colors, onSignIn, onPlayDaily, onClose }) {
  return (
    <Sheet title={words.leaderboard} colors={colors} onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18 }}>
        {view === null ? (
          <Text style={{ color: colors.muted }}>{texts.leaderboardLoading}</Text>
        ) : (
          <Content
            view={view}
            account={account}
            colors={colors}
            onSignIn={onSignIn}
            onPlayDaily={onPlayDaily}
          />
        )}
      </ScrollView>
    </Sheet>
  );
}

function Content({ view, account, colors, onSignIn, onPlayDaily }) {
  const { online, today, streak, history, top, rank, failed, shareError } = view;
  const { signedIn, username } = account;
  return (
    <>
      <Block colors={colors}>
        {today ? (
          <>
            <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>
              {texts.dailyToday(today.moves, today.seconds, today.score)}
            </Text>
            <Stars count={today.stars} colors={colors} size={20} />
          </>
        ) : (
          <>
            <Text style={{ color: colors.muted }}>{texts.dailyNotSolved}</Text>
            <Button label={texts.playDaily} onPress={onPlayDaily} colors={colors} primary />
          </>
        )}
        {streak > 0 ? (
          <Text style={{ color: colors.muted }}>{texts.dailyStreak(streak)}</Text>
        ) : null}
      </Block>

      {online ? (
        <>
          {!username ? (
            <Block colors={colors}>
              <Text style={{ color: colors.muted }}>
                {signedIn ? texts.leaderboardNeedsName : words.leaderboardSignInPrompt}
              </Text>
              <Button
                label={signedIn ? texts.pickUsername : texts.signInToRank}
                onPress={onSignIn}
                colors={colors}
                primary
              />
            </Block>
          ) : today && !today.shared && today.score !== undefined ? (
            <Text style={{ color: colors.muted }}>
              {texts.leaderboardSending}
              {shareError ? ` (${shareError})` : ''}
            </Text>
          ) : null}

          <Heading colors={colors}>{texts.leaderboardTop}</Heading>
          {failed ? (
            <Text style={{ color: colors.muted }}>{texts.leaderboardFailed}</Text>
          ) : top.length === 0 ? (
            <Text style={{ color: colors.muted }}>{texts.leaderboardEmpty}</Text>
          ) : (
            <>
              {rank !== null ? (
                <Text style={{ color: colors.accent, fontWeight: '800' }}>
                  {texts.leaderboardMyRank(rank)}
                </Text>
              ) : null}
              {top.map((score, index) => (
                <Row
                  key={`${score.name}-${index}`}
                  place={index + 1}
                  label={score.name}
                  score={score}
                  mine={
                    Boolean(today) &&
                    username !== null &&
                    score.name === username &&
                    score.moves === today.moves &&
                    score.seconds === Math.min(today.seconds, 86400)
                  }
                  colors={colors}
                />
              ))}
              <Text style={{ color: colors.muted, fontSize: 13 }}>{texts.leaderboardHow}</Text>
            </>
          )}
        </>
      ) : (
        <>
          <Heading colors={colors}>{texts.dailyHistory}</Heading>
          {history.length === 0 ? (
            <Text style={{ color: colors.muted }}>{texts.dailyNoHistory}</Text>
          ) : (
            history.map((result) => (
              <Row
                key={result.day}
                label={texts.dailyDate(result.day)}
                score={result}
                colors={colors}
              />
            ))
          )}
          <Text style={{ color: colors.muted, fontSize: 13 }}>{texts.leaderboardLocalOnly}</Text>
        </>
      )}
    </>
  );
}

/** A line of the list: on the day's ranking the points close it, on the player's own days the stars. */
function Row({ place = null, label, score, mine = false, colors }) {
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.panel, borderColor: mine ? colors.accent : colors.line }
      ]}
    >
      {place !== null ? (
        <Text style={[styles.place, { color: colors.accent }]}>{place}</Text>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.ink, fontWeight: '800' }} numberOfLines={1}>
          {label}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {texts.attemptMoves(score.moves)} · {texts.duration(score.seconds)}
        </Text>
      </View>
      {place !== null ? (
        <Text style={{ color: colors.ink, fontWeight: '800' }}>{texts.points(score.score)}</Text>
      ) : (
        <Stars count={score.stars} colors={colors} size={14} />
      )}
    </View>
  );
}

function Block({ colors, children }) {
  return (
    <View style={[styles.block, { backgroundColor: colors.panel, borderColor: colors.line }]}>
      {children}
    </View>
  );
}

function Heading({ colors, children }) {
  return <Text style={[styles.heading, { color: colors.accent }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  block: { borderRadius: 14, borderWidth: 2, padding: 16, gap: 10, alignItems: 'flex-start' },
  heading: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  place: { width: 28, fontSize: 18, fontWeight: '800' }
});
