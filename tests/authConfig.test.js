import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '../app/src/cloud/authConfig.js';

const SUFFIX = '.apps.googleusercontent.com';

// Google's sign-in needs the iOS client id in the code and the same id, reversed, as a URL
// scheme in the app's settings. They are three copies of one value, so they are checked
// against each other: a mistake would only show on a phone, as a sign-in that never returns.
describe('the Google sign-in settings', () => {
  const app = JSON.parse(readFileSync(new URL('../app/app.json', import.meta.url), 'utf8'));
  const plugin = app.expo.plugins.find(
    (entry) => Array.isArray(entry) && entry[0] === '@react-native-google-signin/google-signin'
  );

  it('have a web client id and an iOS client id of the Firebase project', () => {
    for (const id of [GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID]) {
      expect(id).toMatch(/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/);
    }
    expect(GOOGLE_WEB_CLIENT_ID).not.toBe(GOOGLE_IOS_CLIENT_ID);
    // Both belong to the Firebase project (its number is the start of every id).
    expect(GOOGLE_WEB_CLIENT_ID.split('-')[0]).toBe(GOOGLE_IOS_CLIENT_ID.split('-')[0]);
  });

  it('give the app the iOS client id, reversed, as its URL scheme', () => {
    expect(plugin).toBeDefined();
    const reversed = `com.googleusercontent.apps.${GOOGLE_IOS_CLIENT_ID.slice(0, -SUFFIX.length)}`;
    expect(plugin[1].iosUrlScheme).toBe(reversed);
  });
});
