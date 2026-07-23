import 'react-native';

type CssModuleStyle = { $$css: true; _: string };

declare module 'react-native' {
  interface ViewStyle extends Partial<CssModuleStyle> {
    position?: 'absolute' | 'relative' | 'static' | 'fixed';
  }

  interface TextStyle extends Partial<CssModuleStyle> {}

  interface ImageStyle extends Partial<CssModuleStyle> {}

  interface FlexStyle {
    maxHeight?: DimensionValue | `${number}vh` | `${number}vw`;
    height?: DimensionValue | `${number}vh` | `${number}vw`;
    width?: DimensionValue | `${number}vh` | `${number}vw`;
  }

  interface ViewProps {
    className?: string;
  }

  interface TextProps {
    className?: string;
  }

  interface TextInputProps {
    className?: string;
  }

  interface PressableProps {
    className?: string;
  }

  interface ScrollViewProps {
    className?: string;
  }
}
