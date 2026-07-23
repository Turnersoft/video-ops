import type { IncomingMessage, ServerResponse } from 'node:http';

import { updateHintLayoutsFile, type HintLayoutRecord } from './updateVideoOpsHintLayouts';

function readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

/** POST /video_ops/api/hint-layouts — persist compare hint panel positions. */
export function createHintLayoutsHandler(videoOpsDir: string, remotionDir: string) {
    return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
        if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed.' }));
            return;
        }

        try {
            const payload = JSON.parse(await readRequestBody(req)) as {
                scriptId?: string;
                path?: string;
                layouts?: Record<string, HintLayoutRecord>;
            };

            if (!payload.scriptId || !payload.path || !payload.layouts) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'scriptId, path, and layouts are required.' }));
                return;
            }

            const merged = updateHintLayoutsFile(
                videoOpsDir,
                remotionDir,
                payload.scriptId,
                payload.path,
                payload.layouts,
            );

            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ ok: true, layouts: merged }));
        } catch (caught) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(
                JSON.stringify({
                    error:
                        caught instanceof Error ? caught.message : 'Could not update hint layouts.',
                }),
            );
        }
    };
}
