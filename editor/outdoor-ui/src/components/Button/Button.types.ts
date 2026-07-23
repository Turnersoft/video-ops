export type ButtonVariant = 'default' | 'primary' | 'danger' | 'back';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
};
