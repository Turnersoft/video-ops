import type { IncomingMessage, ServerResponse } from 'node:http';

import { updateBeatEditorNotesInAnimation } from './updateVideoOpsBeatEditorNotes';

function readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

/** POST /video_ops/api/compare-beat-editor-notes */
export function createCompareBeatEditorNotesHandler(videoOpsDir: string) {
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
                comment?: string;
                allowScriptChange?: boolean;
            };

            if (
                !payload.scriptId ||
                typeof payload.beatIndex !== 'number' ||
                typeof payload.comment !== 'string' ||
                typeof payload.allowScriptChange !== 'boolean'
            ) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(
                    JSON.stringify({
                        error: 'scriptId, beatIndex, comment, and allowScriptChange are required.',
                    }),
                );
                return;
            }

            const saved = updateBeatEditorNotesInAnimation(
                videoOpsDir,
                payload.scriptId,
                payload.beatIndex,
                payload.comment,
                payload.allowScriptChange,
                payload.sceneIndex ?? 0,
            );

            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: true, ...saved }));
        } catch (caught) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(
                JSON.stringify({
                    error:
                        caught instanceof Error
                            ? caught.message
                            : 'Could not update beat editor notes.',
                }),
            );
        }
    };
}
