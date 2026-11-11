import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFeedback } from '../app/src/feedback.js';
import { createSound } from '../app/src/sound.js';

const NAMES = [
  'tap',
  'pick',
  'putDown',
  'reject',
  'pour',
  'capOn',
  'capOff',
  'melt',
  'undo',
  'hint',
  'win'
];

const make = (fake, { soundOn = true, musicOn = true } = {}) =>
  createSound({
    load: () => fake,
    soundOn: typeof soundOn === 'function' ? soundOn : () => soundOn,
    musicOn: typeof musicOn === 'function' ? musicOn : () => musicOn
  });

const flush = () => new Promise((resolve) => queueMicrotask(() => queueMicrotask(resolve)));

function fakeAudio() {
  const players = [];
  const audio = {
    setAudioModeAsync: vi.fn(() => Promise.resolve()),
    createAudioPlayer: vi.fn((file) => {
      const player = {
        file,
        volume: 1,
        loop: false,
        play: vi.fn(),
        pause: vi.fn(),
        seekTo: vi.fn(() => Promise.resolve())
      };
      players.push(player);
      return player;
    })
  };
  const files = Object.fromEntries([...NAMES, 'music'].map((name) => [name, `file:${name}`]));
  return {
    audio,
    files,
    players,
    byFile: (name) => players.find((p) => p.file === `file:${name}`)
  };
}

describe('the sounds of the app', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('loads nothing until the first sound, then plays an effect from its start', async () => {
    const fake = fakeAudio();
    const load = vi.fn(() => fake);
    const sound = createSound({ load, soundOn: () => true, musicOn: () => true });
    expect(load).not.toHaveBeenCalled();
    sound.play('pick');
    expect(fake.audio.setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' })
    );
    const [pick, again] = fake.players.filter((player) => player.file === 'file:pick');
    expect(pick.seekTo).toHaveBeenCalledWith(0);
    // It plays when the rewind is done, not before.
    expect(pick.play).not.toHaveBeenCalled();
    await flush();
    expect(pick.play).toHaveBeenCalledOnce();
    // The next one goes to another player, so a sound that is still going is not cut.
    sound.play('pick');
    await flush();
    expect(again.play).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledOnce();
  });

  it('stays silent when the effects are off, and plays nothing it does not know', () => {
    const fake = fakeAudio();
    const sound = make(fake, { soundOn: false });
    sound.play('win');
    expect(fake.players).toHaveLength(0);
    const on = make(fake);
    expect(() => on.play('nonsense')).not.toThrow();
  });

  it('cuts a pour short when the pour is shorter than the sound', async () => {
    const fake = fakeAudio();
    const sound = make(fake);
    sound.play('pour', { stopAfter: 500 });
    await flush();
    const pour = fake.byFile('pour');
    expect(pour.pause).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(pour.pause).toHaveBeenCalledOnce();
  });

  it('keeps the music looping, and starts and stops it with its setting', () => {
    const fake = fakeAudio();
    let music = true;
    const sound = make(fake, { musicOn: () => music });
    sound.refreshMusic();
    const track = fake.byFile('music');
    expect(track.loop).toBe(true);
    expect(track.play).toHaveBeenCalledOnce();
    music = false;
    sound.refreshMusic();
    expect(track.pause).toHaveBeenCalledOnce();
    sound.pauseMusic();
    expect(track.pause).toHaveBeenCalledTimes(2);
  });

  it('does not play music when it is off from the start', () => {
    const fake = fakeAudio();
    const sound = make(fake, { musicOn: false });
    sound.refreshMusic();
    expect(fake.players).toHaveLength(0);
  });

  it('is silent, never failing, in a build without the audio package or with a broken one', () => {
    for (const load of [
      () => null,
      () => {
        throw new Error('no native module');
      },
      () => ({
        audio: {
          setAudioModeAsync: () => Promise.reject(new Error('x')),
          createAudioPlayer: () => {
            throw new Error('x');
          }
        },
        files: {}
      })
    ]) {
      const sound = createSound({ load, soundOn: () => true, musicOn: () => true });
      expect(() => {
        sound.play('pick');
        sound.refreshMusic();
        sound.pauseMusic();
      }).not.toThrow();
    }
  });

  it('keeps going when a player fails to play', async () => {
    const fake = fakeAudio();
    const sound = make(fake);
    sound.play('tap');
    for (const player of fake.players) {
      player.play.mockImplementation(() => {
        throw new Error('audio session');
      });
    }
    expect(() => sound.play('tap')).not.toThrow();
    await flush();
  });
});

describe('the sounds of the game moments', () => {
  it('plays a sound for each moment, whether vibration is on or off', () => {
    for (const vibration of [true, false]) {
      const play = vi.fn();
      const feedback = createFeedback(() => vibration, { sound: { play } });
      feedback.tap();
      feedback.pick();
      feedback.putDown();
      feedback.reject();
      feedback.undo();
      feedback.hint();
      feedback.win();
      feedback.cue({ type: 'flow', duration: 600 });
      feedback.cue({ type: 'capOn' });
      feedback.cue({ type: 'capOff' });
      feedback.cue({ type: 'melt' });
      expect(play.mock.calls).toEqual([
        ['tap'],
        ['pick'],
        ['putDown'],
        ['reject'],
        ['undo'],
        ['hint'],
        ['win'],
        ['pour', { stopAfter: 600 }],
        ['capOn'],
        ['capOff'],
        ['melt']
      ]);
    }
  });
});
