import fs from 'node:fs';
import path from 'node:path';

import { isAnimationV4 } from '../compile/video-ops/videoOpsAnimation';
import type {
    OutdoorBeatPipMask,
    VideoOpsAnimationV4,
} from '../compile/video-ops/videoOpsAnimationBeats';
import {
    seedOutdoorCompareBeatPipMasksInAnimationMarkdown,
    VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME,
} from '../compile/video-ops/videoOpsAnimationMarkdown';
import { videoOpsScriptDiskFolder } from '../videoOpsPaths';
import { suppressAnimationMarkdownWatch } from '../../../scripts/dev-api/videoOpsAnimationMarkdownWatchState';
import {
    beatPipMaskToRenderMask,
    DEFAULT_BEAT_PIP_MASK,
} from './pipMaskTransform';
import type { OutdoorPipMaskPersist } from '../studio/persistOutdoorPipMask';

function renderPropsPath(videoOpsDir: string, scriptId: string): string {
    return path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId), '.cache', 'render-props.json');
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
        const beat = animation.scenes[sceneIndex]?.compare?.beats?.[beatIndex];
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
        fs.writeFileSync(propsPath, `${JSON.stringify(props, null, 2)}\n`, 'utf8');
    } catch {
        // compile on next sync will refresh render props.
    }
}

function beatUsesFilmedComparePipMask(
    beat: VideoOpsAnimationV4['scenes'][number]['compare']['beats'][number] | undefined,
): boolean {
    if (!beat) {
        return false;
    }
    if (beat.manimWebCode?.trim()) {
        return false;
    }
    const haystack = beat.visualNotes ?? '';
    if (/beat-template:\s*manim-motion/i.test(haystack)) {
        return false;
    }
    if (/beat-template:\s*compare-dual/i.test(haystack)) {
        return true;
    }
    if (/layer:\s*compare/i.test(haystack) && /lean-render:\s*true/i.test(haystack)) {
        return true;
    }
    return Boolean(beat.lean || beat.turn);
}

/** Write DEFAULT_BEAT_PIP_MASK pip directives onto compare-dual beats missing them. */
export function seedOutdoorCompareBeatPipMasksForScript(
    videoOpsDir: string,
    scriptId: string,
    sceneIndex = 0,
    pipMask: OutdoorBeatPipMask = DEFAULT_BEAT_PIP_MASK,
): number {
    const scriptDir = path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId));
    const animationMarkdownPath = path.join(scriptDir, VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME);
    if (!fs.existsSync(animationMarkdownPath)) {
        return 0;
    }

    const existingMarkdown = fs.readFileSync(animationMarkdownPath, 'utf8');
    const { markdown: updatedMarkdown, seededBeatIndexes } =
        seedOutdoorCompareBeatPipMasksInAnimationMarkdown(
            existingMarkdown,
            sceneIndex,
            pipMask,
        );
    if (seededBeatIndexes.length === 0) {
        return 0;
    }

    if (updatedMarkdown !== existingMarkdown) {
        suppressAnimationMarkdownWatch(animationMarkdownPath, updatedMarkdown);
        fs.writeFileSync(animationMarkdownPath, updatedMarkdown, 'utf8');
    }

    const renderMask = beatPipMaskToRenderMask(pipMask);
    for (const beatIndex of seededBeatIndexes) {
        patchAnimationV4BeatPipMask(scriptDir, sceneIndex, beatIndex, pipMask);
        patchRenderPropsBeatPipMask(videoOpsDir, scriptId, sceneIndex, beatIndex, renderMask);
    }
    return seededBeatIndexes.length;
}

/** Mirror presenter mask preset into a take's animation-outdoor.json outdoorEdit. */
export function patchOutdoorAnimationDocWithPipPreset(
    animation: VideoOpsAnimationV4,
    sceneIndex = 0,
    pipMask: OutdoorBeatPipMask = DEFAULT_BEAT_PIP_MASK,
): void {
    const scene = animation.scenes[sceneIndex];
    const outdoorEdit = scene?.outdoorEdit as
        | {
              pipMask?: OutdoorPipMaskPersist;
              beatLayouts?: Array<{ pipMask?: OutdoorPipMaskPersist } | null>;
          }
        | undefined;
    const beats = scene?.compare?.beats;
    if (!outdoorEdit || !beats?.length) {
        return;
    }

    const renderMask = beatPipMaskToRenderMask(pipMask);
    const beatLayouts: Array<{ pipMask: OutdoorPipMaskPersist } | null> = [];
    for (let beatIndex = 0; beatIndex < beats.length; beatIndex += 1) {
        const beat = beats[beatIndex];
        if (!beatUsesFilmedComparePipMask(beat)) {
            beatLayouts.push(null);
            continue;
        }
        const beatMask = beat.pipMask ?? pipMask;
        beats[beatIndex] = {
            ...beat,
            pipMask: beatMask,
        };
        beatLayouts.push({
            pipMask: beatPipMaskToRenderMask(beatMask),
        });
    }
    outdoorEdit.pipMask = renderMask;
    outdoorEdit.beatLayouts = beatLayouts;
}

export function patchOutdoorAnimationFileWithPipPreset(
    outdoorAnimationPath: string,
    sceneIndex = 0,
    pipMask: OutdoorBeatPipMask = DEFAULT_BEAT_PIP_MASK,
): boolean {
    if (!fs.existsSync(outdoorAnimationPath)) {
        return false;
    }
    try {
        const raw = JSON.parse(fs.readFileSync(outdoorAnimationPath, 'utf8'));
        if (!isAnimationV4(raw)) {
            return false;
        }
        const animation = raw as VideoOpsAnimationV4;
        patchOutdoorAnimationDocWithPipPreset(animation, sceneIndex, pipMask);
        fs.writeFileSync(outdoorAnimationPath, `${JSON.stringify(animation, null, 2)}\n`, 'utf8');
        return true;
    } catch {
        return false;
    }
}
