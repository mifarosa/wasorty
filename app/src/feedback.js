import * as Haptics from 'expo-haptics';
import { safely } from './safely.js';

const { ImpactFeedbackStyle: Impact, NotificationFeedbackType: Notice } = Haptics;

/** Runs a haptic call; a phone that cannot do it must never break the game. */
const run = safely;

/** The cues of the scene that have a sound of their own name (a pour is handled apart). */
const CUE_SOUNDS = new Set(['capOn', 'capOff', 'melt']);

/**
 * The feel of the game on a phone. Small taps for what the player does (lifting a tube, a
 * button), a soft one when liquid starts to run and another when it lands, a firmer one for a
 * cap, and a little roll for a win. Each is a single short tap, so it costs the battery next to
 * nothing.
 *
 * @param {() => boolean} enabled whether the player wants vibration (the setting)
 * @param {{ onWin?: () => void, sound?: { play: (name: string, options?: object) => void } | null }}
 *   [hooks] onWin: the puzzle was solved (the confetti); sound: plays the sounds, which have
 *   their own setting
 */
export function createFeedback(enabled, { onWin = () => {}, sound = null } = {}) {
  const when = (action, name) => () => {
    sound?.play(name);
    if (enabled()) run(action);
  };
  const later = (ms, action) =>
    setTimeout(() => {
      if (enabled()) run(action);
    }, ms);

  return {
    /** A tap on a button or a tile of the app. */
    tap: when(() => Haptics.selectionAsync(), 'tap'),
    pick: when(() => Haptics.impactAsync(Impact.Light), 'pick'),
    putDown: when(() => Haptics.impactAsync(Impact.Soft), 'putDown'),
    reject: when(() => Haptics.notificationAsync(Notice.Warning), 'reject'),
    undo: when(() => Haptics.impactAsync(Impact.Light), 'undo'),
    hint: when(() => Haptics.impactAsync(Impact.Light), 'hint'),
    win() {
      onWin();
      sound?.play('win');
      if (!enabled()) return;
      run(() => Haptics.notificationAsync(Notice.Success));
      // A little roll while the confetti flies.
      later(260, () => Haptics.impactAsync(Impact.Light));
      later(440, () => Haptics.impactAsync(Impact.Soft));
    },
    /** The scene's moments: liquid starting and landing, a cap, ice melting. */
    cue(cue) {
      if (cue.type === 'flow') sound?.play('pour', { stopAfter: cue.duration });
      else if (CUE_SOUNDS.has(cue.type)) sound?.play(cue.type);
      if (!enabled()) return;
      switch (cue.type) {
        case 'flow':
          run(() => Haptics.impactAsync(Impact.Soft));
          // The liquid lands as the pour ends.
          if (cue.duration > 250)
            later(cue.duration * 0.85, () => Haptics.impactAsync(Impact.Light));
          break;
        case 'capOn':
          run(() => Haptics.impactAsync(Impact.Medium));
          break;
        case 'capOff':
          run(() => Haptics.impactAsync(Impact.Light));
          break;
        case 'melt':
          run(() => Haptics.impactAsync(Impact.Rigid));
          break;
        default:
      }
    }
  };
}
