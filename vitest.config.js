import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: 'expo-haptics',
        replacement: fileURLToPath(new URL('./tests/stubs/expo-haptics.js', import.meta.url))
      },
      {
        find: 'react-native-google-mobile-ads',
        replacement: fileURLToPath(new URL('./tests/stubs/google-mobile-ads.js', import.meta.url))
      },
      {
        find: /^.*\/adsSdk\.js$/,
        replacement: fileURLToPath(new URL('./tests/stubs/adsSdk.js', import.meta.url))
      }
    ]
  },
  test: {
    environment: 'node',
    // Some tests deal and solve every level; a CI machine is slower than a desktop.
    testTimeout: 30_000,
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js']
  }
});
