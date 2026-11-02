/**
 * What the Google sign-in of the app needs from the Firebase iOS app's GoogleService-Info.plist:
 * its client id, and the "reversed" id that the phone answers to when Google hands the player
 * back to the app. Read when the app is built; the plist itself never goes into the repository.
 */
const fs = require('node:fs');

/** @param {string} text the contents of the plist */
function parseGooglePlist(text) {
  const pick = (key) => new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`).exec(text)?.[1];
  const clientId = pick('CLIENT_ID');
  const urlScheme = pick('REVERSED_CLIENT_ID');
  return clientId && urlScheme ? { clientId, urlScheme } : null;
}

/** @param {string} path @returns {{ clientId: string, urlScheme: string } | null} */
function readGooglePlist(path) {
  try {
    return parseGooglePlist(fs.readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * The ids of the Firebase iOS app of Wasorty (bundle com.mifarosa.wasorty). They are public:
 * every build of the app carries them (in its URL schemes and its sign-in settings), so they
 * are no secret like a password would be. A plist handed to the build still wins over them.
 */
const DEFAULT_GOOGLE = {
  clientId: '268054495832-c4tcddd7dcd6st77408if73a9t3evpgo.apps.googleusercontent.com',
  urlScheme: 'com.googleusercontent.apps.268054495832-c4tcddd7dcd6st77408if73a9t3evpgo'
};

module.exports = { DEFAULT_GOOGLE, parseGooglePlist, readGooglePlist };
