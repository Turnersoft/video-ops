// /Users/johndoe/Documents/company/basic_ui/tooling/videoOpsScriptPaths.ts
import fs from 'node:fs';
import path from 'node:path';

import {
    VIDEO_OPS_SCRIPTS_ROOT,
    videoOpsScriptFolder,
    videoOpsScriptSeries,
} from '../../src/lib/videoOpsPaths';
import { VIDEO_OPS_DIR } from './videoOpsRoot';

export { VIDEO_OPS_DIR };

const SCRIPT_MARKDOWN = 'script.md';

const RESERVED = new Set(['shared', 'series.json']);

/** Script folder slug (no path, no .md). */
function normalizeScriptId(value: string): string {
    return value.replace(/\.md$/i, '').trim();
}

function listEpisodeIdsInSeries(seriesDir: string): string[] {
    if (!fs.existsSync(seriesDir)) {
        return [];
    }

    const entries = fs.readdirSync(seriesDir, { withFileTypes: true });
    const folderIds = entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_') && !RESERVED.has(entry.name))
        .filter((entry) => fs.existsSync(path.join(seriesDir, entry.name, SCRIPT_MARKDOWN)))
        .map((entry) => entry.name)
        .sort();

    if (folderIds.length > 0) {
        return folderIds;
    }

    // Legacy flat layout: series/*.md
    return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('README'))
        .map((entry) => normalizeScriptId(entry.name))
        .sort();
}

export function listAllScriptIds(videoOpsDir: string): string[] {
    const scriptsRoot = path.join(videoOpsDir, VIDEO_OPS_SCRIPTS_ROOT);
    if (!fs.existsSync(scriptsRoot)) {
        return [];
    }
    const ids: string[] = [];
    for (const entry of fs.readdirSync(scriptsRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || RESERVED.has(entry.name)) {
            continue;
        }
        ids.push(...listEpisodeIdsInSeries(path.join(scriptsRoot, entry.name)));
    }
    return ids.sort();
}

export function listScriptIds(scriptRoot: string): string[] {
    return listEpisodeIdsInSeries(scriptRoot);
}

export function resolveScriptMarkdownPath(videoOpsDir: string, scriptId: string): string {
    const normalized = normalizeScriptId(scriptId);
    if (!normalized || normalized.includes('..') || normalized.includes('/')) {
        throw new Error('Invalid script id.');
    }

    const series = videoOpsScriptSeries(normalized);
    const folderPath = path.join(videoOpsDir, VIDEO_OPS_SCRIPTS_ROOT, series, normalized, SCRIPT_MARKDOWN);
    if (fs.existsSync(folderPath)) {
        return folderPath;
    }

    throw new Error(`Script not found: ${normalized}`);
}

export function resolveScriptFolderRelativePath(scriptId: string): string {
    return videoOpsScriptFolder(normalizeScriptId(scriptId));
}

export function resolveScriptCollection(scriptId: string) {
    return videoOpsScriptSeries(normalizeScriptId(scriptId));
}

export function scriptDirForId(scriptId: string, videoOpsDir = VIDEO_OPS_DIR): string {
    const series = resolveScriptCollection(scriptId);
    return path.join(videoOpsDir, VIDEO_OPS_SCRIPTS_ROOT, series, normalizeScriptId(scriptId));
}
