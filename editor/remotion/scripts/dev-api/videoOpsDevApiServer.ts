import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME } from '../../src/lib/compile/video-ops/videoOpsAnimationMarkdown';
import { VIDEO_OPS_DEV_API_PORT } from '../../src/lib/studio/videoOpsDevApi';
import { videoOpsScriptDiskFolder } from '../../src/lib/videoOpsPaths';
import { createCompareBeatSayHandler } from './videoOpsBeatSayApi';
import { createCoverLayoutHandler } from './videoOpsCoverLayoutApi';
import { createHintLayoutsHandler } from './videoOpsHintLayoutsApi';
import { createCompareBeatFontScalesHandler } from './videoOpsBeatFontScalesApi';
import { createCompareBeatEditorNotesHandler } from './videoOpsBeatEditorNotesApi';
import { createOutdoorPipMaskHandler, createOutdoorPipMaskSyncAllHandler } from './videoOpsOutdoorPipMaskApi';
import { handleVideoOpsStaticFileGet } from './videoOpsStaticFileApi';
import {
  handleVideoOpsAnimationV4Get,
  handleVideoOpsRenderPropsGet,
  invalidateLiveCompileCache,
} from './videoOpsLiveCompileApi';
import { isAnimationMarkdownWatchSuppressed } from './videoOpsAnimationMarkdownWatchState';

const DEV_API_CAPABILITY = 'animation-markdown-v1';

let listenPromise: Promise<number> | null = null;
const animationMarkdownWatchers: fs.FSWatcher[] = [];
const animationMarkdownDebounce = new Map<string, NodeJS.Timeout>();

function scheduleLiveCompileInvalidate(scriptId: string): void {
    const existing = animationMarkdownDebounce.get(scriptId);
    if (existing) {
        clearTimeout(existing);
    }
    animationMarkdownDebounce.set(
        scriptId,
        setTimeout(() => {
            animationMarkdownDebounce.delete(scriptId);
            invalidateLiveCompileCache(scriptId);
            console.log(
                `[video-ops] ${scriptId}/${VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME} changed — live compile cache cleared`,
            );
        }, 180),
    );
}

function watchAnimationMarkdownSources(videoOpsDir: string): void {
    if (animationMarkdownWatchers.length > 0) {
        return;
    }
    const manifestPath = path.join(videoOpsDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        return;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
        scripts?: string[];
    };
    for (const scriptId of manifest.scripts ?? []) {
        const scriptDir = path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId));
        if (!fs.existsSync(scriptDir)) {
            continue;
        }
        const watcher = fs.watch(scriptDir, (_eventType, filename) => {
            if (filename?.toString() !== VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME) {
                return;
            }
            const animationMarkdownPath = path.join(
                scriptDir,
                VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME,
            );
            if (isAnimationMarkdownWatchSuppressed(animationMarkdownPath)) {
                return;
            }
            scheduleLiveCompileInvalidate(scriptId);
        });
        watcher.on('error', (error) => {
            console.warn(`[video-ops] Markdown watcher failed for ${scriptId}: ${error.message}`);
        });
        animationMarkdownWatchers.push(watcher);
    }
    console.log(
        `[video-ops] watching ${VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME} in ${animationMarkdownWatchers.length} script folders`,
    );
}

function applyCors(res: ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function warnIfStaleDevApi(): void {
    void fetch(`http://127.0.0.1:${VIDEO_OPS_DEV_API_PORT}/video_ops/api/health`)
        .then(async (response) => {
            if (!response.ok) {
                console.warn(
                    `[video-ops] Port ${VIDEO_OPS_DEV_API_PORT} is in use but health check failed — font scale / hint saves may 404. Kill the stale process and restart.`,
                );
                return;
            }
            const payload = (await response.json()) as { capability?: string };
            if (payload.capability !== DEV_API_CAPABILITY) {
                console.warn(
                    `[video-ops] Stale dev API on port ${VIDEO_OPS_DEV_API_PORT} — missing animation.md live compilation (capability ${payload.capability ?? 'unknown'}). Kill PID on :3021 and restart Studio or run \`npm run studio\`.`,
                );
            }
        })
        .catch(() => {
            console.warn(
                `[video-ops] Could not verify dev API on port ${VIDEO_OPS_DEV_API_PORT}.`,
            );
        });
}

/** Sidecar HTTP server — Remotion Studio does not use webpack-dev-server middleware. */
export function ensureVideoOpsDevApiServer(videoOpsDir: string): Promise<number> {
    if (listenPromise) {
        return listenPromise;
    }

    const remotionDir = path.join(videoOpsDir, 'editor', 'remotion');
    const beatSayHandler = createCompareBeatSayHandler(videoOpsDir);
    const coverLayoutHandler = createCoverLayoutHandler(videoOpsDir);
    const hintLayoutsHandler = createHintLayoutsHandler(videoOpsDir, remotionDir);
    const beatFontScalesHandler = createCompareBeatFontScalesHandler(videoOpsDir);
    const beatEditorNotesHandler = createCompareBeatEditorNotesHandler(videoOpsDir);
    const outdoorPipMaskHandler = createOutdoorPipMaskHandler(videoOpsDir);
    const outdoorPipMaskSyncAllHandler = createOutdoorPipMaskSyncAllHandler(videoOpsDir);

    listenPromise = new Promise((resolve, reject) => {
        const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
            const url = req.url?.split('?')[0] ?? '';

            if (req.method === 'OPTIONS' && url.startsWith('/video_ops/api/')) {
                applyCors(res);
                res.statusCode = 204;
                res.end();
                return;
            }

            if (url === '/video_ops/api/health' && req.method === 'GET') {
                applyCors(res);
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ ok: true, capability: DEV_API_CAPABILITY }));
                return;
            }

            if (
                handleVideoOpsRenderPropsGet(videoOpsDir, req, res, applyCors, (response, statusCode, payload) => {
                    applyCors(response);
                    response.statusCode = statusCode;
                    response.setHeader('Content-Type', 'application/json; charset=utf-8');
                    response.end(JSON.stringify(payload));
                })
            ) {
                return;
            }

            if (
                handleVideoOpsAnimationV4Get(videoOpsDir, req, res, applyCors, (response, statusCode, payload) => {
                    applyCors(response);
                    response.statusCode = statusCode;
                    response.setHeader('Content-Type', 'application/json; charset=utf-8');
                    response.end(JSON.stringify(payload));
                })
            ) {
                return;
            }

            if (
                handleVideoOpsStaticFileGet(videoOpsDir, req, res, applyCors, (response, statusCode, payload) => {
                    applyCors(response);
                    response.statusCode = statusCode;
                    response.setHeader('Content-Type', 'application/json; charset=utf-8');
                    response.end(JSON.stringify(payload));
                })
            ) {
                return;
            }

            if (url === '/video_ops/api/compare-beat-say' && req.method === 'POST') {
                applyCors(res);
                void beatSayHandler(req, res);
                return;
            }

            if (url === '/video_ops/api/cover-layout' && req.method === 'POST') {
                applyCors(res);
                void coverLayoutHandler(req, res);
                return;
            }

            if (url === '/video_ops/api/hint-layouts' && req.method === 'POST') {
                applyCors(res);
                void hintLayoutsHandler(req, res);
                return;
            }

            if (url === '/video_ops/api/outdoor-pip-mask-sync-all' && req.method === 'POST') {
                applyCors(res);
                void outdoorPipMaskSyncAllHandler(req, res);
                return;
            }

            if (url === '/video_ops/api/outdoor-pip-mask' && req.method === 'POST') {
                applyCors(res);
                void outdoorPipMaskHandler(req, res);
                return;
            }

            if (url === '/video_ops/api/compare-beat-font-scales' && req.method === 'POST') {
                applyCors(res);
                void beatFontScalesHandler(req, res);
                return;
            }

            if (url === '/video_ops/api/compare-beat-editor-notes' && req.method === 'POST') {
                applyCors(res);
                void beatEditorNotesHandler(req, res);
                return;
            }

            if (url === '/video_ops/api/compare-font-scales' && req.method === 'POST') {
                applyCors(res);
                void beatFontScalesHandler(req, res);
                return;
            }

            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Not found.' }));
        });

        server.listen(VIDEO_OPS_DEV_API_PORT, process.env.VIDEO_OPS_DEV_API_HOST ?? '127.0.0.1', () => {
            const host = process.env.VIDEO_OPS_DEV_API_HOST ?? '127.0.0.1';
            console.log(
                `[video-ops] dev write API listening on http://${host}:${VIDEO_OPS_DEV_API_PORT}`,
            );
            watchAnimationMarkdownSources(videoOpsDir);
            resolve(VIDEO_OPS_DEV_API_PORT);
        });

        server.on('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {
                console.log(`[video-ops] dev write API already on port ${VIDEO_OPS_DEV_API_PORT}`);
                warnIfStaleDevApi();
                resolve(VIDEO_OPS_DEV_API_PORT);
                return;
            }
            listenPromise = null;
            reject(error);
        });
    });

    return listenPromise;
}
