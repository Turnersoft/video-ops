import type { IncomingMessage, ServerResponse } from 'node:http';

import type { CompareFontScales } from '../../src/lib/tracks/compareFontScale';

import {
    updateAllCompareBeatFontScalesInAnimation,
    updateCompareBeatFontScalesInAnimation,
} from './updateVideoOpsBeatFontScales';

function readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

function isCompareFontScales(value: unknown): value is CompareFontScales {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const scales = value as CompareFontScales;
    return (
        typeof scales.editorFontScale === 'number' &&
        typeof scales.leanEditorFontScale === 'number' &&
        typeof scales.renderFontScale === 'number'
    );
}

/** POST /video_ops/api/compare-beat-font-scales — persist compare zoom for all beats. */
export function createCompareBeatFontScalesHandler(videoOpsDir: string) {
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
                beatFontScales?: CompareFontScales[];
                editorFontScale?: number;
                leanEditorFontScale?: number;
                renderFontScale?: number;
            };

            if (!payload.scriptId) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'scriptId is required.' }));
                return;
            }

            const sceneIndex = payload.sceneIndex ?? 0;

            if (Array.isArray(payload.beatFontScales) && payload.beatFontScales.length > 0) {
                if (!payload.beatFontScales.every(isCompareFontScales)) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json; charset=utf-8');
                    res.end(
                        JSON.stringify({
                            error: 'Each beatFontScales entry must include all three font scales.',
                        }),
                    );
                    return;
                }

                const saved = updateAllCompareBeatFontScalesInAnimation(
                    videoOpsDir,
                    payload.scriptId,
                    payload.beatFontScales,
                    sceneIndex,
                );

                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ ok: true, beatFontScales: saved }));
                return;
            }

            if (
                typeof payload.beatIndex !== 'number' ||
                typeof payload.editorFontScale !== 'number' ||
                typeof payload.leanEditorFontScale !== 'number' ||
                typeof payload.renderFontScale !== 'number'
            ) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(
                    JSON.stringify({
                        error:
                            'Provide beatFontScales[] or beatIndex with all three font scales.',
                    }),
                );
                return;
            }

            const scales: CompareFontScales = {
                editorFontScale: payload.editorFontScale,
                leanEditorFontScale: payload.leanEditorFontScale,
                renderFontScale: payload.renderFontScale,
            };

            updateCompareBeatFontScalesInAnimation(
                videoOpsDir,
                payload.scriptId,
                payload.beatIndex,
                scales,
                sceneIndex,
            );

            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ ok: true, ...scales }));
        } catch (caught) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(
                JSON.stringify({
                    error:
                        caught instanceof Error
                            ? caught.message
                            : 'Could not update compare beat font scales.',
                }),
            );
        }
    };
}
