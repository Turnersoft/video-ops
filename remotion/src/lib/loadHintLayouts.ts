// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/loadHintLayouts.ts
import { staticFile } from 'remotion';

import type { CompareHintLayout, CompareHintLayoutsFile } from '@turn-video-shared/ide/compareHintLayout';

import hintLayoutsBundled from '../generated/hint-layouts-bundled.json';
import { staticPathForScriptAsset } from './scriptAssetPath';

type BundledHintLayouts = Record<
    string,
    Record<string, CompareHintLayoutsFile>
>;

/** Layouts baked at `npm run sync` from on-disk script JSON (CLI export source of truth). */
export function bundledHintLayoutsForScript(
    scriptId: string,
    hintLayoutsPath: string,
): Record<string, CompareHintLayout> {
    const scriptBundle = (hintLayoutsBundled as BundledHintLayouts)[scriptId];
    if (!scriptBundle) {
        return {};
    }
    return scriptBundle[hintLayoutsPath]?.layouts ?? {};
}

/** Load hint layouts: bundled (sync) first, then live staticFile fetch. */
export async function loadHintLayoutsFile(
    scriptId: string,
    hintLayoutsPath: string,
): Promise<Record<string, CompareHintLayout>> {
    const bundled = bundledHintLayoutsForScript(scriptId, hintLayoutsPath);
    try {
        const response = await fetch(staticFile(staticPathForScriptAsset(scriptId, hintLayoutsPath)));
        if (!response.ok) {
            return bundled;
        }
        const json = (await response.json()) as CompareHintLayoutsFile;
        return { ...bundled, ...(json.layouts ?? {}) };
    } catch {
        return bundled;
    }
}
