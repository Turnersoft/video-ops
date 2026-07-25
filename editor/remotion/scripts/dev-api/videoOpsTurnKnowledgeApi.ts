import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { KnowledgeData } from '@turn-user/language_server/vscode_extension/src/visualization/knowledge/types';

import { VIDEO_OPS_DIR } from './videoOpsRoot';

function readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

function turnUserRoot(): string {
    return path.resolve(VIDEO_OPS_DIR, '../codetree/turn/turn-user');
}

function assertTurnLspWasmBuilt(wasmDir: string): void {
    const turnLspJs = path.join(wasmDir, 'turn_lsp.js');
    const turnLspWasm = path.join(wasmDir, 'turn_lsp_bg.wasm');
    if (!fs.existsSync(turnLspJs) || !fs.existsSync(turnLspWasm)) {
        throw new Error(
            `Turn LSP WASM not found under ${wasmDir}. ` +
                'Build it from basic_ui: npm run build:turn-lsp-wasm:dev',
        );
    }
}

type TurnLspWasmInstance = {
    analyze_workspace: (input: object) => { math_output?: KnowledgeData; knowledge?: KnowledgeData };
    free: () => void;
};

type TurnLspWasmCtor = new () => TurnLspWasmInstance;

let wasmReadyPromise: Promise<TurnLspWasmCtor> | null = null;

/** Init WASM once; construct a fresh TurnLspWasm per analyze (instance keeps incremental workspace state). */
async function loadTurnLspWasmCtor(): Promise<TurnLspWasmCtor> {
    if (!wasmReadyPromise) {
        wasmReadyPromise = (async () => {
            const wasmDir = path.join(turnUserRoot(), 'language_server/web_pkg');
            assertTurnLspWasmBuilt(wasmDir);
            const turnLspJs = path.join(wasmDir, 'turn_lsp.js');
            const turnLspWasm = path.join(wasmDir, 'turn_lsp_bg.wasm');
            const { default: init, TurnLspWasm } = (await import(turnLspJs)) as {
                default: (wasmBytes: Buffer) => Promise<void>;
                TurnLspWasm: TurnLspWasmCtor;
            };
            await init(fs.readFileSync(turnLspWasm));
            return TurnLspWasm;
        })();
    }
    return wasmReadyPromise;
}

async function analyzeTurnKnowledge(sourceText: string): Promise<KnowledgeData | null> {
    const TurnLspWasm = await loadTurnLspWasmCtor();
    const wasm = new TurnLspWasm();
    try {
        // Unique path per call so incremental caches cannot reuse a prior file's math_output.
        const basename = `snippet-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.turn`;
        const uri = `file:///${basename}`;
        const result = wasm.analyze_workspace({
            files: [{ uri, path: basename, text: sourceText }],
            active_uri: uri,
        });
        return result.math_output ?? result.knowledge ?? null;
    } finally {
        wasm.free();
    }
}

/** POST /video_ops/api/turn-knowledge — ad-hoc Turn LSP analysis (no disk cache). */
export function createTurnKnowledgeHandler(videoOpsDir: string) {
    void videoOpsDir;

    return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
        if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Method not allowed.' }));
            return;
        }

        try {
            const payload = JSON.parse(await readRequestBody(req)) as {
                sourceText?: string;
            };

            if (typeof payload.sourceText !== 'string' || payload.sourceText.length === 0) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'sourceText is required.' }));
                return;
            }

            const knowledge = await analyzeTurnKnowledge(payload.sourceText);
            if (!knowledge?.file?.document) {
                res.statusCode = 422;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'Turn LSP returned no knowledge payload.' }));
                return;
            }

            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify({ ok: true, knowledge }));
        } catch (caught) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(
                JSON.stringify({
                    error: caught instanceof Error ? caught.message : 'Turn knowledge analysis failed.',
                }),
            );
        }
    };
}
