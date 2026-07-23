// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/src/lib/loadHintLayouts.ts
import { staticFile } from 'remotion';

import type { CompareHintLayout, CompareHintLayoutsFile } from './compareHintLayout';

import hintLayoutsBundled from '../generated/hint-layouts-bundled.json';
import { staticPathForScriptAsset } from '../assets/scriptAssetPath';
import { BEAT_PREVIEW_SCRIPT_ID } from '../compositions/beatPreviewFixtures';
import { fetchVideoOpsStaticJson } from '../studio/fetchVideoOpsStatic';

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
    if (scriptId === BEAT_PREVIEW_SCRIPT_ID) {
        return bundled;
    }
    const relativePath = staticPathForScriptAsset(scriptId, hintLayoutsPath);
    const json = await fetchVideoOpsStaticJson<CompareHintLayoutsFile>(relativePath, staticFile);
    if (!json) {
        return bundled;
    }
    return { ...bundled, ...(json.layouts ?? {}) };
}
