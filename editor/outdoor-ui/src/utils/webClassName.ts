import {
  Platform,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

/** RNW CSS-module style — cast so it satisfies View, Text, Pressable, and Image style props. */
type WebCssModuleStyle = ViewStyle & TextStyle & ImageStyle;

/** Apply SCSS module classes to react-native-web components via the style prop. */
export function webModuleStyle(
  ...names: Array<string | false | null | undefined>
): WebCssModuleStyle | undefined {
  if (Platform.OS !== 'web') {
    return undefined;
  }
  const next = names.filter(Boolean).join(' ');
  return next.length > 0 ? ({ $$css: true, _: next } as WebCssModuleStyle) : undefined;
}

/** Raw DOM elements (iframe, video) — pass as className string. */
export function webClassName(
  ...names: Array<string | false | null | undefined>
): string | undefined {
  if (Platform.OS !== 'web') {
    return undefined;
  }
  const next = names.filter(Boolean).join(' ');
  return next.length > 0 ? next : undefined;
}
