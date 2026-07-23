export type { SectionLabelProps } from './SectionLabel.types';

import classes from './SectionLabel.module.scss';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { SectionLabelProps } from './SectionLabel.types';
import { Text } from 'react-native';

export function SectionLabel({ children, style, className, ...rest }: SectionLabelProps) {
  return (
    <Text style={[webModuleStyle(classes.label, className), style]} {...rest}>
      {children}
    </Text>
  );
}
