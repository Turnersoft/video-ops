// /Users/johndoe/Documents/company/basic_ui/src/shared/turn-video/ide/turnSnippetKnowledgeCache.ts
import init, { TurnLspWasm } from '@turn-user/language_server/web_pkg/turn_lsp';
import type { KnowledgeData } from '@turn-user/language_server/vscode_extension/src/visualization/knowledge/types';

import { turnKnowledgeCacheStaticPath } from '../videoOpsPaths';
import { turnSourceSnapshotPath } from './turnSourceRegistry';

type CachedKnowledge = {
    sourceHash: string;
    promise: Promise<KnowledgeData | null>;
};

const knowledgeCache = new Map<string, CachedKnowledge>();
let wasmPromise: Promise<TurnLspWasm> | null = null;

/** FNV-1a hash for cache keys. Must match warmTurnKnowledgeCache.mjs and use raw file text (no trim). */
export function stableTextHash(text: string): string {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
}

/** Public path for a pre-warmed LSP payload (written by warmTurnKnowledgeCache.mjs). */
export function knowledgeCacheStaticPath(
    sourceFile: string | undefined,
    sourceHash: string,
): string {
    return turnKnowledgeCacheStaticPath(sourceFile, sourceHash);
}

export type TurnKnowledgeLoadOptions = {
    /** Try disk cache first (Remotion staticFile / fetch). */
    fetchJson?: (relativePublicPath: string) => Promise<KnowledgeData | null>;
};

async function turnLspWasm(): Promise<TurnLspWasm> {
    if (!wasmPromise) {
        wasmPromise = init().then(() => new TurnLspWasm());
    }
    return wasmPromise;
}

async function analyzeTurnKnowledge(sourceFile: string | undefined, sourceText: string): Promise<KnowledgeData | null> {
    const wasm = await turnLspWasm();
    const path = turnSourceSnapshotPath(sourceFile);
    const uri = `file:///${path.split('/').pop() ?? 'video-snippet.turn'}`;
    const result = wasm.analyze_workspace({
        files: [{ uri, path, text: sourceText }],
        active_uri: uri,
    } as object) as unknown as { math_output?: KnowledgeData; knowledge?: KnowledgeData };
    return result.math_output ?? result.knowledge ?? null;
}

/** Analyze a full Turn source once and reuse it until the source text changes. */
export function knowledgeDataForTurnSource(
    sourceFile: string | undefined,
    sourceText: string,
    options?: TurnKnowledgeLoadOptions,
): Promise<KnowledgeData | null> {
    const sourceHash = stableTextHash(sourceText);
    const cacheKey = `${sourceFile ?? 'inline'}:${sourceHash}`;
    const cached = knowledgeCache.get(cacheKey);
    if (cached?.sourceHash === sourceHash) {
        return cached.promise;
    }

    const promise = (async () => {
        const diskPath = knowledgeCacheStaticPath(sourceFile, sourceHash);
        if (options?.fetchJson) {
            const hashCandidates = [sourceHash];
            const trimmed = sourceText.trim();
            const trimmedHash = stableTextHash(trimmed);
            const trimmedNewlineHash = stableTextHash(`${trimmed}\n`);
            if (!hashCandidates.includes(trimmedHash)) {
                hashCandidates.push(trimmedHash);
            }
            if (!hashCandidates.includes(trimmedNewlineHash)) {
                hashCandidates.push(trimmedNewlineHash);
            }
            for (const hash of hashCandidates) {
                const fromDisk = await options.fetchJson(knowledgeCacheStaticPath(sourceFile, hash));
                if (fromDisk?.file?.document) {
                    return fromDisk;
                }
            }
        }
        return analyzeTurnKnowledge(sourceFile, sourceText);
    })().catch(() => null);

    knowledgeCache.set(cacheKey, { sourceHash, promise });
    return promise;
}
