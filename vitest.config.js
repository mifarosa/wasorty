import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'expo-haptics': fileURLToPath(new URL('./tests/stubs/expo-haptics.js', import.meta.url)),
      'react-native-google-mobile-ads': fileURLToPath(
        new URL('./tests/stubs/google-mobile-ads.js', import.meta.url)
      )
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js']
  }
});
