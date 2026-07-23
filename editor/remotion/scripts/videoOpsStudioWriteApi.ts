import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type {
  OutdoorPipMaskPersist,
  OutdoorPipMaskSyncMode,
} from '../src/lib/studio/persistOutdoorPipMask';
import {
  syncOutdoorPipMaskToAllBeatsInAnimation,
  updateOutdoorPipMaskInAnimation,
} from './dev-api/updateVideoOpsOutdoorPipMask';
import {
  updateHintLayoutsFile,
  type HintLayoutRecord,
} from './dev-api/updateVideoOpsHintLayouts';
import { handleVideoOpsStaticFileGet } from './dev-api/videoOpsStaticFileApi';
import {
  handleVideoOpsAnimationV4Get,
  handleVideoOpsRenderPropsGet,
} from './dev-api/videoOpsLiveCompileApi';

type ConnectMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void,
) => void;

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function applyCors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>,
): void {
  applyCors(res);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

/** Remotion Studio webpack dev server — same-origin writes without :3021 sidecar. */
export function createVideoOpsStudioWriteMiddleware(
  videoOpsDir: string,
  remotionDir: string,
): ConnectMiddleware {
  return (req, res, next) => {
    const url = req.url?.split('?')[0] ?? '';

    if (req.method === 'OPTIONS' && url.startsWith('/video_ops/api/')) {
      applyCors(res);
      res.statusCode = 204;
      res.end();
      return;
    }

    if (handleVideoOpsRenderPropsGet(videoOpsDir, req, res, applyCors, sendJson)) {
      return;
    }

    if (handleVideoOpsAnimationV4Get(videoOpsDir, req, res, applyCors, sendJson)) {
      return;
    }

    if (handleVideoOpsStaticFileGet(videoOpsDir, req, res, applyCors, sendJson)) {
      return;
    }

    if (req.method !== 'POST') {
      next();
      return;
    }

    if (url === '/video_ops/api/outdoor-pip-mask-sync-all') {
      void (async () => {
        try {
          const payload = JSON.parse(await readRequestBody(req)) as {
            scriptId?: string;
            pipMask?: OutdoorPipMaskPersist;
            sceneIndex?: number;
            beatCount?: number;
            mode?: OutdoorPipMaskSyncMode;
          };
          if (
            !payload.scriptId ||
            !payload.pipMask ||
            typeof payload.pipMask !== 'object' ||
            typeof payload.beatCount !== 'number' ||
            payload.beatCount <= 0 ||
            (payload.mode !== 'position' && payload.mode !== 'full')
          ) {
            sendJson(res, 400, {
              error: 'scriptId, pipMask, beatCount, and mode (position|full) are required.',
            });
            return;
          }

          syncOutdoorPipMaskToAllBeatsInAnimation(
            videoOpsDir,
            payload.scriptId,
            payload.pipMask,
            payload.sceneIndex ?? 0,
            payload.beatCount,
            payload.mode,
          );

          sendJson(res, 200, { ok: true });
        } catch (caught) {
          sendJson(res, 500, {
            error:
              caught instanceof Error
                ? caught.message
                : 'Could not sync outdoor PIP mask to all beats.',
          });
        }
      })();
      return;
    }

    if (url === '/video_ops/api/outdoor-pip-mask') {
      void (async () => {
        try {
          const payload = JSON.parse(await readRequestBody(req)) as {
            scriptId?: string;
            pipMask?: OutdoorPipMaskPersist;
            beatIndex?: number;
            sceneIndex?: number;
          };
          if (!payload.scriptId || !payload.pipMask || typeof payload.pipMask !== 'object') {
            sendJson(res, 400, { error: 'scriptId and pipMask are required.' });
            return;
          }

          const saved = updateOutdoorPipMaskInAnimation(
            videoOpsDir,
            payload.scriptId,
            payload.pipMask,
            payload.beatIndex,
            payload.sceneIndex ?? 0,
          );

          sendJson(res, 200, { ok: true, pipMask: saved });
        } catch (caught) {
          sendJson(res, 500, {
            error:
              caught instanceof Error ? caught.message : 'Could not update outdoor PIP mask.',
          });
        }
      })();
      return;
    }

    if (url === '/video_ops/api/hint-layouts') {
      void (async () => {
        try {
          const payload = JSON.parse(await readRequestBody(req)) as {
            scriptId?: string;
            path?: string;
            layouts?: Record<string, HintLayoutRecord>;
          };
          if (!payload.scriptId || !payload.path || !payload.layouts) {
            sendJson(res, 400, { error: 'scriptId, path, and layouts are required.' });
            return;
          }

          const merged = updateHintLayoutsFile(
            videoOpsDir,
            remotionDir,
            payload.scriptId,
            payload.path,
            payload.layouts,
          );

          sendJson(res, 200, { ok: true, layouts: merged });
        } catch (caught) {
          sendJson(res, 500, {
            error:
              caught instanceof Error ? caught.message : 'Could not update hint layouts.',
          });
        }
      })();
      return;
    }

    next();
  };
}

export function remotionDirFromVideoOpsRoot(videoOpsRoot: string): string {
  return path.join(videoOpsRoot, 'editor', 'remotion');
}
