import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DailyBoard } from '../src/app/dailyBoard.js';
import { GameController } from '../src/app/controller.js';
import { loadDailyRecord, saveDailyRecord } from '../src/app/dailyResults.js';
import { getLanguage } from '../src/app/i18n.js';
import { loadProgress, saveProgress } from '../src/app/progress.js';
import { loadSettings, saveSettings } from '../src/app/settings.js';
import { fewestMovesOfPuzzle, solutionOfPuzzle } from '../src/game/puzzleFewest.js';
import { LevelsScreen } from './src/LevelsScreen.js';
import { NativeBoard } from './src/NativeBoard.js';
import { NativeHud } from './src/NativeHud.js';
import { NativeMenu, NativeRules } from './src/NativeDialogs.js';
import { RulesScreen } from './src/RulesScreen.js';
import { SettingsScreen } from './src/SettingsScreen.js';
import { WinCard } from './src/WinCard.js';
import { words } from './src/appTexts.js';
import { deviceLocale } from './src/deviceLocale.js';
import { createFeedback } from './src/feedback.js';
import { chooseLanguage } from './src/language.js';
import { storage } from './src/storage.js';
import { colorsOf, lookOf } from './src/theme.js';

// The phone's language, unless the player picked one: set before anything is drawn.
chooseLanguage(storage, deviceLocale());

const LETTERS = [
  ['W', '#ef4444'],
  ['a', '#fb923c'],
  ['s', '#fde047'],
  ['o', '#22c55e'],
  ['r', '#38bdf8'],
  ['t', '#6366f1'],
  ['y', '#d946ef']
];

/** Works out something heavy after the screen has had a moment to draw. */
const later = (work) => new Promise((resolve) => setTimeout(() => resolve(work()), 30));

export default function App() {
  const hud = useMemo(() => new NativeHud(), []);
  const menu = useMemo(() => new NativeMenu(), []);
  const rules = useMemo(() => new NativeRules(), []);
  const controller = useRef(null);
  const scene = useRef(null);

  const [state, setState] = useState(hud.state);
  const [menuModel, setMenuModel] = useState(null);
  const [rulesModel, setRulesModel] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // The language the game runs in is the one it started with; the setting shows the pick.
  const [settings, setSettings] = useState(() => ({
    ...loadSettings(storage),
    language: getLanguage()
  }));
  useEffect(() => hud.subscribe(setState), [hud]);
  useEffect(() => menu.subscribe(setMenuModel), [menu]);
  useEffect(() => rules.subscribe(setRulesModel), [rules]);

  const scheme = useColorScheme();
  const colors = colorsOf(settings.theme, scheme);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // What the game's callbacks read: always the latest settings and look.
  const latest = useRef({ settings, scheme });
  latest.current = { settings, scheme };
  const feedback = useMemo(() => createFeedback(() => latest.current.settings.haptics), []);
  const dailyBoard = useMemo(
    () =>
      new DailyBoard({
        record: loadDailyRecord(storage),
        save: (record) => saveDailyRecord(record, storage),
        service: null
      }),
    []
  );

  useEffect(() => {
    scene.current?.setLook(lookOf(settings.theme, scheme, settings.symbols));
  }, [settings.theme, settings.symbols, scheme]);

  const changeSettings = useCallback((change) => {
    setSettings((current) => {
      const next = { ...current, ...change };
      saveSettings(next, storage);
      return next;
    });
  }, []);

  // The board reports back once it has a size; the game starts then.
  const onScene = useCallback(
    (board) => {
      scene.current = board;
      const { settings: current, scheme: system } = latest.current;
      board.setLook(lookOf(current.theme, system, current.symbols));
      const game = new GameController({
        scene: board,
        hud,
        menu,
        rules,
        feedback,
        findFewestMoves: (puzzle) => later(() => fewestMovesOfPuzzle(puzzle)),
        findSolution: (puzzle) => later(() => solutionOfPuzzle(puzzle)),
        onDailySolved: (day, result) => dailyBoard.record(day, result),
        getDailySummary: (today) => dailyBoard.summary(today),
        leaderboardOnline: false,
        progress: loadProgress(storage),
        saveProgress: (progress) => saveProgress(progress, storage)
      });
      board.onTubeTap((index) => game.tapTube(index));
      controller.current = game;
      game.start();
    },
    [hud, menu, rules, feedback, dailyBoard]
  );

  const share = useCallback(async (message) => {
    try {
      await Share.share({ message });
    } catch {
      // A closed share sheet is not an error.
    }
  }, []);

  const game = () => controller.current;
  const { view, toast, win } = state;
  return (
    <SafeAreaProvider>
      <StatusBar style={colors.bar} />
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.brand}>
              {LETTERS.map(([letter, color]) => (
                <Text key={letter + color} style={{ color }}>
                  {letter}
                </Text>
              ))}
            </Text>
            <Text style={styles.title}>{view?.title ?? ''}</Text>
            <Text style={styles.subtitle}>{view?.subtitle ?? ''}</Text>
          </View>
          <RoundButton
            label="ⓘ"
            a11y={words.info}
            styles={styles}
            onPress={() => game()?.showInfo()}
          />
          <RoundButton
            label="⚙"
            a11y={words.settings}
            styles={styles}
            onPress={() => setSettingsOpen(true)}
          />
        </View>

        <NativeBoard onScene={onScene} />

        <View style={styles.toolbar}>
          <ToolButton
            label={words.undo}
            count={view?.undoCount}
            disabled={!view?.canUndo}
            styles={styles}
            onPress={() => game()?.undo()}
          />
          <ToolButton
            label={words.hint}
            count={view?.hintCount}
            styles={styles}
            onPress={() => game()?.showHint()}
          />
          <ToolButton label={words.restart} styles={styles} onPress={() => game()?.restart()} />
          <ToolButton
            label={view?.levelsLabel ?? words.levels}
            styles={styles}
            onPress={() => game()?.showLevels()}
          />
        </View>

        {toast ? (
          <View style={styles.toast} pointerEvents="none">
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}

        {win ? (
          <WinCard
            win={win}
            colors={colors}
            actions={{
              onReplay: () => game()?.replay(),
              onContinue: () => game()?.continueAfterWin(),
              onWatch: () => game()?.watchSolution(),
              onLevels: () => game()?.continueToLevels(),
              onShare: share
            }}
          />
        ) : null}

        {rulesModel ? (
          <RulesScreen model={rulesModel} colors={colors} onClose={() => game()?.closeRules()} />
        ) : null}

        {menuModel ? (
          <LevelsScreen
            model={menuModel}
            colors={colors}
            onPickLevel={(level) => game()?.playLevel(level)}
            onPickDaily={() => game()?.playDaily()}
            onClose={() => game()?.closeLevels()}
          />
        ) : null}

        {settingsOpen ? (
          <SettingsScreen
            settings={settings}
            colors={colors}
            onChange={changeSettings}
            onClose={() => setSettingsOpen(false)}
          />
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function RoundButton({ label, a11y, styles, onPress }) {
  return (
    <Pressable
      style={styles.round}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <Text style={styles.roundText}>{label}</Text>
    </Pressable>
  );
}

function ToolButton({ label, count, disabled = false, styles, onPress }) {
  return (
    <Pressable
      style={[styles.tool, disabled && styles.toolDisabled]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={styles.toolText} numberOfLines={1}>
        {label}
      </Text>
      {count !== undefined && count !== null ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgBottom },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 6
    },
    headerText: { flex: 1 },
    brand: { fontSize: 14, fontWeight: '800', letterSpacing: 0.6 },
    title: { color: colors.ink, fontSize: 24, fontWeight: '800' },
    subtitle: { color: colors.muted, fontSize: 13 },
    round: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.panel,
      alignItems: 'center',
      justifyContent: 'center'
    },
    roundText: { color: colors.ink, fontSize: 20 },
    toolbar: { flexDirection: 'row', justifyContent: 'center', gap: 8, padding: 14 },
    tool: {
      flex: 1,
      maxWidth: 110,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 16,
      backgroundColor: colors.panel,
      alignItems: 'center'
    },
    toolDisabled: { opacity: 0.4 },
    toolText: { color: colors.ink, fontWeight: '700' },
    badge: {
      position: 'absolute',
      top: -8,
      right: -6,
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center'
    },
    badgeText: { color: colors.accentInk, fontWeight: '800', fontSize: 12 },
    toast: { position: 'absolute', left: 20, right: 20, bottom: 96, alignItems: 'center' },
    toastText: {
      color: colors.ink,
      backgroundColor: colors.panel,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      overflow: 'hidden',
      textAlign: 'center'
    }
  });
}
