// Stands in for react-native-google-mobile-ads in the tests (the real one only runs on a phone).
// `control` says what the next ad does.
export const control = {
  /** 'load' | 'fail' | 'hang' (never answers) */
  load: 'load',
  /** what showing does: 'reward' | 'close' | 'error' | 'reject' */
  show: 'reward',
  created: 0,
  /** the build has no ads at all */
  missing: false
};

export const AdEventType = { ERROR: 'error', CLOSED: 'closed' };
export const RewardedAdEventType = { LOADED: 'rewarded_loaded', EARNED_REWARD: 'rewarded_earned' };
export const MaxAdContentRating = { PG: 'PG' };
export const TestIds = { REWARDED: 'test-rewarded' };

class FakeAd {
  loaded = false;
  #listeners = new Map();

  addAdEventListener(type, listener) {
    this.#listeners.set(type, listener);
    return () => this.#listeners.delete(type);
  }

  removeAllListeners() {
    this.#listeners.clear();
  }

  #emit(type, ...args) {
    this.#listeners.get(type)?.(...args);
  }

  load() {
    if (control.load === 'load') queueMicrotask(() => this.#emit(RewardedAdEventType.LOADED));
    else if (control.load === 'fail') queueMicrotask(() => this.#emit(AdEventType.ERROR, {}));
  }

  show() {
    if (control.show === 'reject') return Promise.reject(new Error('not loaded'));
    queueMicrotask(() => {
      if (control.show === 'reward') this.#emit(RewardedAdEventType.EARNED_REWARD, { amount: 1 });
      if (control.show === 'error') return this.#emit(AdEventType.ERROR, {});
      this.#emit(AdEventType.CLOSED);
    });
    return Promise.resolve();
  }
}

export const RewardedAd = {
  createForAdRequest: () => {
    control.created++;
    return new FakeAd();
  }
};

const mobileAds = () => ({
  setRequestConfiguration: () => Promise.resolve(),
  initialize: () => Promise.resolve([])
});
export default mobileAds;
