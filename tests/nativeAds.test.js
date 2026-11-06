import { afterEach, describe, expect, it, vi } from 'vitest';
// Each test gets the module afresh (it keeps the ad that is ready between calls), together
// with the stand-in for the SDK that it uses.
async function freshAds(behaviour = {}) {
  vi.resetModules();
  const { control } = await import('react-native-google-mobile-ads');
  Object.assign(control, { load: 'load', show: 'reward', created: 0 }, behaviour);
  return { control, ...(await import('../app/src/ads.js')) };
}

describe('rewarded ads', () => {
  afterEach(() => vi.useRealTimers());

  it('rewards a player who watched the ad to its end', async () => {
    const { watchRewardedAd } = await freshAds();
    expect(await watchRewardedAd()).toBe('rewarded');
  });

  it('gives nothing to a player who closed the ad early', async () => {
    const { watchRewardedAd } = await freshAds({ show: 'close' });
    expect(await watchRewardedAd()).toBe('closed');
  });

  it('says so when there is no ad', async () => {
    const { watchRewardedAd } = await freshAds({ load: 'fail' });
    expect(await watchRewardedAd()).toBe('unavailable');
  });

  it('says so when the ad cannot be shown, either way it fails', async () => {
    const { watchRewardedAd, control } = await freshAds({ show: 'error' });
    expect(await watchRewardedAd()).toBe('unavailable');
    control.show = 'reject';
    expect(await watchRewardedAd()).toBe('unavailable');
  });

  it('does not wait forever for an ad that never loads', async () => {
    vi.useFakeTimers();
    const { watchRewardedAd, LOAD_WAIT_MS } = await freshAds({ load: 'hang' });
    const result = watchRewardedAd();
    await vi.advanceTimersByTimeAsync(LOAD_WAIT_MS + 1);
    expect(await result).toBe('unavailable');
  });

  it('asks for the next ad as soon as one has been watched, and can be watched again', async () => {
    const { watchRewardedAd, control } = await freshAds();
    expect(await watchRewardedAd()).toBe('rewarded');
    const asked = control.created;
    expect(asked).toBeGreaterThanOrEqual(2);
    expect(await watchRewardedAd()).toBe('rewarded');
  });

  it('is simply without ads in a build that lacks the SDK', async () => {
    vi.resetModules();
    vi.doMock('react-native-google-mobile-ads', () => {
      throw new Error("'RNGoogleMobileAdsModule' could not be found");
    });
    const { startAds, watchRewardedAd } = await import('../app/src/ads.js');
    expect(() => startAds()).not.toThrow();
    expect(await watchRewardedAd()).toBe('unavailable');
    vi.doUnmock('react-native-google-mobile-ads');
  });

  it('starts the ads without a fuss', async () => {
    const { startAds } = await freshAds();
    expect(() => startAds()).not.toThrow();
  });
});
