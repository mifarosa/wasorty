const { DEFAULT_GOOGLE, readGooglePlist } = require('./googleConfig');

// A plist of another Firebase app can be handed to the build (EAS gives a file variable's
// path in GOOGLE_SERVICES_PLIST, or it sits next to this file); otherwise the app's own ids.
const google =
  readGooglePlist(process.env.GOOGLE_SERVICES_PLIST || './GoogleService-Info.plist') ??
  DEFAULT_GOOGLE;

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    ['@react-native-google-signin/google-signin', { iosUrlScheme: google.urlScheme }]
  ],
  extra: { ...config.extra, googleIosClientId: google.clientId }
});
