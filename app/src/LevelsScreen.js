import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { words } from './appTexts.js';
import { CHAPTER_COLORS } from './theme.js';
import { Icon } from './Icon.js';
import { Button, Gloss, Sheet, Stars, glow, useTap } from './ui.js';

const COLUMNS = 6;
const GAP = 8;
const SIDE = 16;
/** Text and icons on a tile or a badge filled with a chapter's color. */
const ON_COLOR = '#0b1430';

/** An icon for each chapter, from the Material Community set. */
const CHAPTER_ICONS = {
  easy: 'sprout',
  oneWay: 'arrow-up-bold',
  tall: 'arrow-expand-vertical',
  hidden: 'help-circle-outline',
  cracked: 'hammer',
  locked: 'lock-outline',
  half: 'circle-half-full',
  oil: 'water',
  master: 'crown'
};

/**
 * The level list: today's puzzle on top, then every level grouped by difficulty, each chapter
 * in its own color. It shows what the game hands it (see LevelMenuModel in
 * src/app/levelMenu.js) and reports the pick.
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
  // The tiles sit inside a chapter's card, which has a margin and a left edge of its own.
  const size = Math.floor(
    (width - SIDE * 2 - CARD_PADDING * 2 - 8 - GAP * (COLUMNS - 1)) / COLUMNS
  );
  const scroll = useRef(null);
  const scrolled = useRef(false);

  return (
    <Sheet title={words.levels} colors={colors} onClose={onClose}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: SIDE, gap: 16 }}>
        <DailyCard
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
            <Chapter
              chapter={chapter}
              colors={colors}
              size={size}
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

const CARD_PADDING = 14;

/** Today's puzzle: the one card filled with the accent color, with a glow of its own. */
function DailyCard({ daily, colors, onPress }) {
  const ink = colors.accentInk;
  const onAccent = { ...colors, star: ink, starOff: `${ink}55` };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.daily,
        {
          backgroundColor: colors.accent,
          borderColor: daily.playing ? colors.ink : colors.accent
        },
        glow(colors.accent),
        pressed && { transform: [{ scale: 0.98 }] }
      ]}
    >
      <Gloss radius={16} />
      <View style={[styles.badge, { backgroundColor: ink }]}>
        <Icon name="calendar-today" size={26} color={colors.accent} />
      </View>
      <View style={styles.dailyText}>
        <Text style={[styles.dailyTitle, { color: ink }]}>{daily.title}</Text>
        <Text style={{ color: ink, opacity: 0.8 }}>{daily.date}</Text>
        {daily.result ? (
          <View style={styles.dailyLine}>
            <Text style={{ color: ink, fontWeight: '700' }}>{daily.result.text}</Text>
            <Stars count={daily.result.stars} colors={onAccent} size={14} />
          </View>
        ) : null}
        {daily.streak ? (
          <View style={styles.dailyLine}>
            <Icon name="fire" size={16} color={ink} />
            <Text style={{ color: ink, fontWeight: '700' }}>{daily.streak}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.pill, { backgroundColor: ink }]}>
        <Text style={{ color: colors.accent, fontWeight: '800' }}>{daily.action}</Text>
      </View>
    </Pressable>
  );
}

/** A chapter: a card tinted in its color, with its icon, its progress and its levels. */
function Chapter({ chapter, colors, size, onPickLevel }) {
  const color = CHAPTER_COLORS[chapter.id] ?? colors.accent;
  const solved = chapter.levels.filter((level) => level.state === 'solved').length;
  const total = chapter.levels.length;
  return (
    <View
      style={[
        styles.chapter,
        { backgroundColor: colors.panel, borderColor: `${color}66`, borderLeftColor: color }
      ]}
    >
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: `${color}14`, borderRadius: 16 }]}
      />
      <View style={styles.chapterHeader}>
        <View style={[styles.badge, { backgroundColor: color }, glow(color, 0.6)]}>
          <Icon name={CHAPTER_ICONS[chapter.id] ?? 'star'} size={24} color={ON_COLOR} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.chapterTitle}>
            <Text style={[styles.chapterName, { color: colors.ink }]} numberOfLines={1}>
              {chapter.name}
            </Text>
            <View style={styles.bars}>
              {[1, 2, 3, 4].map((bar) => (
                <View
                  key={bar}
                  style={[
                    styles.bar,
                    {
                      height: 5 + bar * 3,
                      backgroundColor: bar <= chapter.difficulty ? color : colors.line
                    }
                  ]}
                />
              ))}
            </View>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { backgroundColor: color, width: `${total === 0 ? 0 : (solved / total) * 100}%` }
              ]}
            />
          </View>
        </View>
        <Text style={{ color, fontWeight: '800' }}>{chapter.progress}</Text>
      </View>
      <Text style={{ color: colors.muted, fontSize: 13 }}>{chapter.detail}</Text>
      <View style={styles.grid}>
        {chapter.levels.map((level) => (
          <Tile
            key={level.level}
            level={level}
            color={color}
            colors={colors}
            size={size}
            onPress={() => onPickLevel(level.level)}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * A level: solved ones are filled with the chapter's color, open ones tinted and lit, the one
 * being played stands out with a glow, locked ones are grey and shut.
 */
function Tile({ level, color, colors, size, onPress }) {
  const locked = level.state === 'locked';
  const solved = level.state === 'solved';
  return (
    <Pressable
      disabled={locked}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={level.label}
      style={({ pressed }) => [
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: solved ? color : colors.panel,
          borderColor: level.playing ? colors.ink : locked ? colors.line : color,
          borderWidth: level.playing ? 3 : 2,
          opacity: locked ? 0.5 : 1
        },
        !locked && glow(color, level.playing ? 1 : 0.4),
        level.playing && { transform: [{ scale: 1.08 }], zIndex: 2 },
        pressed && { transform: [{ scale: 0.94 }] }
      ]}
    >
      {!solved && !locked ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: `${color}33`, borderRadius: 9 }]}
        />
      ) : null}
      {!locked ? <Gloss radius={8} /> : null}
      <Text style={{ fontWeight: '800', fontSize: 16, color: solved ? ON_COLOR : colors.ink }}>
        {level.level}
      </Text>
      {locked ? <Icon name="lock" size={13} color={colors.muted} /> : null}
      {solved && level.stars > 0 ? (
        <View style={{ flexDirection: 'row' }}>
          {Array.from({ length: level.stars }, (_, index) => (
            <Icon key={index} name="star" size={9} color={ON_COLOR} />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  daily: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 3,
    padding: 16,
    gap: 12
  },
  dailyText: { flex: 1, gap: 2 },
  dailyTitle: { fontSize: 18, fontWeight: '800' },
  dailyLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chapter: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 6,
    padding: CARD_PADDING,
    gap: 8
  },
  chapterHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chapterTitle: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  chapterName: { fontSize: 18, fontWeight: '800', flexShrink: 1 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 4, borderRadius: 1 },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(127,127,127,0.25)' },
  fill: { height: 6, borderRadius: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginTop: 2 },
  tile: { borderRadius: 11, alignItems: 'center', justifyContent: 'center' }
});
