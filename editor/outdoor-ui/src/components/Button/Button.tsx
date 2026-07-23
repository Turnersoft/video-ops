import { Pressable, Text } from "react-native";
import { layoutStylesFor } from '../../layout';
import { webModuleStyle, webClassName } from '../../utils/webClassName';

import { useOutdoorUi } from "../../context/OutdoorUiContext";
import classes from "./Button.module.scss";
import type { ButtonProps, ButtonVariant } from "./Button.types";

export type { ButtonProps, ButtonVariant } from "./Button.types";

function variantClass(variant: ButtonVariant) {
  switch (variant) {
    case "primary":
      return classes.primary;
    case "danger":
      return classes.danger;
    case "back":
      return classes.back;
    default:
      return classes.default;
  }
}

function textClass(variant: ButtonVariant) {
  switch (variant) {
    case "primary":
      return classes.primaryText;
    case "danger":
      return classes.dangerText;
    case "back":
      return classes.backText;
    default:
      return classes.defaultText;
  }
}

export function Button({
  label,
  onPress,
  variant = "default",
  disabled = false,
}: ButtonProps) {
  const { layout } = useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        webModuleStyle(
          classes.base,
          variantClass(variant),
          disabled ? classes.disabled : null,
        ),
        layoutStyles.touchTarget,
        pressed && !disabled ? { opacity: 0.88 } : null,
      ]}
    >
      <Text style={webModuleStyle(textClass(variant))}>{label}</Text>
    </Pressable>
  );
}
