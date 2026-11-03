import * as Haptics from 'expo-haptics';

/**
 * The feel of the game on a phone: a light tap for most things, a stronger one for a win.
 * @param {() => boolean} enabled whether the player wants vibration (the setting)
 */
export function createFeedback(enabled) {
  const when = (action) => () => {
    if (enabled()) action();
  };
  return {
    pick: when(() => Haptics.selectionAsync()),
    putDown: () => {},
    reject: when(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
    undo: when(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
    hint: when(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
    win: when(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
    // The scene's sound cues (liquid, caps, ice) have no sound here yet.
    cue: () => {}
  };
}
