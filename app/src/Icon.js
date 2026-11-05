import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';

/**
 * One icon of the app, in one color, from the Material Community set: crisp at any size and
 * painted in the colors of the theme, unlike the emojis it replaces.
 * @param {object} props
 * @param {string} props.name see https://pictogrammers.com/library/mdi/
 * @param {number} [props.size]
 * @param {string} props.color
 */
export function Icon({ name, size = 22, color }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

/** Loads the icon font; call it once near the top. The name drops in over it meanwhile. */
export function useIconFonts() {
  return useFonts(MaterialCommunityIcons.font);
}
