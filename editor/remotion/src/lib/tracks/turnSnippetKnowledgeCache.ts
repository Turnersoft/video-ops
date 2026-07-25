import init, { TurnLspWasm } from '@turn-user/language_server/web_pkg/turn_lsp';
import type { KnowledgeData } from '@turn-user/language_server/vscode_extension/src/visualization/knowledge/types';

import { videoOpsDevApiUrl } from '../studio/videoOpsDevApi';
import { turnSourceSnapshotPath } from './turnSourceRegistry';

let wasmInitPromise: Promise<void> | null = null;

/** FNV-1a hash — kept for tooling that still fingerprints Turn snippets. */
export function stableTextHash(text: string): string {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
}

export type TurnKnowledgeLoadOptions = {
    /** Script id — forwarded to the ad-hoc LSP analysis API. */
    scriptId?: string;
};

async function ensureTurnLspWasmInit(): Promise<void> {
    if (!wasmInitPromise) {
        wasmInitPromise = init().then(() => undefined);
    }
    await wasmInitPromise;
}

async function analyzeTurnKnowledge(sourceFile: string | undefined, sourceText: string): Promise<KnowledgeData | null> {
    await ensureTurnLspWasmInit();
    // Fresh instance per analyze — TurnLspWasm keeps incremental workspace/render caches.
    const wasm = new TurnLspWasm();
    try {
        const basePath = turnSourceSnapshotPath(sourceFile);
        const leaf = basePath.split('/').pop() ?? 'video-snippet.turn';
        const path = `${stableTextHash(sourceText)}-${leaf}`;
        const uri = `file:///${path}`;
        const result = wasm.analyze_workspace({
            files: [{ uri, path, text: sourceText }],
            active_uri: uri,
        } as object) as unknown as { math_output?: KnowledgeData; knowledge?: KnowledgeData };
        return result.math_output ?? result.knowledge ?? null;
    } finally {
        wasm.free();
    }
}

async function fetchTurnKnowledgeFromDevApi(
    sourceText: string,
    sourceFile: string | undefined,
    scriptId?: string,
): Promise<KnowledgeData | null> {
    try {
        const response = await fetch(videoOpsDevApiUrl('/video_ops/api/turn-knowledge'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceText, sourceFile, scriptId }),
            cache: 'no-store',
        });
        if (!response.ok) {
            return null;
        }
        const payload = (await response.json()) as { knowledge?: KnowledgeData | null };
        return payload.knowledge ?? null;
    } catch {
        return null;
    }
}

/**
 * Analyze Turn source ad-hoc via knowledge LSP — no disk or in-memory result cache.
 * Call again whenever the editor source text changes.
 */
export function knowledgeDataForTurnSource(
    sourceFile: string | undefined,
    sourceText: string,
    options?: TurnKnowledgeLoadOptions,
): Promise<KnowledgeData | null> {
    return (async () => {
        const fromDevApi = await fetchTurnKnowledgeFromDevApi(
            sourceText,
            sourceFile,
            options?.scriptId,
        );
        if (fromDevApi?.file?.document) {
            return fromDevApi;
        }
        return analyzeTurnKnowledge(sourceFile, sourceText);
    })().catch(() => null);
}
