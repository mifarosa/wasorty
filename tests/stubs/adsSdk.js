// Stands in for app/src/adsSdk.js in the tests: the stand-in for the SDK, or none at all when
// `control.missing` says the build has no ads.
import * as stub from './google-mobile-ads.js';

export const getSdk = () => (stub.control.missing ? null : stub);
