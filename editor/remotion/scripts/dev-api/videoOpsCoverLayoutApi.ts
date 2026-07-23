import type { IncomingMessage, ServerResponse } from 'node:http';

import type { VideoOpsCoverOverride } from '../../src/lib/cover/videoOpsCover';
import { updateCoverInAnimation } from './updateVideoOpsCoverLayout';

function readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

/** POST /video_ops/api/cover-layout — persist cover editor state to animation.json. */
export function createCoverLayoutHandler(videoOpsDir: string) {
    return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
        if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed.' }));
            return;
        }

        try {
            const payload = JSON.parse(await readRequestBody(req)) as {
                scriptId?: string;
                cover?: VideoOpsCoverOverride;
            };

            if (!payload.scriptId || !payload.cover || typeof payload.cover !== 'object') {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'scriptId and cover are required.' }));
                return;
            }

            const saved = updateCoverInAnimation(videoOpsDir, payload.scriptId, payload.cover);

            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: true, cover: saved }));
        } catch (caught) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(
                JSON.stringify({
                    error: caught instanceof Error ? caught.message : 'Could not update cover layout.',
                }),
            );
        }
    };
}

/** Webpack dev-server middleware for Remotion Studio (port 3000). */
export function coverLayoutDevServerMiddleware(videoOpsDir: string) {
    const handler = createCoverLayoutHandler(videoOpsDir);
    return (
        req: IncomingMessage,
        res: ServerResponse,
        next: (error?: Error) => void,
    ): void => {
        const url = req.url?.split('?')[0] ?? '';
        if (url !== '/video_ops/api/cover-layout') {
            next();
            return;
        }
        void handler(req, res);
    };
}
