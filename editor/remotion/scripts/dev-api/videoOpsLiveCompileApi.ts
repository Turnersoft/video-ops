import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  compileEpisodeFromDir,
  type CompileEpisodeResult,
} from '../../src/lib/compile/compileEpisode.ts';
import { animationDocumentFingerprint } from '../../src/lib/animation/loadAnimationDocument.ts';
import { videoOpsScriptDiskFolder } from '../../src/lib/videoOpsPaths.ts';

type LiveCompileEntry = {
  mtimeMs: number;
  compiled: CompileEpisodeResult;
};

const liveCompileCache = new Map<string, LiveCompileEntry>();

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
  return path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId));
}

/** Compile animation.md in memory (mtime-cached). Dev preview — not read from .cache/. */
export function compileEpisodeLive(
  videoOpsDir: string,
  scriptId: string,
): CompileEpisodeResult {
  const scriptDir = scriptDirFor(videoOpsDir, scriptId);
  const animationMarkdownPath = path.join(scriptDir, 'animation.md');
  if (!fs.existsSync(animationMarkdownPath)) {
    throw new Error(`Missing animation.md for ${scriptId}.`);
  }
  const mtimeMs = fs.statSync(animationMarkdownPath).mtimeMs;
  const cached = liveCompileCache.get(scriptId);
  if (cached && cached.mtimeMs === mtimeMs) {
    return cached.compiled;
  }
  const compiled = compileEpisodeFromDir(scriptDir, scriptId, {
    probeAudioDurationSeconds,
  });
  liveCompileCache.set(scriptId, { mtimeMs, compiled });
  return compiled;
}

export function invalidateLiveCompileCache(scriptId?: string): void {
  if (scriptId) {
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

function handleLiveCompileRoute(
  videoOpsDir: string,
  req: IncomingMessage,
  res: ServerResponse,
  routePath: string,
  applyCors: (response: ServerResponse) => void,
  sendJson: (response: ServerResponse, statusCode: number, payload: Record<string, unknown>) => void,
  serialize: (compiled: CompileEpisodeResult) => string,
): boolean {
  const url = req.url?.split('?')[0] ?? '';
  if (req.method !== 'GET' || url !== routePath) {
    return false;
  }
  const scriptId = new URL(req.url ?? '', 'http://localhost').searchParams.get('scriptId')?.trim();
  if (!scriptId) {
    sendJson(res, 400, { error: 'scriptId query parameter is required.' });
    return true;
  }
  try {
    const compiled = compileEpisodeLive(videoOpsDir, scriptId);
    sendCompiledJson(res, applyCors, compiled, serialize(compiled));
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
    (compiled) => JSON.stringify(compiled.renderProps),
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
