/**
 * Sticker image assets stored under projects/<series>/<script>/assets/stickers/.
 */

import path from 'node:path';

import { fileExists } from './fs_util.ts';
import { parseMultipart, type MultipartPart } from './http_util.ts';
import { canonicalizeScriptId, ensureDir, scriptDirFor } from './paths.ts';

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

function sanitizeFileName(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, '-');
  return base || 'sticker.png';
}

export function stickerAssetsDir(scriptId: string): string {
  return path.join(scriptDirFor(canonicalizeScriptId(scriptId)), 'assets', 'stickers');
}

export function resolveScriptAssetPath(scriptId: string, relativePath: string): string | null {
  const clean = relativePath.replace(/^\/+/, '').replace(/\.\./g, '');
  if (!clean.startsWith('assets/')) {
    return null;
  }
  const filePath = path.join(scriptDirFor(canonicalizeScriptId(scriptId)), clean);
  if (!fileExists(filePath)) {
    return null;
  }
  return filePath;
}

export function saveStickerAsset(
  scriptId: string,
  stickerId: string,
  filePart: MultipartPart,
): { assetPath: string } {
  const ext = path.extname(filePart.fileName ?? '').toLowerCase();
  const safeExt = ALLOWED_EXT.has(ext) ? ext : '.png';
  const dir = stickerAssetsDir(scriptId);
  ensureDir(dir);
  const fileName = `${stickerId}-${sanitizeFileName(filePart.fileName ?? `sticker${safeExt}`)}`;
  const filePath = path.join(dir, fileName);
  Deno.writeFileSync(filePath, filePart.data);
  return { assetPath: `assets/stickers/${fileName}` };
}

export async function handleStickerAssetUpload(
  scriptId: string,
  request: Request,
): Promise<{ assetPath: string }> {
  const contentType = request.headers.get('content-type') ?? '';
  const boundaryMatch = /boundary=(.+)$/.exec(contentType);
  if (!boundaryMatch) {
    throw new Error('Expected multipart/form-data upload');
  }
  const body = new Uint8Array(await request.arrayBuffer());
  const parts = parseMultipart(body, boundaryMatch[1]);
  const stickerIdPart = parts.get('stickerId');
  const filePart = parts.get('file');
  if (!filePart) {
    throw new Error('Upload requires "file" field');
  }
  const stickerId =
    stickerIdPart != null
      ? new TextDecoder().decode(stickerIdPart.data).trim()
      : `s-${Date.now().toString(36)}`;
  if (!stickerId) {
    throw new Error('stickerId is required');
  }
  return saveStickerAsset(scriptId, stickerId, filePart);
}

export function deleteStickerAsset(scriptId: string, assetPath: string): boolean {
  const filePath = resolveScriptAssetPath(scriptId, assetPath);
  if (!filePath) {
    return false;
  }
  Deno.removeSync(filePath);
  return true;
}
