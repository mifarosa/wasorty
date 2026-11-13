/**
 * Whether the app shows real ads. It is true for the build that goes to the App Store. While it is
 * false (a test build) the app shows Google's
 * test ads, which are labelled as such and cost the account nothing; never tap real ads
 * yourself, and set it back to false for a build you try out.
 */
export const ADS_LIVE = true;

/** The rewarded ad unit of the app in AdMob (not a secret: it is in every copy of the app). */
export const REWARDED_UNIT_ID = 'ca-app-pub-1672861293331033/4640944314';
