import mobileAds, {
  AdEventType,
  MaxAdContentRating,
  RewardedAd,
  RewardedAdEventType,
  TestIds
} from 'react-native-google-mobile-ads';
import { ADS_LIVE, REWARDED_UNIT_ID } from './adsConfig.js';

/** How long a player waits for an ad that is still loading before it counts as not there. */
export const LOAD_WAIT_MS = 8000;

/**
 * The ad being kept ready: `state` is 'loading', 'loaded' or 'failed'.
 * @type {{ ad: RewardedAd, state: 'loading' | 'loaded' | 'failed' } | null}
 */
let current = null;
let waiting = [];

const unitId = () => (ADS_LIVE ? REWARDED_UNIT_ID : TestIds.REWARDED);

function wake() {
  const list = waiting;
  waiting = [];
  for (const resolve of list) resolve();
}

/** Asks for the next ad, unless one is on its way or ready. */
function load() {
  if (current && current.state !== 'failed') return;
  try {
    // Without a consent form there is no personalized advertising: the ads are the plain kind.
    const ad = RewardedAd.createForAdRequest(unitId(), { requestNonPersonalizedAdsOnly: true });
    const entry = { ad, state: 'loading' };
    current = entry;
    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      entry.state = 'loaded';
      wake();
    });
    ad.addAdEventListener(AdEventType.ERROR, () => {
      if (entry.state === 'loading') entry.state = 'failed';
      wake();
    });
    ad.load();
  } catch {
    if (current) current.state = 'failed';
    wake();
  }
}

/** Starts the ads SDK and has the first ad ready; call it once when the app opens. */
export function startAds() {
  try {
    mobileAds()
      .setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false
      })
      .then(() => mobileAds().initialize())
      .then(load)
      .catch(() => {});
  } catch {
    // An app without ads is still a game.
  }
}

/** Resolves when the ad that is loading is ready or has failed, or after a while. */
function waitForLoad() {
  return new Promise((resolve) => {
    waiting.push(resolve);
    setTimeout(resolve, LOAD_WAIT_MS);
  });
}

/**
 * Shows a rewarded ad. Resolves to 'rewarded' when it was watched to the end, 'closed' when
 * the player left before that, and 'unavailable' when there was no ad to show.
 * @returns {Promise<'rewarded' | 'closed' | 'unavailable'>}
 */
export async function watchRewardedAd() {
  try {
    if (!current || current.state === 'failed') load();
    if (current?.state === 'loading') await waitForLoad();
    const entry = current;
    if (!entry || entry.state !== 'loaded') return 'unavailable';

    return await new Promise((resolve) => {
      let earned = false;
      let finished = false;
      const finish = (result) => {
        if (finished) return;
        finished = true;
        entry.ad.removeAllListeners();
        // The next ad is asked for as soon as this one is gone.
        current = null;
        load();
        resolve(result);
      };
      entry.ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });
      entry.ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned ? 'rewarded' : 'closed'));
      entry.ad.addAdEventListener(AdEventType.ERROR, () => finish('unavailable'));
      entry.ad.show().catch(() => finish('unavailable'));
    });
  } catch {
    return 'unavailable';
  }
}
