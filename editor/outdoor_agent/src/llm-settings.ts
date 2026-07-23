import path from 'node:path';

import { fileExists, writeJson, readJson } from './fs_util.ts';
import { AGENT_ROOT, ensureDir } from './paths.ts';

export type LlmSettings = {
  baseUrl: string;
  model: string | null;
  updatedAt: string;
};

const DEFAULT_BASE_URL = 'http://192.168.3.251:1234';
const SETTINGS_PATH = path.join(AGENT_ROOT, 'data', 'llm-settings.json');

export function defaultLlmSettings(): LlmSettings {
  return {
    baseUrl: Deno.env.get('OUTDOOR_LLM_BASE_URL')?.trim() || DEFAULT_BASE_URL,
    model: Deno.env.get('OUTDOOR_LLM_MODEL')?.trim() || null,
    updatedAt: new Date().toISOString(),
  };
}

export function loadLlmSettings(): LlmSettings {
  if (!fileExists(SETTINGS_PATH)) {
    return defaultLlmSettings();
  }
  try {
    const stored = readJson<Partial<LlmSettings>>(SETTINGS_PATH);
    const defaults = defaultLlmSettings();
    return {
      baseUrl: (stored.baseUrl ?? defaults.baseUrl).replace(/\/+$/, ''),
      model: stored.model ?? defaults.model,
      updatedAt: stored.updatedAt ?? defaults.updatedAt,
    };
  } catch {
    return defaultLlmSettings();
  }
}

export function saveLlmSettings(partial: { baseUrl?: string; model?: string | null }): LlmSettings {
  const current = loadLlmSettings();
  const next: LlmSettings = {
    baseUrl: (partial.baseUrl ?? current.baseUrl).trim().replace(/\/+$/, ''),
    model: partial.model === undefined ? current.model : partial.model,
    updatedAt: new Date().toISOString(),
  };
  if (!/^https?:\/\//i.test(next.baseUrl)) {
    throw new Error('LLM base URL must start with http:// or https://');
  }
  ensureDir(path.dirname(SETTINGS_PATH));
  writeJson(SETTINGS_PATH, next);
  return next;
}
