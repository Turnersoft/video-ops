import type { IncomingMessage, ServerResponse } from 'node:http';

import type {
    OutdoorPipMaskPersist,
    OutdoorPipMaskSyncMode,
} from '../../src/lib/studio/persistOutdoorPipMask';
import {
    syncOutdoorPipMaskToAllBeatsInAnimation,
    updateOutdoorPipMaskInAnimation,
} from './updateVideoOpsOutdoorPipMask';
import { invalidateLiveCompileCache } from './videoOpsLiveCompileApi';

function readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

/** POST /video_ops/api/outdoor-pip-mask — persist outdoor filmed-clip PIP box to animation.json. */
export function createOutdoorPipMaskHandler(videoOpsDir: string) {
    return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
        if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed.' }));
            return;
        }

        try {
            const payload = JSON.parse(await readRequestBody(req)) as {
                scriptId?: string;
                pipMask?: OutdoorPipMaskPersist;
                beatIndex?: number;
                sceneIndex?: number;
            };

            if (!payload.scriptId || !payload.pipMask || typeof payload.pipMask !== 'object') {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'scriptId and pipMask are required.' }));
                return;
            }

            const saved = updateOutdoorPipMaskInAnimation(
                videoOpsDir,
                payload.scriptId,
                payload.pipMask,
                payload.beatIndex,
                payload.sceneIndex ?? 0,
            );
            invalidateLiveCompileCache(payload.scriptId);

            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: true, pipMask: saved }));
        } catch (caught) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(
                JSON.stringify({
                    error:
                        caught instanceof Error ? caught.message : 'Could not update outdoor PIP mask.',
                }),
            );
        }
    };
}

/** POST /video_ops/api/outdoor-pip-mask-sync-all — copy current beat mask to every beat. */
export function createOutdoorPipMaskSyncAllHandler(videoOpsDir: string) {
    return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
        if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed.' }));
            return;
        }

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
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(
                    JSON.stringify({
                        error: 'scriptId, pipMask, beatCount, and mode (position|full) are required.',
                    }),
                );
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
            invalidateLiveCompileCache(payload.scriptId);

            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: true }));
        } catch (caught) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(
                JSON.stringify({
                    error:
                        caught instanceof Error
                            ? caught.message
                            : 'Could not sync outdoor PIP mask to all beats.',
                }),
            );
        }
    };
}
