/**
 * The audio package of Expo and the sound files, or null when this build of the app does not
 * have the native part of the package (a build made before it was added).
 *
 * They are loaded here, while the app starts, and not later: an error in a module that is loaded
 * while the app runs is reported as fatal, while one at the start can be caught, which is what
 * makes "no sound in this build" possible.
 */
let loaded = null;
try {
  loaded = {
    audio: require('expo-audio'),
    files: {
      tap: require('../assets/sounds/tap.wav'),
      pick: require('../assets/sounds/pick.wav'),
      putDown: require('../assets/sounds/putDown.wav'),
      reject: require('../assets/sounds/reject.wav'),
      pour: require('../assets/sounds/pour.wav'),
      capOn: require('../assets/sounds/capOn.wav'),
      capOff: require('../assets/sounds/capOff.wav'),
      melt: require('../assets/sounds/melt.wav'),
      undo: require('../assets/sounds/undo.wav'),
      hint: require('../assets/sounds/hint.wav'),
      win: require('../assets/sounds/win.wav'),
      music: require('../assets/sounds/music.m4a')
    }
  };
} catch {
  loaded = null;
}

export const loadSoundSdk = () => loaded;
