import { NativeModules, Platform } from 'react-native';

/** The phone's first language, like "tr-TR". Never throws: a phone that will not say is English. */
export function deviceLocale() {
  try {
    if (Platform.OS === 'ios') {
      // The language the player picked for the phone, whatever the app itself is translated to.
      const settings = NativeModules.SettingsManager?.settings;
      const first = settings?.AppleLanguages?.[0] ?? settings?.AppleLocale;
      if (first) return first;
    }
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return 'en';
  }
}
