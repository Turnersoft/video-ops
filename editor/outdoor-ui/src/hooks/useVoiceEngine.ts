import { useCallback, useState } from 'react';

import {
  defaultVoiceEngine,
  parseVoiceEngine,
  type VoiceEngineId,
} from '../utils/voiceEngine';

const STORAGE_KEY = 'outdoor.voiceEngine';

function readStoredVoiceEngine(): VoiceEngineId {
  if (typeof localStorage === 'undefined') {
    return defaultVoiceEngine();
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return defaultVoiceEngine();
  }
  return parseVoiceEngine(stored);
}

export function useVoiceEngine(): {
  voiceEngine: VoiceEngineId;
  setVoiceEngine: (engine: VoiceEngineId) => void;
} {
  const [voiceEngine, setVoiceEngineState] = useState<VoiceEngineId>(readStoredVoiceEngine);

  const setVoiceEngine = useCallback((engine: VoiceEngineId) => {
    setVoiceEngineState(engine);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, engine);
    }
  }, []);

  return { voiceEngine, setVoiceEngine };
}
