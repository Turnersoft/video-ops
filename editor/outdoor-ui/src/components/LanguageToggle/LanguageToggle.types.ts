import type { ScriptLanguageId } from '../../utils/scriptLanguage';

export type LanguageToggleProps = {
  value: ScriptLanguageId;
  onChange: (value: ScriptLanguageId) => void;
  disabled?: boolean;
};
