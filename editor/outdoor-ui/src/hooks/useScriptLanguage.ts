import { useCallback, useState } from 'react';

import {
  defaultScriptLanguage,
  parseScriptLanguage,
  type ScriptLanguageId,
} from '../utils/scriptLanguage';

const STORAGE_KEY = 'outdoor.scriptLanguage';

function readStoredScriptLanguage(): ScriptLanguageId {
  if (typeof localStorage === 'undefined') {
    return defaultScriptLanguage();
  }
  return parseScriptLanguage(localStorage.getItem(STORAGE_KEY));
}

export function useScriptLanguage(): {
  scriptLanguage: ScriptLanguageId;
  setScriptLanguage: (language: ScriptLanguageId) => void;
} {
  const [scriptLanguage, setScriptLanguageState] = useState<ScriptLanguageId>(
    readStoredScriptLanguage,
  );

  const setScriptLanguage = useCallback((language: ScriptLanguageId) => {
    setScriptLanguageState(language);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, language);
    }
  }, []);

  return { scriptLanguage, setScriptLanguage };
}
