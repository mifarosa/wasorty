import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { words } from './appTexts.js';
import { CHAPTER_COLORS } from './theme.js';
import { Icon } from './Icon.js';
import { Button, Sheet, Stars, useTap } from './ui.js';

const COLUMNS = 6;
const SIDE = 16;
/** How full a solved level's tube is, by the stars it earned (0 to 3). */
const FILL_BY_STARS = [0.2, 0.38, 0.68, 1];

/**
 * The level list. It speaks the game's own language instead of a list of boxes: every level is
 * a test tube on a shelf, every chapter a rack in the color of its liquid. A solved level is
 * filled with that liquid, as high as the stars it earned, and sealed with a cap when it has all
 * three, like the tubes of the board; an open one is empty; the one being played is lifted;
 * a locked one is drawn with a dashed line and shut.
 *
 * It shows what the game hands it (see LevelMenuModel in src/app/levelMenu.js) and reports the
 * pick.
 */
export function LevelsScreen({
  model,
  colors,
  onPickLevel,
  onPickDaily,
  onLeaderboard = null,
  onClose
}) {
  const tap = useTap();
  const { width } = useWindowDimensions();
  const cell = Math.floor((width - SIDE * 2) / COLUMNS);
  const scroll = useRef(null);
  const scrolled = useRef(false);

  return (
    <Sheet title={words.levels} colors={colors} onClose={onClose}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: SIDE, gap: 22 }}>
        <DailyTicket
          daily={model.daily}
          colors={colors}
          onPress={() => {
            tap();
            onPickDaily();
          }}
        />
        {onLeaderboard ? (
          <Button label={words.leaderboard} onPress={onLeaderboard} colors={colors} />
        ) : null}
        {model.chapters.map((chapter) => (
          <View
            key={chapter.id}
            onLayout={(event) => {
              // Opens on the chapter of the level being played.
              if (scrolled.current || !chapter.levels.some((level) => level.playing)) return;
              scrolled.current = true;
              scroll.current?.scrollTo({ y: Math.max(0, event.nativeEvent.layout.y - 12) });
            }}
          >
            <Rack
              chapter={chapter}
              colors={colors}
              cell={cell}
              onPickLevel={(level) => {
                tap();
                onPickLevel(level);
              }}
            />
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

/** Today's puzzle as a ticket: a dashed outline, plain words, no fill. */
function DailyTicket({ daily, colors, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.ticket,
        {
          borderColor: daily.playing ? colors.accent : colors.line,
          borderStyle: daily.playing ? 'solid' : 'dashed'
        }
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.ticketTitle, { color: colors.ink }]}>{daily.title}</Text>
        <Text style={{ color: colors.muted }}>{daily.date}</Text>
        {daily.result ? (
          <View style={styles.ticketLine}>
            <Text style={{ color: colors.ink }}>{daily.result.text}</Text>
            <Stars count={daily.result.stars} colors={colors} size={13} />
          </View>
        ) : null}
        {daily.streak ? <Text style={{ color: colors.muted }}>{daily.streak}</Text> : null}
      </View>
      <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 16 }}>{daily.action}</Text>
    </Pressable>
  );
}

/** A chapter: its name and progress, then its levels as tubes, six to a shelf. */
function Rack({ chapter, colors, cell, onPickLevel }) {
  const color = CHAPTER_COLORS[chapter.id] ?? colors.accent;
  const rows = [];
  for (let i = 0; i < chapter.levels.length; i += COLUMNS) {
    rows.push(chapter.levels.slice(i, i + COLUMNS));
  }
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.header}>
        <View style={[styles.drop, { backgroundColor: color }]} />
        <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
          {chapter.name}
        </Text>
        <View style={styles.bars}>
          {[1, 2, 3, 4].map((bar) => (
            <View
              key={bar}
              style={{
                width: 4,
                height: 5 + bar * 3,
                borderRadius: 1,
                backgroundColor: bar <= chapter.difficulty ? color : colors.line
              }}
            />
          ))}
        </View>
        <Text style={[styles.progress, { color: colors.muted }]}>{chapter.progress}</Text>
      </View>
      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 6 }}>{chapter.detail}</Text>
      {rows.map((row, index) => (
        <View key={index} style={{ flexDirection: 'row', marginBottom: 6 }}>
          {row.map((level) => (
            <Tube
              key={level.level}
              level={level}
              color={color}
              colors={colors}
              cell={cell}
              onPress={() => onPickLevel(level.level)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/** One level: a tube standing on its piece of the shelf, with its number underneath. */
function Tube({ level, color, colors, cell, onPress }) {
  const locked = level.state === 'locked';
  const solved = level.state === 'solved';
  const playing = level.playing;
  const width = Math.round(cell * 0.56);
  const height = Math.round(cell * 1.0);
  const fill = solved ? (FILL_BY_STARS[level.stars] ?? FILL_BY_STARS[0]) : 0;
  const sealed = solved && level.stars === 3;
  const glass = locked ? colors.line : solved ? `${colors.glass}aa` : color;

  return (
    <Pressable
      disabled={locked}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={level.label}
      style={{ width: cell, alignItems: 'center' }}
    >
      <View style={{ height: height + 12, justifyContent: 'flex-end', alignItems: 'center' }}>
        {/* The lifted tube of the level being played, as on the board. */}
        <View style={{ alignItems: 'center', transform: [{ translateY: playing ? -7 : 0 }] }}>
          {sealed ? (
            <View
              style={{
                width: width + 6,
                height: 5,
                borderRadius: 2.5,
                marginBottom: -1,
                backgroundColor: color
              }}
            />
          ) : null}
          <View
            style={{
              width,
              height,
              borderWidth: 2,
              borderStyle: locked ? 'dashed' : 'solid',
              borderColor: glass,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              borderBottomLeftRadius: width / 2,
              borderBottomRightRadius: width / 2,
              overflow: 'hidden',
              justifyContent: 'flex-end',
              alignItems: 'center'
            }}
          >
            {fill > 0 ? (
              <View style={{ width: '100%', height: `${fill * 100}%`, backgroundColor: color }} />
            ) : null}
            {locked ? (
              <View style={styles.lock}>
                <Icon name="lock" size={14} color={colors.muted} />
              </View>
            ) : null}
          </View>
        </View>
      </View>
      <View style={[styles.shelf, { backgroundColor: colors.line }]} />
      <Text
        style={{
          marginTop: 4,
          fontSize: 12,
          fontWeight: playing ? '800' : '600',
          color: playing ? colors.ink : locked ? colors.muted : colors.ink,
          opacity: locked ? 0.6 : 1
        }}
      >
        {level.level}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ticket: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    gap: 12
  },
  ticketTitle: { fontSize: 18, fontWeight: '800' },
  ticketLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  drop: { width: 12, height: 12, borderRadius: 6, marginBottom: 5 },
  name: { fontSize: 20, fontWeight: '800', flexShrink: 1 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: 3 },
  progress: { marginLeft: 'auto', fontSize: 14, fontWeight: '700' },
  shelf: { height: 4, alignSelf: 'stretch' },
  lock: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
