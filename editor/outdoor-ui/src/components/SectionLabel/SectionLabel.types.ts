/** Types for SectionLabel. */
import type { ReactNode } from 'react';
import type { TextProps } from 'react-native';

export type SectionLabelProps = TextProps & {
  children: ReactNode;
};
