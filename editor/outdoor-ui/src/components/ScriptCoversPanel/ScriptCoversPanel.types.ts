/** Types for ScriptCoversPanel. */
import type { ScriptCoversResponse } from '../../types';

export type ScriptCoversPanelProps = {
  scriptId: string;
  covers?: ScriptCoversResponse | null;
  onCoversChange?: (covers: ScriptCoversResponse) => void;
  compact?: boolean;
};
