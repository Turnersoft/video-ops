import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { BUNDLED_SCRIPTS } from './bundledScripts';
import {
    isOutdoorScript,
    isTakeManifest,
    type OutdoorScript,
    type ScriptSummary,
    type TakeManifest,
} from './scriptSchema';

const ROOT_DIR = `${FileSystem.documentDirectory ?? ''}turn-outdoor-teleprompter/`;
const SCRIPTS_DIR = `${ROOT_DIR}scripts/`;
const TAKES_DIR = `${ROOT_DIR}takes/`;
const VIDEOS_DIR = `${ROOT_DIR}videos/`;
const THUMBS_DIR = `${ROOT_DIR}thumbnails/`;

async function ensureDir(path: string): Promise<void> {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(path, { intermediates: true });
    }
}

async function ensureStorage(): Promise<void> {
    await ensureDir(ROOT_DIR);
    await ensureDir(SCRIPTS_DIR);
    await ensureDir(TAKES_DIR);
    await ensureDir(VIDEOS_DIR);
    await ensureDir(THUMBS_DIR);
}

function scriptPath(id: string): string {
    return `${SCRIPTS_DIR}${encodeURIComponent(id)}.json`;
}

const CATALOG_CACHE_PATH = `${ROOT_DIR}catalog-cache.json`;

export type CatalogCache = {
    cachedAt: string;
    catalog: unknown;
};

export async function loadScript(scriptId: string): Promise<OutdoorScript | null> {
    await ensureStorage();
    const path = scriptPath(scriptId);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
        return null;
    }
    try {
        const raw = await FileSystem.readAsStringAsync(path);
        const parsed = JSON.parse(raw) as unknown;
        return isOutdoorScript(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export async function saveCatalogCache(catalog: unknown): Promise<void> {
    await ensureStorage();
    const payload: CatalogCache = {
        cachedAt: new Date().toISOString(),
        catalog,
    };
    await FileSystem.writeAsStringAsync(CATALOG_CACHE_PATH, JSON.stringify(payload, null, 2));
}

export async function loadCatalogCache(): Promise<CatalogCache | null> {
    await ensureStorage();
    const info = await FileSystem.getInfoAsync(CATALOG_CACHE_PATH);
    if (!info.exists) {
        return null;
    }
    try {
        const raw = await FileSystem.readAsStringAsync(CATALOG_CACHE_PATH);
        const parsed = JSON.parse(raw) as CatalogCache;
        if (!parsed || typeof parsed !== 'object' || !parsed.catalog) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export async function hasCachedScripts(): Promise<boolean> {
    await ensureStorage();
    const names = await FileSystem.readDirectoryAsync(SCRIPTS_DIR);
    return names.some((entry) => entry.endsWith('.json'));
}

function takePath(takeId: string): string {
    return `${TAKES_DIR}${encodeURIComponent(takeId)}.json`;
}

function videoPath(takeId: string): string {
    return `${VIDEOS_DIR}${encodeURIComponent(takeId)}.mp4`;
}

function thumbPath(takeId: string): string {
    return `${THUMBS_DIR}${encodeURIComponent(takeId)}.jpg`;
}

export async function seedBundledScripts(): Promise<void> {
    await ensureStorage();
    for (const script of BUNDLED_SCRIPTS) {
        const path = scriptPath(script.id);
        const info = await FileSystem.getInfoAsync(path);
        if (!info.exists) {
            await FileSystem.writeAsStringAsync(path, JSON.stringify(script, null, 2));
        }
    }
}

export async function loadScripts(): Promise<OutdoorScript[]> {
    await ensureStorage();
    const names = await FileSystem.readDirectoryAsync(SCRIPTS_DIR);
    const scripts: OutdoorScript[] = [];

    for (const name of names.filter((entry) => entry.endsWith('.json'))) {
        try {
            const raw = await FileSystem.readAsStringAsync(`${SCRIPTS_DIR}${name}`);
            const parsed = JSON.parse(raw) as unknown;
            if (isOutdoorScript(parsed)) {
                scripts.push(parsed);
            }
        } catch {
            // Ignore broken files and keep the library usable.
        }
    }

    return scripts.sort((left, right) => left.title.localeCompare(right.title));
}

export async function loadTakes(): Promise<TakeManifest[]> {
    await ensureStorage();
    const names = await FileSystem.readDirectoryAsync(TAKES_DIR);
    const takes: TakeManifest[] = [];

    for (const name of names.filter((entry) => entry.endsWith('.json'))) {
        try {
            const raw = await FileSystem.readAsStringAsync(`${TAKES_DIR}${name}`);
            const parsed = JSON.parse(raw) as unknown;
            if (isTakeManifest(parsed)) {
                takes.push(parsed);
            }
        } catch {
            // Ignore broken take metadata.
        }
    }

    return takes.sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
}

export async function loadScriptSummaries(): Promise<ScriptSummary[]> {
    const [scripts, takes] = await Promise.all([loadScripts(), loadTakes()]);
    return scripts.map((script) => {
        const scriptTakes = takes.filter((take) => take.scriptId === script.id);
        return {
            script,
            takeCount: scriptTakes.length,
            lastRecordedAt: scriptTakes[0]?.recordedAt,
        };
    });
}

export async function loadTakesForScript(scriptId: string): Promise<TakeManifest[]> {
    const takes = await loadTakes();
    return takes.filter((take) => take.scriptId === scriptId);
}

export async function getTake(takeId: string): Promise<TakeManifest | null> {
    await ensureStorage();
    const path = takePath(takeId);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
        return null;
    }
    const raw = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(raw) as unknown;
    return isTakeManifest(parsed) ? parsed : null;
}

export async function saveScript(script: OutdoorScript): Promise<void> {
    await ensureStorage();
    await FileSystem.writeAsStringAsync(scriptPath(script.id), JSON.stringify(script, null, 2));
}

export async function importScriptFromPicker(): Promise<OutdoorScript> {
    const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: 'application/json',
    });

    if (result.canceled || !result.assets[0]) {
        throw new Error('No JSON script selected.');
    }

    const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const parsed = JSON.parse(raw) as unknown;
    if (!isOutdoorScript(parsed)) {
        throw new Error('This file is not a Turn outdoor script JSON.');
    }

    await saveScript(parsed);
    return parsed;
}

export async function persistRecordedVideo(sourceUri: string, takeId: string): Promise<string> {
    await ensureStorage();
    const destination = videoPath(takeId);
    await FileSystem.copyAsync({ from: sourceUri, to: destination });
    return destination;
}

export async function deleteRecordedVideo(takeId: string): Promise<void> {
    await ensureStorage();
    for (const path of [videoPath(takeId), thumbPath(takeId), takePath(takeId)]) {
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) {
            await FileSystem.deleteAsync(path, { idempotent: true });
        }
    }
}

export async function generateThumbnail(
    videoUri: string,
    takeId: string,
): Promise<string | undefined> {
    try {
        await ensureStorage();
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 1000 });
        const destination = thumbPath(takeId);
        await FileSystem.copyAsync({ from: uri, to: destination });
        return destination;
    } catch {
        return undefined;
    }
}

export async function saveTakeManifest(take: TakeManifest): Promise<string> {
    await ensureStorage();
    const path = takePath(take.takeId);
    await FileSystem.writeAsStringAsync(path, JSON.stringify(take, null, 2));
    return path;
}

export async function shareTakeManifest(take: TakeManifest): Promise<void> {
    const path = await saveTakeManifest(take);
    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
            mimeType: 'application/json',
            dialogTitle: `Share ${take.scriptTitle} take metadata`,
            UTI: 'public.json',
        });
    }
}
