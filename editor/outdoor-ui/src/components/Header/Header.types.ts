/** Types for Header. */
import type { ButtonProps } from '../Button/Button.types';

export type HeaderAction = Pick<ButtonProps, 'label' | 'onPress' | 'variant' | 'disabled'>;

export type HeaderProps = {
  title: string;
  actions?: HeaderAction[];
};
