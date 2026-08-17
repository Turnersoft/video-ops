import type { VoiceEngineId } from '../../utils/voiceEngine';

export type VoiceEngineToggleProps = {
  value: VoiceEngineId;
  onChange: (value: VoiceEngineId) => void;
  disabled?: boolean;
  /** Gray out engines with no published preview yet. */
  disabledEngines?: VoiceEngineId[];
  /** Prefix label (default "Voice"). */
  label?: string;
};
