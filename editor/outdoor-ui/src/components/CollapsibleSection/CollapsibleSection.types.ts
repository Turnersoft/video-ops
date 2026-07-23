/** Types for CollapsibleSection. */
import type { ReactNode } from 'react';

export type CollapsibleSectionProps = {
  title: string;
  summary?: string | null;
  defaultOpen?: boolean;
  children: ReactNode;
};
