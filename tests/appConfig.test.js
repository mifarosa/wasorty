import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = JSON.parse(readFileSync(new URL('../app/app.json', import.meta.url), 'utf8')).expo;
const plugin = (name) =>
  config.plugins.find((entry) => (Array.isArray(entry) ? entry[0] : entry) === name);

describe('the launch screen of the app', () => {
  it('is the game’s own, not the placeholder of the Expo template', () => {
    const [, options] = plugin('expo-splash-screen') ?? [];
    expect(options, 'expo-splash-screen is configured').toBeTruthy();
    expect(existsSync(new URL(`../app/${options.image}`, import.meta.url))).toBe(true);
    // The color matches the game's own splash in light and in dark, so nothing flashes between.
    expect(options.backgroundColor).toBe('#d6deef');
    expect(options.dark.backgroundColor).toBe('#0b0e1d');
  });

  it('has a runtime version that changes with the native code', () => {
    expect(config.runtimeVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
