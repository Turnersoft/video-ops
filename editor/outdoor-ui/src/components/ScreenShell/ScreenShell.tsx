export type { ScreenShellProps } from "./ScreenShell.types";

import classes from "./ScreenShell.module.scss";
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { ScreenShellProps } from "./ScreenShell.types";
import { Platform, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOutdoorUi } from "../../context/OutdoorUiContext";
import { colors } from "../../theme";
import { ScriptLibrarySidebar } from "../ScriptLibrarySidebar/ScriptLibrarySidebar";

export function ScreenShell({ children }: ScreenShellProps) {
  const { layout } = useOutdoorUi();
  const insets = useSafeAreaInsets();

  const style: ViewStyle =
    layout === "mobile" && Platform.OS !== "web"
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
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
          backgroundColor: colors.bg,
          ...(Platform.OS === "web"
            ? { display: "flex" as const, flexDirection: "column" as const }
            : {}),
        };

  return (
    <View style={[webModuleStyle(classes.fill), style]}>
      <ScriptLibrarySidebar />
      {children}
    </View>
  );
}
