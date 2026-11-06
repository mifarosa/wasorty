import { ADS_LIVE, REWARDED_UNIT_ID } from './adsConfig.js';

/** How long a player waits for an ad that is still loading before it counts as not there. */
export const LOAD_WAIT_MS = 8000;

let sdkPromise = null;

/**
 * The ads SDK, or null when this build of the app does not have its native part (a
 * development build made before the package was added, say). The app then simply has no ads.
 */
function sdk() {
  sdkPromise ??= import('react-native-google-mobile-ads').catch(() => null);
  return sdkPromise;
}

/**
 * The ad being kept ready: `state` is 'loading', 'loaded' or 'failed'.
 * @type {{ ad: object | null, state: 'loading' | 'loaded' | 'failed' } | null}
 */
let current = null;
let waiting = [];

function wake() {
  const list = waiting;
  waiting = [];
  for (const resolve of list) resolve();
}

/** Asks for the next ad, unless one is on its way or ready. */
function load() {
  if (current && current.state !== 'failed') return;
  const entry = { ad: null, state: 'loading' };
  current = entry;
  sdk()
    .then((ads) => {
      if (!ads) throw new Error('no ads in this build');
      // Without a consent form there is no personalized advertising: the ads are the plain kind.
      const ad = ads.RewardedAd.createForAdRequest(
        ADS_LIVE ? REWARDED_UNIT_ID : ads.TestIds.REWARDED,
        { requestNonPersonalizedAdsOnly: true }
      );
      entry.ad = ad;
      ad.addAdEventListener(ads.RewardedAdEventType.LOADED, () => {
        entry.state = 'loaded';
        wake();
      });
      ad.addAdEventListener(ads.AdEventType.ERROR, () => {
        if (entry.state === 'loading') entry.state = 'failed';
        wake();
      });
      ad.load();
    })
    .catch(() => {
      entry.state = 'failed';
      wake();
    });
}

/** Starts the ads SDK and has the first ad ready; call it once when the app opens. */
export function startAds() {
  sdk()
    .then((ads) => {
      if (!ads) return undefined;
      return ads
        .default()
        .setRequestConfiguration({
          maxAdContentRating: ads.MaxAdContentRating.PG,
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false
        })
        .then(() => ads.default().initialize())
        .then(load);
    })
    .catch(() => {
      // An app without ads is still a game.
    });
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
    const ads = await sdk();
    if (!ads) return 'unavailable';
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
      entry.ad.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });
      entry.ad.addAdEventListener(ads.AdEventType.CLOSED, () =>
        finish(earned ? 'rewarded' : 'closed')
      );
      entry.ad.addAdEventListener(ads.AdEventType.ERROR, () => finish('unavailable'));
      entry.ad.show().catch(() => finish('unavailable'));
    });
  } catch {
    return 'unavailable';
  }
}
