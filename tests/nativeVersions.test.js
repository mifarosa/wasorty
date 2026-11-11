import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The native packages of an Expo app are compiled into the app, and they are built against each
// other: a build whose ExpoFont is a patch newer than the ExpoModulesCore beside it does not open
// (dyld: "Symbol not found"). Expo publishes the one set of versions that fits an SDK
// (node_modules/expo/bundledNativeModules.json); these are the ones of SDK 58. `npm install` of a
// new package takes the newest patch, which is how expo-font and expo-updates once drifted, so the
// lock file is checked against the table. Change it together with the SDK, from that file.
const SDK_58 = {
  '@shopify/react-native-skia': '2.14.0',
  'expo-apple-authentication': '58.0.2',
  'expo-asset': '58.0.18',
  'expo-audio': '58.0.10',
  'expo-constants': '58.0.13',
  'expo-crypto': '58.0.7',
  'expo-dev-client': '58.0.15',
  'expo-font': '58.0.10',
  'expo-haptics': '58.0.7',
  'expo-modules-core': '58.0.26',
  'expo-sqlite': '58.0.14',
  'expo-status-bar': '58.0.4',
  'expo-updates': '58.0.18',
  'react-native-safe-area-context': '5.10.1'
};

describe('the native packages of the app', () => {
  const lock = JSON.parse(
    readFileSync(new URL('../app/package-lock.json', import.meta.url), 'utf8')
  );
  const app = JSON.parse(readFileSync(new URL('../app/package.json', import.meta.url), 'utf8'));

  it('are the versions Expo built SDK 58 with', () => {
    for (const [name, version] of Object.entries(SDK_58)) {
      expect(lock.packages[`node_modules/${name}`]?.version, name).toBe(version);
    }
  });

  it('are declared in package.json, so they cannot be dropped by accident', () => {
    for (const name of Object.keys(SDK_58)) {
      if (name === 'expo-modules-core') continue; // comes with expo
      expect(app.dependencies[name], name).toBeDefined();
    }
  });
});
