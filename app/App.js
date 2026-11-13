import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, Share, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DailyBoard } from '../src/app/dailyBoard.js';
import { GameController } from '../src/app/controller.js';
import { loadDailyRecord, saveDailyRecord } from '../src/app/dailyResults.js';
import { getLanguage, setLanguage } from '../src/app/i18n.js';
import { INITIAL_PROGRESS, loadProgress, saveProgress } from '../src/app/progress.js';
import { loadSettings, saveSettings } from '../src/app/settings.js';
import { texts } from '../src/app/texts.js';
import { fewestMovesOfPuzzle, solutionOfPuzzle } from '../src/game/puzzleFewest.js';
import { confettiColors } from '../src/scene/palette.js';
import { LeaderboardScreen } from './src/LeaderboardScreen.js';
import { LevelsScreen } from './src/LevelsScreen.js';
import { NativeBoard } from './src/NativeBoard.js';
import { NativeConfetti } from './src/NativeConfetti.js';
import { Icon, useIconFonts } from './src/Icon.js';
import { OfferDialog } from './src/OfferDialog.js';
import { NativeHud } from './src/NativeHud.js';
import { NativeMenu, NativeRules } from './src/NativeDialogs.js';
import { RulesScreen } from './src/RulesScreen.js';
import { SettingsScreen } from './src/SettingsScreen.js';
import { Splash } from './src/Splash.js';
import { Gloss, TapContext, glow } from './src/ui.js';
import { WinCard } from './src/WinCard.js';
import { startAds, watchRewardedAd } from './src/ads.js';
import { createCloud, createNativeDailyStore } from './src/cloud/index.js';
import { words } from './src/appTexts.js';
import { LETTERS } from './src/brand.js';
import { deviceLocale } from './src/deviceLocale.js';
import { createFeedback } from './src/feedback.js';
import { createSound } from './src/sound.js';
import { previewLevelsOf } from './src/previewLevels.js';
import { loadSoundSdk } from './src/soundSdk.js';
import { chooseLanguage } from './src/language.js';
import { storage } from './src/storage.js';
import { colorsOf, lookOf, paletteOf } from './src/theme.js';

// The phone's language, unless the player picked one: set before anything is drawn.
chooseLanguage(storage, deviceLocale());

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
  const [splash, setSplash] = useState(true);
  // The account, how the sync goes, what to tell about a username, and which sign-ins exist.
  const [accountState, setAccountState] = useState(null);
  const [sync, setSync] = useState('idle');
  const [accountMessage, setAccountMessage] = useState(null);
  const [available, setAvailable] = useState({ apple: false, google: false });
  // null while closed; `view` is null while the scores load
  const [leaderboard, setLeaderboard] = useState(null);
  // Each win bumps this, which sends the confetti up.
  const [burst, setBurst] = useState(0);
  // The language the game runs in is the one it started with; the setting shows the pick.
  const [settings, setSettings] = useState(() => ({
    ...loadSettings(storage),
    language: getLanguage()
  }));
  useEffect(() => hud.subscribe(setState), [hud]);
  useEffect(() => menu.subscribe(setMenuModel), [menu]);
  useEffect(() => rules.subscribe(setRulesModel), [rules]);

  // The icons draw once their font is there; the splash covers that moment.
  useIconFonts();

  const scheme = useColorScheme();
  const colors = colorsOf(settings.theme, scheme);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // What the game's callbacks read: always the latest settings and look.
  const latest = useRef({ settings, scheme });
  latest.current = { settings, scheme };
  const sound = useMemo(
    () =>
      createSound({
        load: loadSoundSdk,
        soundOn: () => latest.current.settings.sound,
        musicOn: () => latest.current.settings.music
      }),
    []
  );
  const feedback = useMemo(
    () =>
      createFeedback(() => latest.current.settings.haptics, {
        onWin: () => setBurst((count) => count + 1),
        sound
      }),
    [sound]
  );
  const confetti = useMemo(() => confettiColors(paletteOf(settings.theme)), [settings.theme]);
  // The sync is made after the daily board and the game, which it reads; they reach it here.
  const cloudRef = useRef(null);
  const dailyBoard = useMemo(
    () =>
      new DailyBoard({
        record: loadDailyRecord(storage),
        save: (record) => {
          saveDailyRecord(record, storage);
          cloudRef.current?.cloudSync.schedule();
        },
        service: createNativeDailyStore()
      }),
    []
  );
  const cloud = useMemo(() => {
    const made = createCloud({
      storage,
      getLocal: () => ({
        progress: controller.current?.progress() ?? INITIAL_PROGRESS,
        daily: dailyBoard.results()
      }),
      apply: ({ progress, daily }) => {
        dailyBoard.mergeResults(daily);
        controller.current?.applyProgress(progress);
      }
    });
    cloudRef.current = made;
    return made;
  }, [dailyBoard]);

  useEffect(() => {
    setAccountState(cloud.account.state);
    const stopAccount = cloud.account.onChange((next) => {
      setAccountState(next);
      // The username is the name on the leaderboard; what waited for one is shared now.
      if (next.status === 'ready' && next.username) dailyBoard.setName(next.username, new Date());
    });
    const stopSync = cloud.cloudSync.onStatus(setSync);
    // An earlier session is picked up once the board has been drawn.
    const timer = setTimeout(() => cloud.account.restore().catch(() => {}), 1500);
    const { apple, google } = cloud.providers;
    Promise.all([apple?.available(), google?.available()])
      .then(([hasApple, hasGoogle]) => setAvailable({ apple: !!hasApple, google: !!hasGoogle }))
      .catch(() => {});
    return () => {
      stopAccount();
      stopSync();
      clearTimeout(timer);
    };
  }, [cloud, dailyBoard]);

  const accountActions = useMemo(
    () => ({
      onSignIn: (provider) => {
        setAccountMessage(null);
        cloud.account.signIn(provider);
      },
      onSignOut: () => cloud.account.signOut().catch(() => {}),
      onDelete: async () => {
        await cloud.account.deleteAccount();
      },
      onSaveName: async (name) => {
        const result = await cloud.account.claimUsername(name);
        setAccountMessage(
          result === 'ok'
            ? null
            : {
                invalid: texts.usernameInvalid,
                taken: texts.usernameTaken,
                failed: texts.usernameFailed
              }[result]
        );
      },
      onRetry: () => {
        if (cloud.cloudSync.status === 'failed') cloud.cloudSync.syncNow();
      }
    }),
    [cloud]
  );

  useEffect(() => {
    scene.current?.setLook(lookOf(settings.theme, scheme, settings.symbols));
  }, [settings.theme, settings.symbols, scheme]);

  // The music follows its setting, and rests while the app is in the background.
  useEffect(() => {
    sound.refreshMusic();
  }, [sound, settings.music]);
  useEffect(() => {
    const watch = AppState.addEventListener('change', (status) => {
      if (status === 'active') sound.refreshMusic();
      else sound.pauseMusic();
    });
    return () => watch.remove();
  }, [sound]);

  const changeSettings = useCallback((change) => {
    const next = { ...latest.current.settings, ...change };
    saveSettings(next, storage);
    // Every text is read when it is drawn, so the new language shows as soon as the screens
    // and the game's title bar are drawn again.
    if (change.language && change.language !== getLanguage()) {
      setLanguage(change.language);
      controller.current?.refreshTexts();
    }
    setSettings(next);
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
        leaderboardOnline: dailyBoard.online,
        progress: loadProgress(storage),
        previewLevels: previewLevelsOf(),
        saveProgress: (progress) => {
          saveProgress(progress, storage);
          cloudRef.current?.cloudSync.schedule();
        }
      });
      board.onTubeTap((index) => game.tapTube(index));
      board.onCue((cue) => feedback.cue(cue));
      controller.current = game;
      game.start();
    },
    [hud, menu, rules, feedback, dailyBoard]
  );

  // The ads SDK starts once, with the first ad on its way.
  useEffect(() => {
    startAds();
  }, []);

  const openLeaderboard = useCallback(async () => {
    controller.current?.closeLevels();
    setLeaderboard({ view: null });
    const view = await dailyBoard.view(new Date());
    // The player may have closed it while it loaded.
    setLeaderboard((current) => (current ? { view } : null));
  }, [dailyBoard]);

  const share = useCallback(async (message) => {
    try {
      await Share.share({ message });
    } catch {
      // A closed share sheet is not an error.
    }
  }, []);

  const game = () => controller.current;
  const { view, toast, win, offer } = state;
  return (
    <SafeAreaProvider>
      <TapContext.Provider value={feedback.tap}>
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
            <HeaderButton
              a11y={words.info}
              colors={colors}
              onPress={() => {
                feedback.tap();
                game()?.showInfo();
              }}
            >
              <Icon name="information-variant" size={26} color={colors.accent} />
            </HeaderButton>
            <HeaderButton
              filled
              a11y={words.settings}
              colors={colors}
              onPress={() => {
                feedback.tap();
                setSettingsOpen(true);
              }}
            >
              <Icon name="tune-variant" size={24} color={colors.accentInk} />
            </HeaderButton>
          </View>

          <NativeBoard onScene={onScene} />

          <View style={styles.toolbar}>
            <ToolButton
              colors={colors}
              icon="undo-variant"
              color="#38bdf8"
              label={words.undo}
              count={view?.undoCount}
              disabled={!view?.canUndo && !view?.undoOffer}
              styles={styles}
              onPress={() => game()?.undo()}
            />
            <ToolButton
              colors={colors}
              icon="lightbulb-on"
              color="#fbbf24"
              label={words.hint}
              count={view?.hintCount}
              styles={styles}
              onPress={() => game()?.showHint()}
            />
            <ToolButton
              colors={colors}
              icon="beaker-plus-outline"
              color="#34d399"
              label={words.tube}
              disabled={!view?.tubeOffer}
              styles={styles}
              onPress={() => {
                feedback.tap();
                game()?.offerTube();
              }}
            />
            <ToolButton
              colors={colors}
              icon="restart"
              color="#fb7185"
              label={words.restart}
              styles={styles}
              onPress={() => {
                feedback.tap();
                game()?.restart();
              }}
            />
            <ToolButton
              colors={colors}
              icon="view-grid-outline"
              color="#a78bfa"
              label={view?.levelsLabel ?? words.levels}
              styles={styles}
              onPress={() => {
                feedback.tap();
                game()?.showLevels();
              }}
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
                onShare: share,
                onLeaderboard: openLeaderboard,
                // The ad is watched here; the game only hears whether it paid.
                onWatchAd: async () => {
                  const result = await watchRewardedAd();
                  if (result === 'rewarded') game()?.grantReward('savedHint');
                  return result;
                }
              }}
            />
          ) : null}

          {offer ? (
            <OfferDialog
              kind={offer.kind}
              colors={colors}
              onClose={() => hud.closeOffer()}
              onRewarded={() => {
                hud.closeOffer();
                game()?.grantReward(offer.kind);
                // The hint the player asked for is shown at once.
                if (offer.kind === 'hint') game()?.showHint();
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
              onLeaderboard={dailyBoard.online ? openLeaderboard : null}
              onClose={() => game()?.closeLevels()}
            />
          ) : null}

          {settingsOpen ? (
            <SettingsScreen
              settings={settings}
              colors={colors}
              onChange={changeSettings}
              onClose={() => setSettingsOpen(false)}
              account={{
                state: accountState ?? cloud.account.state,
                sync,
                message: accountMessage,
                available,
                actions: accountActions,
                dark: colors.bar === 'light'
              }}
            />
          ) : null}

          {leaderboard ? (
            <LeaderboardScreen
              view={leaderboard.view}
              account={{
                signedIn: Boolean(accountState?.user),
                username: accountState?.username ?? null
              }}
              colors={colors}
              onSignIn={() => {
                setLeaderboard(null);
                setSettingsOpen(true);
              }}
              onPlayDaily={() => {
                setLeaderboard(null);
                game()?.playDaily();
              }}
              onClose={() => setLeaderboard(null)}
            />
          ) : null}

          <NativeConfetti burst={burst} colors={confetti} />

          {splash ? <Splash colors={colors} onDone={() => setSplash(false)} /> : null}
        </SafeAreaView>
      </TapContext.Provider>
    </SafeAreaProvider>
  );
}

/** A round button of the header: outlined, or filled with the accent color. */
function HeaderButton({ a11y, colors, filled = false, onPress, children }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [
        {
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.accent,
          backgroundColor: filled ? colors.accent : colors.panel
        },
        glow(colors.accent, 0.8),
        pressed && { transform: [{ scale: 0.92 }], ...glow(colors.accent, 0.3) }
      ]}
    >
      {filled ? <Gloss radius={14} /> : null}
      {children}
    </Pressable>
  );
}

/**
 * A chunky button in its own color: tinted body, a stripe of light on top, a glow under it,
 * and it sinks into its bottom edge when pressed.
 */
function ToolButton({ icon, color, label, count, disabled = false, styles, colors, onPress }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tool,
        { backgroundColor: colors.panel, borderColor: color },
        glow(color),
        pressed && styles.toolPressed,
        disabled && styles.toolDisabled
      ]}
    >
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: color + '33', borderRadius: 15 }]}
      />
      <Gloss radius={14} />
      <Icon name={icon} size={26} color={color} />
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
    toolbar: { flexDirection: 'row', justifyContent: 'center', gap: 8, padding: 14 },
    tool: {
      flex: 1,
      maxWidth: 96,
      paddingTop: 8,
      paddingBottom: 6,
      paddingHorizontal: 4,
      borderRadius: 18,
      borderWidth: 2,
      borderBottomWidth: 5,
      alignItems: 'center',
      gap: 2
    },
    // Pressed, the button sinks into its bottom edge and its glow shrinks.
    toolPressed: {
      borderBottomWidth: 2,
      transform: [{ translateY: 3 }],
      shadowOpacity: 0.15,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1
    },
    toolDisabled: { opacity: 0.4 },
    toolText: { color: colors.ink, fontWeight: '800', fontSize: 12 },
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
