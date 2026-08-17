import path from 'node:path';

import { fileExists, readJson, writeJson } from './fs_util.ts';
import {
  ensureDir,
  SCRIPT_COVERS_DIR_NAME,
  scriptCoversDir,
  scriptCoversManifestPath,
  scriptDirFor,
} from './paths.ts';
import { nowIso } from './schema.ts';

export const SCRIPT_COVER_SLOTS = [
  'portrait-en',
  'portrait-zh',
  'landscape-en',
  'landscape-zh',
] as const;

export type ScriptCoverSlot = (typeof SCRIPT_COVER_SLOTS)[number];

const SLOT_FILE_NAMES: Record<ScriptCoverSlot, string> = {
  'portrait-en': 'portrait-en.jpg',
  'portrait-zh': 'portrait-zh.jpg',
  'landscape-en': 'landscape-en.jpg',
  'landscape-zh': 'landscape-zh.jpg',
};

const SLOT_LABELS: Record<ScriptCoverSlot, string> = {
  'portrait-en': 'Portrait · English',
  'portrait-zh': 'Portrait · 中文',
  'landscape-en': 'Landscape · English',
  'landscape-zh': 'Landscape · 中文',
};

const LANDSCAPE_PLATFORMS = new Set(['bilibili', 'wechat_channels', 'facebook', 'linkedin']);
const PORTRAIT_PLATFORMS = new Set([
  'youtube',
  'instagram',
  'tiktok',
  'douyin',
  'xiaohongshu',
  'kuaishou',
]);

type ScriptCoversManifest = {
  schemaVersion: 1;
  updatedAt: string;
  slots: Partial<Record<ScriptCoverSlot, { updatedAt: string; fileName: string }>>;
};

export type ScriptCoverSlotInfo = {
  slot: ScriptCoverSlot;
  fileName: string;
  label: string;
  exists: boolean;
  updatedAt: string | null;
  url: string;
};

export type ScriptCoversResponse = {
  scriptId: string;
  folder: string;
  slots: ScriptCoverSlotInfo[];
};

function emptyManifest(): ScriptCoversManifest {
  return {
    schemaVersion: 1,
    updatedAt: nowIso(),
    slots: {},
  };
}

function loadManifest(scriptId: string): ScriptCoversManifest {
  const manifestPath = scriptCoversManifestPath(scriptId);
  if (!fileExists(manifestPath)) {
    return emptyManifest();
  }
  const raw = readJson<Partial<ScriptCoversManifest>>(manifestPath);
  return {
    schemaVersion: 1,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : nowIso(),
    slots: raw.slots && typeof raw.slots === 'object' ? raw.slots : {},
  };
}

function saveManifest(scriptId: string, manifest: ScriptCoversManifest): void {
  ensureDir(scriptCoversDir(scriptId));
  writeJson(scriptCoversManifestPath(scriptId), manifest);
}

export function isScriptCoverSlot(value: string): value is ScriptCoverSlot {
  return (SCRIPT_COVER_SLOTS as readonly string[]).includes(value);
}

export function scriptCoverFileName(slot: ScriptCoverSlot): string {
  return SLOT_FILE_NAMES[slot];
}

export function scriptCoverFilePath(scriptId: string, slot: ScriptCoverSlot): string {
  return path.join(scriptCoversDir(scriptId), scriptCoverFileName(slot));
}

export function scriptCoverFileUrl(scriptId: string, slot: ScriptCoverSlot): string {
  return `/api/scripts/${encodeURIComponent(scriptId)}/covers/${encodeURIComponent(slot)}/file`;
}

function normalizeUploadStem(fileName: string): string {
  const base = path.basename(fileName, path.extname(fileName))
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
  return base;
}

export function parseScriptCoverSlotFromFileName(fileName: string): ScriptCoverSlot | null {
  const stem = normalizeUploadStem(fileName);
  for (const slot of SCRIPT_COVER_SLOTS) {
    if (stem === slot) {
      return slot;
    }
  }
  return null;
}

export function listScriptCovers(scriptId: string): ScriptCoversResponse {
  const manifest = loadManifest(scriptId);
  const slots: ScriptCoverSlotInfo[] = SCRIPT_COVER_SLOTS.map((slot) => {
    const fileName = scriptCoverFileName(slot);
    const filePath = scriptCoverFilePath(scriptId, slot);
    const exists = fileExists(filePath);
    const entry = manifest.slots[slot];
    return {
      slot,
      fileName,
      label: SLOT_LABELS[slot],
      exists,
      updatedAt: exists ? entry?.updatedAt ?? null : null,
      url: scriptCoverFileUrl(scriptId, slot),
    };
  });
  return {
    scriptId,
    folder: path.join(path.basename(scriptDirFor(scriptId)), SCRIPT_COVERS_DIR_NAME),
    slots,
  };
}

export function resolveScriptCoverPath(scriptId: string, slot: ScriptCoverSlot): string | null {
  const filePath = scriptCoverFilePath(scriptId, slot);
  return fileExists(filePath) ? filePath : null;
}

export function uploadScriptCoverSlot(
  scriptId: string,
  slot: ScriptCoverSlot,
  data: Uint8Array,
): ScriptCoversResponse {
  if (!data.length) {
    throw new Error(`Cover file for ${slot} is empty`);
  }
  ensureDir(scriptCoversDir(scriptId));
  const filePath = scriptCoverFilePath(scriptId, slot);
  Deno.writeFileSync(filePath, data);

  const manifest = loadManifest(scriptId);
  const updatedAt = nowIso();
  manifest.updatedAt = updatedAt;
  manifest.slots[slot] = {
    updatedAt,
    fileName: scriptCoverFileName(slot),
  };
  saveManifest(scriptId, manifest);
  return listScriptCovers(scriptId);
}

export function uploadScriptCoversBatch(
  scriptId: string,
  files: Array<{ fileName?: string; data: Uint8Array }>,
): ScriptCoversResponse {
  if (!files.length) {
    throw new Error('No cover files provided');
  }
  const assigned = new Map<ScriptCoverSlot, Uint8Array>();
  const unknown: string[] = [];

  for (const file of files) {
    const slot = parseScriptCoverSlotFromFileName(file.fileName ?? 'cover.jpg');
    if (!slot) {
      unknown.push(file.fileName ?? 'unnamed');
      continue;
    }
    assigned.set(slot, file.data);
  }

  if (unknown.length) {
    throw new Error(
      `Unrecognized cover filenames (expected portrait-en.jpg, portrait-zh.jpg, landscape-en.jpg, landscape-zh.jpg): ${unknown.join(', ')}`,
    );
  }

  for (const [slot, data] of assigned) {
    uploadScriptCoverSlot(scriptId, slot, data);
  }
  return listScriptCovers(scriptId);
}

type SocialGroupHint = {
  english?: Record<string, unknown>;
  china?: Record<string, unknown>;
};

export function scriptCoverSlotForPlatform(
  platform: string,
  social: SocialGroupHint = {},
): ScriptCoverSlot {
  const lang = social.china?.[platform] && !social.english?.[platform]
    ? 'zh'
    : social.english?.[platform]
      ? 'en'
      : social.china?.[platform]
        ? 'zh'
        : 'en';
  const orientation =
    LANDSCAPE_PLATFORMS.has(platform) && !PORTRAIT_PLATFORMS.has(platform)
      ? 'landscape'
      : 'portrait';
  return `${orientation}-${lang}` as ScriptCoverSlot;
}

export function resolveScriptCoverForPlatform(
  scriptId: string,
  platform: string,
  social: SocialGroupHint = {},
): { slot: ScriptCoverSlot; filePath: string } | null {
  const slot = scriptCoverSlotForPlatform(platform, social);
  const filePath = resolveScriptCoverPath(scriptId, slot);
  if (!filePath) {
    return null;
  }
  return { slot, filePath };
}
