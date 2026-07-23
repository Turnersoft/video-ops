#!/usr/bin/env node
/**
 * Pre-analyze Turn sources referenced by IDE tracks (generateFromSource) via WASM LSP.
 * Writes JSON under video_ops/projects/.cache/turn-knowledge-cache/ for Remotion staticFile().
 *
 * Usage:
 *   node scripts/warmTurnKnowledgeCache.mjs 01-set
 *   node scripts/warmTurnKnowledgeCache.mjs --all
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    ANIMATION_V4_CACHE_REL,
    readAnimationV4Cache,
    resolveSharedAssetPath,
    scriptFolderRelative,
} from './scriptSeries.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const remotionDir = path.resolve(__dirname, '..');

function resolveVideoOpsRoot(startDir) {
    let dir = startDir;
    for (let i = 0; i < 6; i += 1) {
        if (
            fs.existsSync(path.join(dir, 'manifest.json')) &&
            (fs.existsSync(path.join(dir, 'projects')) || fs.existsSync(path.join(dir, 'scripts')))
        ) {
            return dir;
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return path.resolve(startDir, '../..');
}

const videoOpsDir = resolveVideoOpsRoot(remotionDir);
// Match repoPaths.ts: codetree lives beside video_ops under company/, not under Documents/.
const turnUserRoot = path.resolve(videoOpsDir, '../codetree/turn/turn-user');
const wasmDir = path.join(turnUserRoot, 'language_server/web_pkg');
const turnLspJs = path.join(wasmDir, 'turn_lsp.js');
const turnLspWasm = path.join(wasmDir, 'turn_lsp_bg.wasm');

function scriptFolder(scriptId) {
    return scriptFolderRelative(videoOpsDir, scriptId);
}

function stableTextHash(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
}

const TURN_KNOWLEDGE_CACHE_REL = '.cache/turn-knowledge-cache';

function cacheStaticPath(sourceFile, sourceHash) {
    const safe = (sourceFile ?? 'inline').replace(/[@/]/g, '_');
    return `${TURN_KNOWLEDGE_CACHE_REL}/${safe}-${sourceHash}.json`;
}

function resolveTurnSourcePath(sourceFile) {
    if (sourceFile.startsWith('@turn-user/')) {
        return path.join(turnUserRoot, sourceFile.replace('@turn-user/', ''));
    }
    if (sourceFile.startsWith('shared/')) {
        return resolveSharedAssetPath(videoOpsDir, sourceFile);
    }
    return path.join(videoOpsDir, sourceFile);
}

function collectTrackRefs(scriptId) {
    const renderPropsPath = path.join(videoOpsDir, scriptFolder(scriptId), '.cache/render-props.json');
    if (fs.existsSync(renderPropsPath)) {
        const renderProps = JSON.parse(fs.readFileSync(renderPropsPath, 'utf8'));
        const refs = [];
        const seen = new Set();
        const add = (trackPath) => {
            if (typeof trackPath !== 'string' || !trackPath || seen.has(trackPath)) {
                return;
            }
            const absolute = path.join(videoOpsDir, scriptFolder(scriptId), trackPath);
            if (!fs.existsSync(absolute)) {
                return;
            }
            seen.add(trackPath);
            refs.push({ scriptId, trackPath });
        };
        for (const scene of renderProps.scenes ?? []) {
            for (const layer of scene.layers ?? []) {
                add(layer.turnTrack);
                if (typeof layer.track === 'string') {
                    add(layer.track);
                }
            }
        }
        return refs;
    }
    return [];
}

async function warmV4CompareBeats(scriptId, anim) {
    if (anim?.version !== 4) {
        return false;
    }
    const seenHashes = new Set();
    for (const scene of anim.scenes ?? []) {
        let previousTurn = '';
        for (const beat of scene.compare?.beats ?? []) {
            let code = beat.turn?.code;
            if (typeof code !== 'string') {
                continue;
            }
            if (code.trim().toLowerCase() === 'as before') {
                code = previousTurn;
            }
            if (!code.trim()) {
                continue;
            }
            previousTurn = code;
            const hash = stableTextHash(code);
            if (seenHashes.has(hash)) {
                continue;
            }
            seenHashes.add(hash);
            await warmInlineBeatCode(`inline:${scriptId}`, code);
        }
    }
    return true;
}

function manifestScriptIds() {
    const manifestPath = path.join(videoOpsDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        return [];
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return Array.isArray(manifest.scripts) ? manifest.scripts : [];
}

let wasmModulePromise = null;

function assertTurnLspWasmBuilt() {
    if (!fs.existsSync(turnLspJs) || !fs.existsSync(turnLspWasm)) {
        throw new Error(
            `Turn LSP WASM not found under ${wasmDir}. ` +
                'Build it from basic_ui: npm run build:turn-lsp-wasm:dev',
        );
    }
}

async function loadTurnLspWasm() {
    if (!wasmModulePromise) {
        wasmModulePromise = (async () => {
            assertTurnLspWasmBuilt();
            const { default: init, TurnLspWasm } = await import(turnLspJs);
            await init(fs.readFileSync(turnLspWasm));
            return new TurnLspWasm();
        })();
    }
    return wasmModulePromise;
}

async function writeKnowledgeCache(sourceFile, text, label) {
    const sourceHash = stableTextHash(text);
    const relativeOut = cacheStaticPath(sourceFile, sourceHash);
    const outPath = path.join(videoOpsDir, 'projects', relativeOut);

    if (fs.existsSync(outPath)) {
        console.log(`[warm-knowledge] cache hit ${relativeOut}`);
        return;
    }

    const wasm = await loadTurnLspWasm();
    const basename = sourceFile ? path.basename(resolveTurnSourcePath(sourceFile)) : 'snippet.turn';
    const uri = `file:///${basename}`;
    const result = wasm.analyze_workspace({
        files: [{ uri, path: basename, text }],
        active_uri: uri,
    });

    const knowledge = result.math_output ?? result.knowledge ?? null;
    if (!knowledge?.file?.document) {
        console.warn(`[warm-knowledge] no knowledge payload for ${label}`);
        return;
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(knowledge, null, 2)}\n`, 'utf8');
    console.log(`[warm-knowledge] wrote ${relativeOut}`);
}

async function warmSourceFile(sourceFile) {
    const sourcePath = resolveTurnSourcePath(sourceFile);
    if (!fs.existsSync(sourcePath)) {
        console.warn(`[warm-knowledge] missing source ${sourcePath}`);
        return;
    }

    const text = fs.readFileSync(sourcePath, 'utf8');
    await writeKnowledgeCache(sourceFile, text, sourceFile);
}

async function warmInlineBeatCode(sourceFile, code) {
    if (!code?.trim()) {
        return;
    }
    await writeKnowledgeCache(sourceFile, code, `inline beat (${code.length} chars)`);
}

async function warmTrack(scriptId, trackPath) {
    const trackFile = path.join(videoOpsDir, scriptFolder(scriptId), trackPath);
    if (!fs.existsSync(trackFile)) {
        console.warn(`[warm-knowledge] missing track ${trackFile}`);
        return;
    }
    const track = JSON.parse(fs.readFileSync(trackFile, 'utf8'));
    if (!track.knowledgePanel?.generateFromSource) {
        return;
    }

    const seenHashes = new Set();
    for (const segment of track.beatCodeSegments ?? []) {
        const code = segment?.code;
        if (!code?.trim()) {
            continue;
        }
        const hash = stableTextHash(code);
        if (seenHashes.has(hash)) {
            continue;
        }
        seenHashes.add(hash);
        await warmInlineBeatCode(track.sourceFile, code);
    }

    if (track.sourceFile) {
        await warmSourceFile(track.sourceFile);
    }
}

async function warmScript(scriptId) {
    const anim = readAnimationV4Cache(videoOpsDir, scriptId);
    if (!anim) {
        console.warn(
            `[warm-knowledge] ${scriptId}: missing ${ANIMATION_V4_CACHE_REL} — run npm run sync first`,
        );
        return;
    }
    await warmV4CompareBeats(scriptId, anim);
    for (const ref of collectTrackRefs(scriptId)) {
        await warmTrack(ref.scriptId, ref.trackPath);
    }
}

const argv = process.argv.slice(2);
const warmAll = argv.includes('--all');
const scriptIds = warmAll ? manifestScriptIds() : argv.filter((arg) => !arg.startsWith('-'));

if (scriptIds.length === 0) {
    console.error('Usage: node scripts/warmTurnKnowledgeCache.mjs <script-id> | --all');
    process.exit(1);
}

try {
    for (const scriptId of scriptIds) {
        await warmScript(scriptId);
    }
} catch (error) {
    if (error instanceof Error && error.message.includes('Turn LSP WASM not found')) {
        console.warn(`[warm-knowledge] ${error.message}`);
        console.warn('[warm-knowledge] Skipping cache warm — Studio will still start.');
        process.exit(0);
    }
    throw error;
}
