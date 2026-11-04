import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as Haptics from 'expo-haptics';
import { createFeedback } from '../app/src/feedback.js';

const impacts = () => Haptics.impactAsync.mock.calls.map(([style]) => style);

describe('the vibration of the app', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('stays quiet when the player turned it off, but still tells about a win', () => {
    const onWin = vi.fn();
    const feedback = createFeedback(() => false, { onWin });
    feedback.tap();
    feedback.pick();
    feedback.cue({ type: 'flow', duration: 600 });
    feedback.win();
    vi.runAllTimers();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(onWin).toHaveBeenCalledOnce();
  });

  it('taps softly as liquid starts to run and again as it lands', () => {
    const feedback = createFeedback(() => true);
    feedback.cue({ type: 'flow', duration: 600 });
    expect(impacts()).toEqual(['soft']);
    vi.advanceTimersByTime(600);
    expect(impacts()).toEqual(['soft', 'light']);
  });

  it('gives a cap a firmer tap, and ice a hard one', () => {
    const feedback = createFeedback(() => true);
    feedback.cue({ type: 'capOn' });
    feedback.cue({ type: 'capOff' });
    feedback.cue({ type: 'melt' });
    expect(impacts()).toEqual(['medium', 'light', 'rigid']);
  });

  it('rolls a little after the success of a win', () => {
    const feedback = createFeedback(() => true);
    feedback.win();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    vi.runAllTimers();
    expect(impacts()).toEqual(['light', 'soft']);
  });

  it('ticks for a tap on a button and warns for a move that is not allowed', () => {
    const feedback = createFeedback(() => true);
    feedback.tap();
    feedback.reject();
    expect(Haptics.selectionAsync).toHaveBeenCalledOnce();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
  });

  it('never lets a phone that cannot vibrate break the game', async () => {
    Haptics.impactAsync.mockImplementationOnce(() => {
      throw new Error('no haptics');
    });
    Haptics.selectionAsync.mockImplementationOnce(() => Promise.reject(new Error('no haptics')));
    const feedback = createFeedback(() => true);
    expect(() => feedback.pick()).not.toThrow();
    expect(() => feedback.tap()).not.toThrow();
    await vi.runAllTimersAsync();
  });
});
