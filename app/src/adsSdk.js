/**
 * The ads SDK, or null when this build of the app does not have its native part (a development
 * build made before the package was added, say).
 *
 * It is loaded here, while the app starts, and not later: an error in a module that is loaded
 * while the app runs is reported to the app as fatal, while one that happens as the app starts
 * can be caught, which is what makes "no ads in this build" possible.
 */
let sdk = null;
try {
  sdk = require('react-native-google-mobile-ads');
} catch {
  sdk = null;
}

export const getSdk = () => sdk;
