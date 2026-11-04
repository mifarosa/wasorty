import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { words } from './appTexts.js';
import { CHAPTER_COLORS } from './theme.js';
import { Sheet, Stars } from './ui.js';

const COLUMNS = 6;
const GAP = 8;
const SIDE = 16;

/**
 * The level list: today's puzzle on top, then every level grouped by difficulty. It shows
 * what the game hands it (see LevelMenuModel in src/app/levelMenu.js) and reports the pick.
 */
export function LevelsScreen({ model, colors, onPickLevel, onPickDaily, onClose }) {
  const { width } = useWindowDimensions();
  const size = Math.floor((width - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const scroll = useRef(null);
  const scrolled = useRef(false);

  return (
    <Sheet title={words.levels} colors={colors} onClose={onClose}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: SIDE, gap: 18 }}>
        <DailyCard daily={model.daily} colors={colors} onPress={onPickDaily} />
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
            <Chapter chapter={chapter} colors={colors} size={size} onPickLevel={onPickLevel} />
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

function DailyCard({ daily, colors, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.daily,
        { backgroundColor: colors.panel, borderColor: daily.playing ? colors.accent : colors.line }
      ]}
    >
      <View style={styles.dailyText}>
        <Text style={[styles.dailyTitle, { color: colors.ink }]}>{daily.title}</Text>
        <Text style={{ color: colors.muted }}>{daily.date}</Text>
        {daily.result ? (
          <Text style={{ color: colors.ink }}>
            {daily.result.text} <Stars count={daily.result.stars} colors={colors} size={14} />
          </Text>
        ) : null}
        {daily.streak ? <Text style={{ color: colors.muted }}>{daily.streak}</Text> : null}
      </View>
      <Text style={{ color: colors.accent, fontWeight: '800' }}>{daily.action}</Text>
    </Pressable>
  );
}

function Chapter({ chapter, colors, size, onPickLevel }) {
  const color = CHAPTER_COLORS[chapter.id] ?? colors.accent;
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.chapterHeader}>
        <View style={styles.chapterTitle}>
          <Text style={[styles.chapterName, { color: colors.ink }]}>{chapter.name}</Text>
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
        <Text style={{ color: colors.muted }}>{chapter.progress}</Text>
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

function Tile({ level, color, colors, size, onPress }) {
  const locked = level.state === 'locked';
  const solved = level.state === 'solved';
  return (
    <Pressable
      disabled={locked}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={level.label}
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderColor: level.playing
            ? colors.ink
            : solved
              ? color
              : level.state === 'open'
                ? color
                : colors.line,
          backgroundColor: solved ? color : colors.panel,
          opacity: locked ? 0.45 : 1
        }
      ]}
    >
      <Text style={{ fontWeight: '800', fontSize: 16, color: solved ? '#0b1430' : colors.ink }}>
        {level.level}
      </Text>
      {locked ? <Text style={{ fontSize: 11 }}>🔒</Text> : null}
      {solved && level.stars > 0 ? (
        <Text style={{ fontSize: 8, color: '#0b1430' }}>{'★'.repeat(level.stars)}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  daily: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 2,
    padding: 16,
    gap: 12
  },
  dailyText: { flex: 1, gap: 2 },
  dailyTitle: { fontSize: 18, fontWeight: '800' },
  chapterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  chapterTitle: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  chapterName: { fontSize: 18, fontWeight: '800' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 4, borderRadius: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginTop: 4 },
  tile: { borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }
});
