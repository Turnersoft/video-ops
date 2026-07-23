import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { VIDEO_OPS_PROJECTS_DIR } from '../../src/lib/videoOpsPaths';

export function resolveProjectsStaticPath(
  videoOpsDir: string,
  relativePath: string,
): string | null {
  const clean = relativePath.replace(/^\/+/, '');
  const abs = path.resolve(videoOpsDir, VIDEO_OPS_PROJECTS_DIR, clean);
  const projectsRoot = path.resolve(videoOpsDir, VIDEO_OPS_PROJECTS_DIR);
  if (!abs.startsWith(`${projectsRoot}${path.sep}`) && abs !== projectsRoot) {
    return null;
  }
  return abs;
}

export function handleVideoOpsStaticFileGet(
  videoOpsDir: string,
  req: IncomingMessage,
  res: ServerResponse,
  applyCors: (response: ServerResponse) => void,
  sendJson: (response: ServerResponse, statusCode: number, payload: Record<string, unknown>) => void,
): boolean {
  const url = req.url?.split('?')[0] ?? '';
  if (req.method !== 'GET' || url !== '/video_ops/api/static-file') {
    return false;
  }
  const query = new URL(req.url ?? '', 'http://localhost').searchParams;
  const relativePath = query.get('path');
  if (!relativePath?.trim()) {
    sendJson(res, 400, { error: 'path query parameter is required.' });
    return true;
  }
  const abs = resolveProjectsStaticPath(videoOpsDir, relativePath);
  if (!abs) {
    sendJson(res, 400, { error: 'Invalid static path.' });
    return true;
  }
  if (!fs.existsSync(abs)) {
    sendJson(res, 404, {
      error: `Missing ${relativePath}. Run npm run sync in remotion/.`,
    });
    return true;
  }
  applyCors(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(fs.readFileSync(abs, 'utf8'));
  return true;
}
