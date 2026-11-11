/** How loud each effect is next to the others (0 to 1); the files are all at the same level. */
const VOLUMES = {
  tap: 0.35,
  pick: 0.7,
  putDown: 0.6,
  reject: 0.7,
  pour: 0.45,
  capOn: 0.8,
  capOff: 0.6,
  melt: 0.7,
  undo: 0.6,
  hint: 0.6,
  win: 0.9
};
const MUSIC_VOLUME = 0.3;

/**
 * The sounds and the music of the app, played from files with expo-audio. It speaks the same
 * names as the website's sounds (src/app/sound.js). Nothing is loaded until the first sound,
 * and a phone or a build that cannot play audio stays silent instead of failing.
 *
 * @param {object} options
 * @param {() => ({ audio: object, files: Record<string, unknown> } | null)} options.load
 * @param {() => boolean} options.soundOn the setting for the effects
 * @param {() => boolean} options.musicOn the setting for the music
 */
export function createSound({ load, soundOn, musicOn }) {
  let ready = null;
  let music = null;
  const timers = new Map();

  function setup() {
    if (ready !== null) return ready;
    ready = false;
    try {
      const sdk = load();
      if (!sdk?.audio) return ready;
      const { audio, files } = sdk;
      // Plays alongside the player's own music, and not when the phone is on silent.
      audio
        .setAudioModeAsync({
          playsInSilentMode: false,
          interruptionMode: 'mixWithOthers',
          shouldPlayInBackground: false
        })
        ?.catch?.(() => {});
      const players = {};
      for (const name of Object.keys(VOLUMES)) {
        players[name] = audio.createAudioPlayer(files[name]);
        players[name].volume = VOLUMES[name];
      }
      music = audio.createAudioPlayer(files.music);
      music.loop = true;
      music.volume = MUSIC_VOLUME;
      ready = players;
    } catch {
      ready = false;
    }
    return ready;
  }

  function guard(call) {
    try {
      const result = call();
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch {
      // No sound is better than an error in the middle of a move.
    }
  }

  return {
    /**
     * Plays an effect from its start.
     * @param {string} name
     * @param {{ stopAfter?: number }} [options] stopAfter: cut it off after this many ms, for
     *   a pour that is shorter than the sound
     */
    play(name, { stopAfter } = {}) {
      if (!soundOn()) return;
      const players = setup();
      const player = players && players[name];
      if (!player) return;
      guard(() => {
        clearTimeout(timers.get(name));
        player.seekTo(0);
        player.play();
        if (stopAfter)
          timers.set(
            name,
            setTimeout(() => guard(() => player.pause()), stopAfter)
          );
      });
    },

    /** Starts or stops the music to match the setting; call it when the setting changes. */
    refreshMusic() {
      if (musicOn()) {
        if (!setup()) return;
        guard(() => music.play());
      } else if (music) {
        guard(() => music.pause());
      }
    },

    /** Pauses the music, e.g. while the app is in the background. */
    pauseMusic() {
      if (music) guard(() => music.pause());
    }
  };
}
