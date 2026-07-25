import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  compileEpisodeFromDir,
  ANIMATION_V4_CACHE,
  type CompileEpisodeResult,
} from '../../src/lib/compile/compileEpisode.ts';
import { applyTakeOutdoorEditToRenderProps } from '../../src/lib/animation/applyTakeOutdoorEdit.ts';
import { animationDocumentFingerprint } from '../../src/lib/animation/loadAnimationDocument.ts';
import { stripOutdoorEditFromRenderProps } from '../../src/lib/animation/scriptEditingRenderProps.ts';
import { canonicalVideoOpsScriptId } from '../../src/lib/videoOpsPaths.ts';
import { resolveVideoOpsScriptDiskDir } from '../../src/lib/videoOpsScriptDiskDir.ts';

type LiveCompileEntry = {
  cacheKey: string;
  compiled: CompileEpisodeResult;
};

const liveCompileCache = new Map<string, LiveCompileEntry>();

function liveCompileCacheKey(videoOpsDir: string, scriptId: string): string {
  const scriptDir = resolveVideoOpsScriptDiskDir(videoOpsDir, scriptId);
  const animationMarkdownPath = path.join(scriptDir, 'animation.md');
  const animationMdMtime = fs.existsSync(animationMarkdownPath)
    ? fs.statSync(animationMarkdownPath).mtimeMs
    : 0;
  const v4Path = path.join(scriptDir, ANIMATION_V4_CACHE);
  const animationV4Mtime = fs.existsSync(v4Path) ? fs.statSync(v4Path).mtimeMs : 0;
  const compileScriptId = canonicalVideoOpsScriptId(scriptId);
  return `${compileScriptId}:${animationMdMtime}:${animationV4Mtime}`;
}

function probeAudioDurationSeconds(filePath: string): number | null {
  try {
    const raw = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: 'utf8' },
    ).trim();
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function scriptDirFor(videoOpsDir: string, scriptId: string): string {
  return resolveVideoOpsScriptDiskDir(videoOpsDir, scriptId);
}

/** Compile animation.md in memory (mtime-cached). Dev preview — not read from .cache/. */
export function compileEpisodeLive(
  videoOpsDir: string,
  scriptId: string,
): CompileEpisodeResult {
  const scriptDir = scriptDirFor(videoOpsDir, scriptId);
  const compileScriptId = canonicalVideoOpsScriptId(scriptId);
  const animationMarkdownPath = path.join(scriptDir, 'animation.md');
  if (!fs.existsSync(animationMarkdownPath)) {
    throw new Error(`Missing animation.md for ${compileScriptId}.`);
  }
  const cacheKey = liveCompileCacheKey(videoOpsDir, scriptId);
  const cached = liveCompileCache.get(compileScriptId);
  if (cached && cached.cacheKey === cacheKey) {
    return cached.compiled;
  }
  const compiled = compileEpisodeFromDir(scriptDir, compileScriptId, {
    probeAudioDurationSeconds,
  });
  liveCompileCache.set(compileScriptId, { cacheKey, compiled });
  return compiled;
}

export function invalidateLiveCompileCache(scriptId?: string): void {
  if (scriptId) {
    liveCompileCache.delete(canonicalVideoOpsScriptId(scriptId));
    liveCompileCache.delete(scriptId);
    return;
  }
  liveCompileCache.clear();
}

function sendCompiledJson(
  res: ServerResponse,
  applyCors: (response: ServerResponse) => void,
  compiled: CompileEpisodeResult,
  body: string,
): void {
  applyCors(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'X-Video-Ops-Fingerprint',
    animationDocumentFingerprint(JSON.stringify(compiled.renderProps)),
  );
  res.end(body);
}

function queryFlag(value: string | null): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function handleLiveCompileRoute(
  videoOpsDir: string,
  req: IncomingMessage,
  res: ServerResponse,
  routePath: string,
  applyCors: (response: ServerResponse) => void,
  sendJson: (response: ServerResponse, statusCode: number, payload: Record<string, unknown>) => void,
  serialize: (
    compiled: CompileEpisodeResult,
    context: { scriptId: string; includeOutdoorEdit: boolean; takeId?: string },
  ) => string,
): boolean {
  const url = req.url?.split('?')[0] ?? '';
  if (req.method !== 'GET' || url !== routePath) {
    return false;
  }
  const query = new URL(req.url ?? '', 'http://localhost').searchParams;
  const scriptId = query.get('scriptId')?.trim();
  if (!scriptId) {
    sendJson(res, 400, { error: 'scriptId query parameter is required.' });
    return true;
  }
  const includeOutdoorEdit = queryFlag(query.get('includeOutdoorEdit'));
  const takeId = query.get('takeId')?.trim() || undefined;
  try {
    const compiled = compileEpisodeLive(videoOpsDir, scriptId);
    sendCompiledJson(
      res,
      applyCors,
      compiled,
      serialize(compiled, { scriptId, includeOutdoorEdit, takeId }),
    );
    return true;
  } catch (caught) {
    sendJson(res, 500, {
      error: caught instanceof Error ? caught.message : 'Could not compile animation.md.',
    });
    return true;
  }
}

export function handleVideoOpsRenderPropsGet(
  videoOpsDir: string,
  req: IncomingMessage,
  res: ServerResponse,
  applyCors: (response: ServerResponse) => void,
  sendJson: (response: ServerResponse, statusCode: number, payload: Record<string, unknown>) => void,
): boolean {
  return handleLiveCompileRoute(
    videoOpsDir,
    req,
    res,
    '/video_ops/api/render-props',
    applyCors,
    sendJson,
    (compiled, { scriptId, includeOutdoorEdit, takeId }) => {
      let renderProps = includeOutdoorEdit
        ? compiled.renderProps
        : stripOutdoorEditFromRenderProps(compiled.renderProps);
      if (includeOutdoorEdit && takeId) {
        renderProps = applyTakeOutdoorEditToRenderProps(
          renderProps,
          videoOpsDir,
          scriptId,
          takeId,
        );
      }
      return JSON.stringify(renderProps);
    },
  );
}

export function handleVideoOpsAnimationV4Get(
  videoOpsDir: string,
  req: IncomingMessage,
  res: ServerResponse,
  applyCors: (response: ServerResponse) => void,
  sendJson: (response: ServerResponse, statusCode: number, payload: Record<string, unknown>) => void,
): boolean {
  return handleLiveCompileRoute(
    videoOpsDir,
    req,
    res,
    '/video_ops/api/animation-v4',
    applyCors,
    sendJson,
    (compiled) => JSON.stringify(compiled.animationV4 ?? {}),
  );
}
