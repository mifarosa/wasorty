import { View } from 'react-native';

/**
 * The icon set and its font are native parts of the app. A build that lacks them (a development
 * build made before they were added) shows empty spaces where the icons go and plays on.
 */
let Icons = null;
let useFontsHook = null;
try {
  Icons = require('@expo/vector-icons').MaterialCommunityIcons;
  useFontsHook = require('expo-font').useFonts;
} catch {
  Icons = null;
  useFontsHook = null;
}

/**
 * One icon of the app, in one color, from the Material Community set: crisp at any size and
 * painted in the colors of the theme, unlike the emojis it replaces.
 * @param {object} props
 * @param {string} props.name see https://pictogrammers.com/library/mdi/
 * @param {number} [props.size]
 * @param {string} props.color
 */
export function Icon({ name, size = 22, color }) {
  if (!Icons) return <View style={{ width: size, height: size }} />;
  return <Icons name={name} size={size} color={color} />;
}

/** Loads the icon font; call it once near the top. The name drops in over it meanwhile. */
export function useIconFonts() {
  return useFontsHook && Icons ? useFontsHook(Icons.font) : [false, null];
}
