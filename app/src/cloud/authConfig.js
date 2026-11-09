/**
 * Google's sign-in needs two client ids of the Firebase project (Firebase console →
 * Authentication → Sign-in method → Google, and the iOS app's GoogleService-Info.plist).
 * They are not secrets. While they are empty the Google button stays hidden.
 *
 * GOOGLE_WEB_CLIENT_ID: "Web client ID" (ends in .apps.googleusercontent.com)
 * GOOGLE_IOS_CLIENT_ID: CLIENT_ID of GoogleService-Info.plist
 * The REVERSED_CLIENT_ID of the same file goes into app.json (the google-signin plugin).
 */
export const GOOGLE_WEB_CLIENT_ID =
  '268054495832-4lhs82hroumr7s74n6g7m5na5v1fpmug.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID =
  '268054495832-c4tcddd7dcd6st77408if73a9t3evpgo.apps.googleusercontent.com';
