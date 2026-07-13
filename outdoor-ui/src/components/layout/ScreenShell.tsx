import type { ReactNode } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { colors } from '../../theme';

export type ScreenShellProps = {
  children: ReactNode;
};

export function ScreenShell({ children }: ScreenShellProps) {
  const { layout } = useOutdoorUi();
  const insets = useSafeAreaInsets();

  const style: ViewStyle =
    layout === 'mobile' && Platform.OS !== 'web'
      ? {
          flex: 1,
          backgroundColor: colors.bg,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingBottom: insets.bottom,
        }
      : {
          flex: 1,
          backgroundColor: colors.bg,
        };

  return <View style={style}>{children}</View>;
}
