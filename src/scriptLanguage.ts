export const SCRIPT_LANGUAGE_IDS = ["en", "zh"] as const;

export type ScriptLanguageId = (typeof SCRIPT_LANGUAGE_IDS)[number];

export const SCRIPT_LANGUAGE_LABELS: Record<ScriptLanguageId, string> = {
  en: "English",
  zh: "中文",
};

export function defaultScriptLanguage(): ScriptLanguageId {
  return "en";
}

export function parseScriptLanguage(value: unknown): ScriptLanguageId {
  if (value === "zh" || value === "en") {
    return value;
  }
  return "en";
}

export function isScriptLanguageId(value: string): value is ScriptLanguageId {
  return SCRIPT_LANGUAGE_IDS.includes(value as ScriptLanguageId);
}
