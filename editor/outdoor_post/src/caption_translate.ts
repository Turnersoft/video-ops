import path from 'node:path';

import type { CaptionSegment } from './sentence-captions.ts';
import { fileExists, readJson, writeJson } from './fs_util.ts';
import { resolveCaptionTranslatePython, translateCaptionsLocal } from './subprocess.ts';

const CACHE_FILE = 'caption-zh-translations.json';
const BATCH_SIZE = 32;
const DEFAULT_TRANSLATE_URL = 'http://127.0.0.1:8790';

type CaptionZhCache = {
  version: 1;
  updatedAt: string;
  translations: Record<string, string>;
};

function normalizeSpokenLine(text: string): string {
  return String(text).replace(/\s+/g, ' ').trim();
}

function shouldTranslateLine(text: string): boolean {
  const normalized = normalizeSpokenLine(text);
  if (!normalized) {
    return false;
  }
  return /[a-zA-Z]/.test(normalized);
}

function cachePathFor(editDir: string): string {
  return path.join(editDir, CACHE_FILE);
}

function loadCaptionZhCache(editDir: string): CaptionZhCache {
  const cachePath = cachePathFor(editDir);
  if (!fileExists(cachePath)) {
    return { version: 1, updatedAt: new Date().toISOString(), translations: {} };
  }
  try {
    const parsed = readJson<CaptionZhCache>(cachePath);
    if (parsed?.version === 1 && parsed.translations && typeof parsed.translations === 'object') {
      return parsed;
    }
  } catch {
    // rebuild cache
  }
  return { version: 1, updatedAt: new Date().toISOString(), translations: {} };
}

function saveCaptionZhCache(editDir: string, cache: CaptionZhCache): void {
  writeJson(cachePathFor(editDir), {
    ...cache,
    updatedAt: new Date().toISOString(),
  });
}

function captionTranslateProvider(): 'local' | 'openai' {
  const provider = Deno.env.get('CAPTION_TRANSLATE_PROVIDER')?.trim().toLowerCase();
  if (provider === 'openai') {
    return 'openai';
  }
  return 'local';
}

function captionTranslateBaseUrl(): string {
  return Deno.env.get('CAPTION_TRANSLATE_URL')?.trim().replace(/\/$/, '') ||
    DEFAULT_TRANSLATE_URL;
}

async function translateBatchLocalHttp(lines: string[]): Promise<string[]> {
  const response = await fetch(`${captionTranslateBaseUrl()}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines }),
  });
  const payload = (await response.json()) as {
    error?: string;
    lines?: string[];
  };
  if (!response.ok) {
    throw new Error(payload.error || `Local caption translate failed (${response.status})`);
  }
  const out = payload.lines ?? [];
  if (out.length !== lines.length) {
    throw new Error(
      `Local caption translate count mismatch: expected ${lines.length}, got ${out.length}.`,
    );
  }
  return out.map((line) => String(line ?? '').replace(/\s+/g, ' ').trim());
}

async function translateBatchLocal(lines: string[]): Promise<string[]> {
  try {
    return await translateBatchLocalHttp(lines);
  } catch (httpError) {
    console.warn(
      `[caption-translate] HTTP server unavailable (${captionTranslateBaseUrl()}), ` +
        `falling back to ${resolveCaptionTranslatePython()}: ${httpError}`,
    );
    return translateCaptionsLocal(lines);
  }
}

async function translateBatchOpenAi(lines: string[]): Promise<string[]> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is required when CAPTION_TRANSLATE_PROVIDER=openai. ' +
        'Default is local offline translation (npm run outdoor:all starts it on :8790).',
    );
  }
  const model = Deno.env.get('OPENAI_TRANSLATE_MODEL')?.trim() || 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Translate English spoken video narration into Simplified Chinese subtitles. ' +
            'Return JSON {"lines":["..."]} with the same number of strings as the input array, same order. ' +
            'Keep identifiers verbatim when they appear in English: Lean, Turn-Lang, rfl, Nat, Int, Eq, SetEq, FuncEq, Mathlib, typeclass, instance, Prelude, Set.ext, funext. ' +
            'Use concise subtitle phrasing. Do not add explanations.',
        },
        {
          role: 'user',
          content: JSON.stringify({ lines }),
        },
      ],
    }),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI translate failed (${response.status})`);
  }
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('OpenAI translate returned empty content.');
  }
  let parsed: { lines?: string[] };
  try {
    parsed = JSON.parse(content) as { lines?: string[] };
  } catch {
    throw new Error('OpenAI translate returned invalid JSON.');
  }
  const out = parsed.lines ?? [];
  if (out.length !== lines.length) {
    throw new Error(
      `OpenAI translate count mismatch: expected ${lines.length}, got ${out.length}.`,
    );
  }
  return out.map((line) => String(line ?? '').replace(/\s+/g, ' ').trim());
}

async function translateBatch(lines: string[]): Promise<string[]> {
  if (captionTranslateProvider() === 'openai') {
    return translateBatchOpenAi(lines);
  }
  return translateBatchLocal(lines);
}

export async function translateSpokenCaptionsToZh(
  editDir: string,
  spokenLines: string[],
): Promise<Record<string, string>> {
  const cache = loadCaptionZhCache(editDir);
  const unique = [
    ...new Set(
      spokenLines
        .map(normalizeSpokenLine)
        .filter(shouldTranslateLine)
        .filter((line) => !cache.translations[line]),
    ),
  ];

  for (let index = 0; index < unique.length; index += BATCH_SIZE) {
    const batch = unique.slice(index, index + BATCH_SIZE);
    const translated = await translateBatch(batch);
    batch.forEach((english, batchIndex) => {
      const zh = translated[batchIndex]?.trim();
      if (zh) {
        cache.translations[english] = zh;
      }
    });
    saveCaptionZhCache(editDir, cache);
  }

  return cache.translations;
}

export function zhForSpokenCaption(
  spokenText: string,
  translations: Record<string, string>,
): string | undefined {
  const key = normalizeSpokenLine(spokenText);
  if (!shouldTranslateLine(key)) {
    return undefined;
  }
  const zh = translations[key]?.trim();
  return zh || undefined;
}

/** Attach Chinese subtitles translated from each segment's spoken English (Whisper), not script sayZh. */
export async function attachSpokenZhToCaptionSegments(
  editDir: string,
  segments: CaptionSegment[],
): Promise<CaptionSegment[]> {
  if (!segments.length) {
    return segments;
  }
  const translations = await translateSpokenCaptionsToZh(
    editDir,
    segments.map((segment) => segment.text),
  );
  return segments.map((segment) => ({
    ...segment,
    zh: zhForSpokenCaption(segment.text, translations),
  }));
}
