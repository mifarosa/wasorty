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

  it('loads nothing until the first sound, then plays an effect from its start', () => {
    const fake = fakeAudio();
    const load = vi.fn(() => fake);
    const sound = createSound({ load, soundOn: () => true, musicOn: () => true });
    expect(load).not.toHaveBeenCalled();
    sound.play('pick');
    expect(fake.audio.setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' })
    );
    const pick = fake.byFile('pick');
    expect(pick.seekTo).toHaveBeenCalledWith(0);
    expect(pick.play).toHaveBeenCalledOnce();
    sound.play('pick');
    expect(load).toHaveBeenCalledOnce();
    expect(pick.play).toHaveBeenCalledTimes(2);
  });

  it('stays silent when the effects are off, and plays nothing it does not know', () => {
    const fake = fakeAudio();
    const sound = createSound({ load: () => fake, soundOn: () => false, musicOn: () => true });
    sound.play('win');
    expect(fake.players).toHaveLength(0);
    const on = createSound({ load: () => fake, soundOn: () => true, musicOn: () => true });
    expect(() => on.play('nonsense')).not.toThrow();
  });

  it('cuts a pour short when the pour is shorter than the sound', () => {
    const fake = fakeAudio();
    const sound = createSound({ load: () => fake, soundOn: () => true, musicOn: () => true });
    sound.play('pour', { stopAfter: 500 });
    const pour = fake.byFile('pour');
    expect(pour.pause).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(pour.pause).toHaveBeenCalledOnce();
  });

  it('keeps the music looping, and starts and stops it with its setting', () => {
    const fake = fakeAudio();
    let music = true;
    const sound = createSound({ load: () => fake, soundOn: () => true, musicOn: () => music });
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
    const sound = createSound({ load: () => fake, soundOn: () => true, musicOn: () => false });
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

  it('keeps going when a player fails to play', () => {
    const fake = fakeAudio();
    const sound = createSound({ load: () => fake, soundOn: () => true, musicOn: () => true });
    sound.play('tap');
    fake.byFile('tap').play.mockImplementation(() => {
      throw new Error('audio session');
    });
    expect(() => sound.play('tap')).not.toThrow();
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
