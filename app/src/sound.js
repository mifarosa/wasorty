import { safely } from './safely.js';

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
/** Players per effect, taken in turn: one that is still playing (or still rewinding) is not reused. */
const POOL = 2;

/**
 * The sounds and the music of the app, played from files with expo-audio. It uses the same names
 * as the website's sounds (src/app/sound.js). Nothing is loaded until it is needed (an effect's
 * players on its first play, the music when it is on), and a phone or a build that cannot play
 * audio stays silent instead of failing.
 *
 * @param {object} options
 * @param {() => ({ audio: object, files: Record<string, unknown> } | null)} options.load
 * @param {() => boolean} options.soundOn the setting for the effects
 * @param {() => boolean} options.musicOn the setting for the music
 */
export function createSound({ load, soundOn, musicOn }) {
  // undefined until the first use, then the audio package, or null if this build has none
  let audio;
  let files = null;
  let music = null;
  const pools = new Map();

  function start() {
    if (audio !== undefined) return audio;
    audio = null;
    safely(() => {
      const sdk = load();
      if (!sdk?.audio) return;
      // Plays alongside the player's own music, and not when the phone is on silent.
      safely(() =>
        sdk.audio.setAudioModeAsync({
          playsInSilentMode: false,
          interruptionMode: 'mixWithOthers',
          shouldPlayInBackground: false
        })
      );
      files = sdk.files;
      audio = sdk.audio;
    });
    return audio;
  }

  function poolOf(name) {
    if (!pools.has(name)) {
      let pool = null;
      safely(() => {
        const players = Array.from({ length: POOL }, () => {
          const player = audio.createAudioPlayer(files[name]);
          player.volume = VOLUMES[name];
          return player;
        });
        pool = { players, next: 0, timers: [] };
      });
      pools.set(name, pool);
    }
    return pools.get(name);
  }

  function pauseMusic() {
    if (music) safely(() => music.pause());
  }

  return {
    /**
     * Plays an effect from its start.
     * @param {string} name
     * @param {{ stopAfter?: number }} [options] stopAfter: cut it off after this many ms, for
     *   a pour that is shorter than the sound
     */
    play(name, { stopAfter } = {}) {
      if (!soundOn() || !(name in VOLUMES) || !start()) return;
      const pool = poolOf(name);
      if (!pool) return;

      const index = pool.next;
      pool.next = (index + 1) % pool.players.length;
      const player = pool.players[index];
      clearTimeout(pool.timers[index]);
      // Play once the rewind is done: a play that comes first starts at the end, in silence.
      safely(() =>
        Promise.resolve(player.seekTo(0))
          .catch(() => {})
          .then(() => {
            safely(() => player.play());
            if (stopAfter) {
              pool.timers[index] = setTimeout(() => safely(() => player.pause()), stopAfter);
            }
          })
      );
    },

    /** Starts or stops the music to match the setting; call it when the setting changes. */
    refreshMusic() {
      if (!musicOn()) {
        pauseMusic();
        return;
      }
      if (!start()) return;
      if (!music) {
        safely(() => {
          const player = audio.createAudioPlayer(files.music);
          player.loop = true;
          player.volume = MUSIC_VOLUME;
          music = player;
        });
      }
      if (music) safely(() => music.play());
    },

    /** Pauses the music, e.g. while the app is in the background. */
    pauseMusic
  };
}
