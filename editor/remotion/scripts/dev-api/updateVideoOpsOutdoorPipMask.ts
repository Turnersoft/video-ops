import fs from 'node:fs';
import path from 'node:path';

import { isAnimationV4 } from '../../src/lib/compile/video-ops/videoOpsAnimation';
import type { OutdoorBeatPipMask, VideoOpsAnimationV4 } from '../../src/lib/compile/video-ops/videoOpsAnimationBeats';
import {
    updateVideoOpsAnimationMarkdownBeatPipMask,
    VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME,
} from '../../src/lib/compile/video-ops/videoOpsAnimationMarkdown';
import {
    beatPipMaskToRenderMask,
    DEFAULT_BEAT_PIP_MASK,
    outdoorPipMaskPersistToBeatMask,
} from '../../src/lib/outdoor/pipMaskTransform';
import type {
    OutdoorPipMaskPersist,
    OutdoorPipMaskSyncMode,
} from '../../src/lib/studio/persistOutdoorPipMask';
import { videoOpsScriptDiskFolder } from '../../src/lib/videoOpsPaths';
import { suppressAnimationMarkdownWatch } from './videoOpsAnimationMarkdownWatchState';

function renderPropsPath(videoOpsDir: string, scriptId: string): string {
    return path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId), '.cache', 'render-props.json');
}

function animationV4CachePath(videoOpsDir: string, scriptId: string): string {
    return path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId), '.cache', 'animation-v4.json');
}

function patchAnimationV4BeatPipMask(
    scriptDir: string,
    sceneIndex: number,
    beatIndex: number,
    beatMask: OutdoorBeatPipMask,
): void {
    const v4Path = path.join(scriptDir, '.cache', 'animation-v4.json');
    if (!fs.existsSync(v4Path)) {
        return;
    }
    try {
        const raw = JSON.parse(fs.readFileSync(v4Path, 'utf8'));
        if (!isAnimationV4(raw)) {
            return;
        }
        const animation = raw as VideoOpsAnimationV4;
        const scene = animation.scenes[sceneIndex];
        const beat = scene?.compare?.beats?.[beatIndex];
        if (!beat) {
            return;
        }
        beat.pipMask = beatMask;
        fs.writeFileSync(v4Path, `${JSON.stringify(animation, null, 2)}\n`, 'utf8');
    } catch {
        // compile on next sync will refresh v4 cache.
    }
}

function patchRenderPropsBeatPipMask(
    videoOpsDir: string,
    scriptId: string,
    sceneIndex: number,
    beatIndex: number,
    pipMask: OutdoorPipMaskPersist,
): void {
    const propsPath = renderPropsPath(videoOpsDir, scriptId);
    if (!fs.existsSync(propsPath)) {
        return;
    }
    try {
        const props = JSON.parse(fs.readFileSync(propsPath, 'utf8')) as {
            scenes?: Array<{
                studioPresenterMask?: OutdoorPipMaskPersist;
                beatStudioPresenterMasks?: Array<OutdoorPipMaskPersist | null | undefined>;
                outdoorEdit?: {
                    pipMask?: OutdoorPipMaskPersist;
                    beatLayouts?: Array<{ pipMask?: OutdoorPipMaskPersist } | null>;
                };
            }>;
        };
        const scene = props.scenes?.[sceneIndex];
        if (!scene) {
            return;
        }
        const masks = Array.isArray(scene.beatStudioPresenterMasks)
            ? [...scene.beatStudioPresenterMasks]
            : [];
        while (masks.length <= beatIndex) {
            masks.push(null);
        }
        masks[beatIndex] = pipMask;
        scene.beatStudioPresenterMasks = masks;
        if (!scene.studioPresenterMask) {
            scene.studioPresenterMask = pipMask;
        }
        if (scene.outdoorEdit) {
            const layouts = Array.isArray(scene.outdoorEdit.beatLayouts)
                ? [...scene.outdoorEdit.beatLayouts]
                : [];
            while (layouts.length <= beatIndex) {
                layouts.push(null);
            }
            const prev = layouts[beatIndex];
            layouts[beatIndex] = {
                ...(prev && typeof prev === 'object' ? prev : {}),
                pipMask,
            };
            scene.outdoorEdit.beatLayouts = layouts;
        }
        fs.writeFileSync(propsPath, `${JSON.stringify(props, null, 2)}\n`, 'utf8');
    } catch {
        // animation.md compile on next sync will refresh render props.
    }
}

function writeOutdoorEditPipMask(
    videoOpsDir: string,
    scriptId: string,
    pipMask: OutdoorPipMaskPersist,
    beatIndex?: number,
    sceneIndex = 0,
): boolean {
    const animPath = path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId), 'animation.json');
    if (!fs.existsSync(animPath)) {
        return false;
    }
    const animation = JSON.parse(fs.readFileSync(animPath, 'utf8')) as {
        scenes?: Array<{
            outdoorEdit?: {
                pipMask?: OutdoorPipMaskPersist;
                beatLayouts?: Array<{ pipMask?: OutdoorPipMaskPersist } | null>;
            };
        }>;
    };
    const scene = animation.scenes?.[sceneIndex];
    const outdoorEdit = scene?.outdoorEdit;
    if (!outdoorEdit) {
        return false;
    }
    const isBeatOverride = typeof beatIndex === 'number' && beatIndex >= 0;
    if (!isBeatOverride) {
        outdoorEdit.pipMask = pipMask;
    }
    if (isBeatOverride) {
        const layouts = Array.isArray(outdoorEdit.beatLayouts) ? [...outdoorEdit.beatLayouts] : [];
        while (layouts.length <= beatIndex) {
            layouts.push(null);
        }
        const prev = layouts[beatIndex];
        layouts[beatIndex] = {
            ...(prev && typeof prev === 'object' ? prev : {}),
            pipMask,
        };
        outdoorEdit.beatLayouts = layouts;
    } else if (Array.isArray(outdoorEdit.beatLayouts)) {
        outdoorEdit.beatLayouts = outdoorEdit.beatLayouts.map((layout) =>
            layout ? { ...layout, pipMask } : null,
        );
    }
    fs.writeFileSync(animPath, `${JSON.stringify(animation, null, 2)}\n`, 'utf8');
    return true;
}

function readBeatPipMaskFromV4(
    scriptDir: string,
    sceneIndex: number,
    beatIndex: number,
): OutdoorBeatPipMask | undefined {
    const v4Path = path.join(scriptDir, '.cache', 'animation-v4.json');
    if (!fs.existsSync(v4Path)) {
        return undefined;
    }
    try {
        const raw = JSON.parse(fs.readFileSync(v4Path, 'utf8'));
        if (!isAnimationV4(raw)) {
            return undefined;
        }
        return (raw as VideoOpsAnimationV4).scenes[sceneIndex]?.compare?.beats?.[beatIndex]
            ?.pipMask;
    } catch {
        return undefined;
    }
}

/** Copy the current beat's pip mask (position only or full settings) onto every beat in the scene. */
export function syncOutdoorPipMaskToAllBeatsInAnimation(
    videoOpsDir: string,
    scriptId: string,
    pipMask: OutdoorPipMaskPersist,
    sceneIndex: number,
    beatCount: number,
    mode: OutdoorPipMaskSyncMode,
): void {
    if (beatCount <= 0) {
        return;
    }
    const sourceBeatMask = outdoorPipMaskPersistToBeatMask(pipMask);
    const scriptDir = path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId));
    const animationMarkdownPath = path.join(scriptDir, VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME);

    if (!fs.existsSync(animationMarkdownPath)) {
        throw new Error(`Missing ${VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME} for ${scriptId}.`);
    }

    let markdown = fs.readFileSync(animationMarkdownPath, 'utf8');
    for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
        let beatMask: OutdoorBeatPipMask;
        if (mode === 'full') {
            beatMask = sourceBeatMask;
        } else {
            const existing = readBeatPipMaskFromV4(scriptDir, sceneIndex, beatIndex);
            const base = existing ?? DEFAULT_BEAT_PIP_MASK;
            beatMask = { ...base, x: sourceBeatMask.x, y: sourceBeatMask.y };
        }
        markdown = updateVideoOpsAnimationMarkdownBeatPipMask(
            markdown,
            sceneIndex,
            beatIndex,
            beatMask,
        );
        patchAnimationV4BeatPipMask(scriptDir, sceneIndex, beatIndex, beatMask);
        const renderMask = beatPipMaskToRenderMask(beatMask);
        patchRenderPropsBeatPipMask(videoOpsDir, scriptId, sceneIndex, beatIndex, renderMask);
        writeOutdoorEditPipMask(videoOpsDir, scriptId, renderMask, beatIndex, sceneIndex);
    }

    suppressAnimationMarkdownWatch(animationMarkdownPath, markdown);
    fs.writeFileSync(animationMarkdownPath, markdown, 'utf8');
}

/** Merge presenter mask drag into animation.md (preferred), outdoorEdit, and render-props cache. */
export function updateOutdoorPipMaskInAnimation(
    videoOpsDir: string,
    scriptId: string,
    pipMask: OutdoorPipMaskPersist,
    beatIndex?: number,
    sceneIndex = 0,
): OutdoorPipMaskPersist {
    const beatMask = outdoorPipMaskPersistToBeatMask(pipMask);
    const scriptDir = path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId));
    const animationMarkdownPath = path.join(scriptDir, VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME);

    if (typeof beatIndex !== 'number' || beatIndex < 0) {
        throw new Error('beatIndex is required to save presenter mask positions.');
    }

    if (fs.existsSync(animationMarkdownPath)) {
        const existingMarkdown = fs.readFileSync(animationMarkdownPath, 'utf8');
        const updatedMarkdown = updateVideoOpsAnimationMarkdownBeatPipMask(
            existingMarkdown,
            sceneIndex,
            beatIndex,
            beatMask,
        );
        if (updatedMarkdown !== existingMarkdown) {
            suppressAnimationMarkdownWatch(animationMarkdownPath, updatedMarkdown);
            fs.writeFileSync(animationMarkdownPath, updatedMarkdown, 'utf8');
        }
        patchAnimationV4BeatPipMask(scriptDir, sceneIndex, beatIndex, beatMask);
        patchRenderPropsBeatPipMask(videoOpsDir, scriptId, sceneIndex, beatIndex, pipMask);
        writeOutdoorEditPipMask(videoOpsDir, scriptId, pipMask, beatIndex, sceneIndex);
        return pipMask;
    }

    if (writeOutdoorEditPipMask(videoOpsDir, scriptId, pipMask, beatIndex, sceneIndex)) {
        patchRenderPropsBeatPipMask(videoOpsDir, scriptId, sceneIndex, beatIndex, pipMask);
        return pipMask;
    }

    throw new Error(`Missing ${VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME} for ${scriptId}.`);
}
