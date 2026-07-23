import fs from 'node:fs';
import path from 'node:path';

import type { CompareFontScales } from '../../src/lib/tracks/compareFontScale';
import { videoOpsScriptDiskFolder } from '../../src/lib/videoOpsPaths';
import { isAnimationV3, isAnimationV4 } from '../../src/lib/compile/video-ops/videoOpsAnimation';
import {
    compareDisplayFontScales,
    resolveCompareBeatFontScales,
    type VideoOpsAnimationV3,
    type VideoOpsAnimationV4,
    type VideoOpsCompareBeatFontScales,
} from '../../src/lib/compile/video-ops/videoOpsAnimationBeats';
import {
    updateVideoOpsAnimationMarkdownBeatFontScales,
    VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME,
} from '../../src/lib/compile/video-ops/videoOpsAnimationMarkdown';

function toBeatFontScalesPayload(scales: CompareFontScales): VideoOpsCompareBeatFontScales {
    return {
        editorFontScale: scales.editorFontScale,
        leanEditorFontScale: scales.leanEditorFontScale,
        renderFontScale: scales.renderFontScale,
    };
}

function writeAllBeatFontScalesV4(
    animation: VideoOpsAnimationV4,
    sceneIndex: number,
    beatFontScales: CompareFontScales[],
): CompareFontScales[] {
    const scene = animation.scenes[sceneIndex];
    const beats = scene?.compare?.beats;
    if (!scene || !beats) {
        throw new Error(`Scene ${sceneIndex} has no compare beats.`);
    }
    if (beatFontScales.length !== beats.length) {
        throw new Error(
            `Expected ${beats.length} beat font scales, received ${beatFontScales.length}.`,
        );
    }
    beats.forEach((beat, index) => {
        beat.fontScales = toBeatFontScalesPayload(beatFontScales[index]);
    });
    return beatFontScales;
}

function writeBeatFontScalesV3(
    animation: VideoOpsAnimationV3,
    sceneIndex: number,
    beatIndex: number,
    scales: CompareFontScales,
): CompareFontScales {
    const scene = animation.scenes[sceneIndex];
    const beat = scene?.compare?.beats?.[beatIndex];
    if (!scene || !beat) {
        throw new Error(`Beat ${beatIndex} missing in animation.json scene ${sceneIndex}.`);
    }
    scene.compare.display = {
        ...scene.compare.display,
        editorFontScale: scales.editorFontScale,
        leanEditorFontScale: scales.leanEditorFontScale,
        renderFontScale: scales.renderFontScale,
    };
    return scales;
}

/** Write every compare beat's font scales into animation.json (v4). */
export function updateAllCompareBeatFontScalesInAnimation(
    videoOpsDir: string,
    scriptId: string,
    beatFontScales: CompareFontScales[],
    sceneIndex = 0,
): CompareFontScales[] {
    const animPath = path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId), 'animation.json');
    if (!fs.existsSync(animPath)) {
        throw new Error(`Missing animation.json for ${scriptId}.`);
    }

    const raw = JSON.parse(fs.readFileSync(animPath, 'utf8'));

    if (isAnimationV4(raw)) {
        const animationMarkdownPath = path.join(
            videoOpsDir,
            videoOpsScriptDiskFolder(scriptId),
            VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME,
        );
        const updatedAnimationMarkdown = fs.existsSync(animationMarkdownPath)
            ? updateVideoOpsAnimationMarkdownBeatFontScales(
                  fs.readFileSync(animationMarkdownPath, 'utf8'),
                  sceneIndex,
                  beatFontScales,
              )
            : null;
        const saved = writeAllBeatFontScalesV4(raw as VideoOpsAnimationV4, sceneIndex, beatFontScales);
        fs.writeFileSync(animPath, `${JSON.stringify(raw, null, 2)}\n`, 'utf8');
        if (updatedAnimationMarkdown !== null) {
            fs.writeFileSync(animationMarkdownPath, updatedAnimationMarkdown, 'utf8');
        }
        return saved;
    }

    if (isAnimationV3(raw)) {
        const scales = beatFontScales[0];
        if (!scales) {
            throw new Error('At least one beat font scale is required.');
        }
        writeBeatFontScalesV3(raw as VideoOpsAnimationV3, sceneIndex, 0, scales);
        fs.writeFileSync(animPath, `${JSON.stringify(raw, null, 2)}\n`, 'utf8');
        return beatFontScales;
    }

    throw new Error(`animation.json for ${scriptId} must be v3 or v4 compare authoring.`);
}

/** Write one beat, then persist the full resolved beat list to animation.json. */
export function updateCompareBeatFontScalesInAnimation(
    videoOpsDir: string,
    scriptId: string,
    beatIndex: number,
    scales: CompareFontScales,
    sceneIndex = 0,
    beatFontScales?: CompareFontScales[],
): CompareFontScales {
    if (beatFontScales && beatFontScales.length > 0) {
        updateAllCompareBeatFontScalesInAnimation(videoOpsDir, scriptId, beatFontScales, sceneIndex);
        return beatFontScales[beatIndex] ?? scales;
    }

    const animPath = path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId), 'animation.json');
    const raw = JSON.parse(fs.readFileSync(animPath, 'utf8'));
    if (!isAnimationV4(raw)) {
        updateAllCompareBeatFontScalesInAnimation(videoOpsDir, scriptId, [scales], sceneIndex);
        return scales;
    }

    const animation = raw as VideoOpsAnimationV4;
    const scene = animation.scenes[sceneIndex];
    const beats = scene?.compare?.beats;
    if (!scene || !beats) {
        throw new Error(`Scene ${sceneIndex} has no compare beats in ${scriptId}.`);
    }

    const resolved = resolveCompareBeatFontScales(beats, scene.compare.display);
    resolved[beatIndex] = scales;

    updateAllCompareBeatFontScalesInAnimation(videoOpsDir, scriptId, resolved, sceneIndex);
    return scales;
}

/** Copy compare.display font scales onto every beat that lacks fontScales. */
export function materializeCompareBeatFontScalesInAnimation(
    videoOpsDir: string,
    scriptId: string,
    sceneIndex = 0,
): number {
    const animPath = path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId), 'animation.json');
    if (!fs.existsSync(animPath)) {
        throw new Error(`Missing animation.json for ${scriptId}.`);
    }

    const raw = JSON.parse(fs.readFileSync(animPath, 'utf8'));
    if (!isAnimationV4(raw)) {
        throw new Error(`materializeCompareBeatFontScalesInAnimation requires v4 animation.json.`);
    }

    const animation = raw as VideoOpsAnimationV4;
    const scene = animation.scenes[sceneIndex];
    const beats = scene?.compare?.beats;
    if (!scene || !beats) {
        throw new Error(`Scene ${sceneIndex} has no compare beats in ${scriptId}.`);
    }

    const displayScales = compareDisplayFontScales(scene.compare.display);
    const saved: VideoOpsCompareBeatFontScales = {
        editorFontScale: displayScales.editorFontScale,
        leanEditorFontScale: displayScales.leanEditorFontScale,
        renderFontScale: displayScales.renderFontScale,
    };

    let updated = 0;
    for (const beat of beats) {
        if (beat.fontScales) {
            continue;
        }
        beat.fontScales = { ...saved };
        updated += 1;
    }

    if (updated > 0) {
        fs.writeFileSync(animPath, `${JSON.stringify(animation, null, 2)}\n`, 'utf8');
    }
    return updated;
}

/** @deprecated Scene-wide save — updates compare.display only (v4). */
export function updateCompareFontScalesInAnimation(
    videoOpsDir: string,
    scriptId: string,
    scales: CompareFontScales,
    sceneIndex = 0,
): CompareFontScales {
    return updateCompareBeatFontScalesInAnimation(videoOpsDir, scriptId, 0, scales, sceneIndex);
}
