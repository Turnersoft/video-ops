import type { IncomingMessage, ServerResponse } from 'node:http';

import { updateBeatSayInAnimation } from './updateVideoOpsBeatSay';

function readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

/** POST /video_ops/api/compare-beat-say — shared by Vite plugin and Remotion Studio dev server. */
export function createCompareBeatSayHandler(videoOpsDir: string) {
    return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
        if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed.' }));
            return;
        }

        try {
            const payload = JSON.parse(await readRequestBody(req)) as {
                scriptId?: string;
                beatIndex?: number;
                sceneIndex?: number;
                say?: string;
            };

            if (
                !payload.scriptId ||
                typeof payload.beatIndex !== 'number' ||
                typeof payload.say !== 'string'
            ) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'scriptId, beatIndex, and say are required.' }));
                return;
            }

            const saved = updateBeatSayInAnimation(
                videoOpsDir,
                payload.scriptId,
                payload.beatIndex,
                payload.say,
                payload.sceneIndex ?? 0,
            );

            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: true, say: saved }));
        } catch (caught) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(
                JSON.stringify({
                    error: caught instanceof Error ? caught.message : 'Could not update beat say.',
                }),
            );
        }
    };
}

/** Webpack dev-server middleware for Remotion Studio (port 3000). */
export function compareBeatSayDevServerMiddleware(videoOpsDir: string) {
    const handler = createCompareBeatSayHandler(videoOpsDir);
    return (
        req: IncomingMessage,
        res: ServerResponse,
        next: (error?: Error) => void,
    ): void => {
        const url = req.url?.split('?')[0] ?? '';
        if (url !== '/video_ops/api/compare-beat-say') {
            next();
            return;
        }
        void handler(req, res);
    };
}
