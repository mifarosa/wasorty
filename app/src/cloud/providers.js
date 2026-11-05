import { Platform } from 'react-native';
import { createAppleProvider } from './appleProvider.js';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from './authConfig.js';
import { createGoogleProvider } from './googleProvider.js';

/**
 * The sign-ins this build has. A native package that is not in the build leaves its provider
 * out (null) instead of breaking the app.
 */
function make() {
  let apple = null;
  let google = null;
  let AppleButton = null;

  if (Platform.OS === 'ios') {
    try {
      const AppleAuthentication = require('expo-apple-authentication');
      const Crypto = require('expo-crypto');
      apple = createAppleProvider({ AppleAuthentication, Crypto });
      AppleButton = AppleAuthentication;
    } catch {
      apple = null;
    }
  }
  try {
    const { GoogleSignin, statusCodes } = require('@react-native-google-signin/google-signin');
    google = createGoogleProvider({
      GoogleSignin,
      cancelCode: statusCodes.SIGN_IN_CANCELLED,
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID
    });
  } catch {
    google = null;
  }
  return { providers: { apple, google }, AppleAuthentication: AppleButton };
}

export const { providers, AppleAuthentication } = make();
