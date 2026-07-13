import { Pressable, StyleSheet, Text } from 'react-native';

import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { colors, radii, typography } from '../../theme';

export type ButtonVariant = 'default' | 'primary' | 'danger' | 'back';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'default',
  disabled = false,
}: ButtonProps) {
  const { layoutStyles } = useOutdoorUi();
  const variantStyle =
    variant === 'primary'
      ? styles.primary
      : variant === 'danger'
        ? styles.danger
        : variant === 'back'
          ? styles.back
          : styles.default;

  const textStyle =
    variant === 'primary'
      ? styles.primaryText
      : variant === 'danger'
        ? styles.dangerText
        : variant === 'back'
          ? styles.backText
          : styles.defaultText;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        layoutStyles.touchTarget,
        variantStyle,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  default: {
    backgroundColor: colors.pill,
  },
  primary: {
    backgroundColor: colors.orange,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  back: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    minHeight: undefined,
  },
  defaultText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: typography.body,
  },
  primaryText: {
    color: colors.orangeText,
    fontWeight: '700',
    fontSize: typography.body,
  },
  dangerText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: typography.body,
  },
  backText: {
    color: colors.orange,
    fontWeight: '700',
    fontSize: typography.body,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.88,
  },
});
