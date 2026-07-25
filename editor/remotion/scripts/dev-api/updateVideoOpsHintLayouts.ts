import fs from 'node:fs';
import path from 'node:path';

import { isAnimationV4 } from '../../src/lib/compile/video-ops/videoOpsAnimation';
import type { VideoOpsAnimationV4 } from '../../src/lib/compile/video-ops/videoOpsAnimationBeats';
import {
    updateVideoOpsAnimationMarkdownHintLayouts,
    VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME,
} from '../../src/lib/compile/video-ops/videoOpsAnimationMarkdown';
import { videoOpsScriptDiskFolder } from '../../src/lib/videoOpsPaths';
import { suppressAnimationMarkdownWatch } from './videoOpsAnimationMarkdownWatchState';

export type HintLayoutRecord = {
    xPct: number;
    yPct: number;
    highlightAnchorX?: number;
    highlightAnchorY?: number;
};

function readAnimationV4ForScript(scriptDir: string): VideoOpsAnimationV4 | null {
    const candidates = [
        path.join(scriptDir, 'animation.json'),
        path.join(scriptDir, '.cache', 'animation-v4.json'),
    ];
    for (const animationPath of candidates) {
        if (!fs.existsSync(animationPath)) {
            continue;
        }
        const animation = JSON.parse(fs.readFileSync(animationPath, 'utf8'));
        if (isAnimationV4(animation)) {
            return animation as VideoOpsAnimationV4;
        }
    }
    return null;
}

/** Merge hint layouts into animation.md (preferred) or legacy track JSON, and refresh Remotion bundle. */
export function updateHintLayoutsFile(
    videoOpsDir: string,
    remotionDir: string,
    scriptId: string,
    relativePath: string,
    layouts: Record<string, HintLayoutRecord>,
): Record<string, HintLayoutRecord> {
    const clean = relativePath.replace(/^\/+/, '');
    if (!clean || clean.includes('..')) {
        throw new Error('Invalid hint layout path.');
    }
    const filePath = path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId), clean);

    let existing: { version: number; layouts: Record<string, HintLayoutRecord> } = {
        version: 1,
        layouts: {},
    };
    if (fs.existsSync(filePath)) {
        existing = JSON.parse(fs.readFileSync(filePath, 'utf8')) as typeof existing;
    }

    const merged = { ...(existing.layouts ?? {}), ...layouts };
    const scriptDir = path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId));
    const animationMarkdownPath = path.join(
        scriptDir,
        VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME,
    );
    let updatedAnimationMarkdown: string | null = null;
    let existingAnimationMarkdown: string | null = null;
    if (fs.existsSync(animationMarkdownPath)) {
        const animation = readAnimationV4ForScript(scriptDir);
        if (!animation) {
            throw new Error(
                'animation.md hint positions require animation v4 (animation.json or .cache/animation-v4.json).',
            );
        }
        const sceneIndex = animation.scenes.findIndex(
            (scene) =>
                (scene.compare.hintLayoutsPath ?? 'tracks/scene-compare-hint-layouts.json') ===
                clean,
        );
        if (sceneIndex < 0) {
            throw new Error(`No animation scene writes hint layouts to "${clean}".`);
        }
        existingAnimationMarkdown = fs.readFileSync(animationMarkdownPath, 'utf8');
        updatedAnimationMarkdown = updateVideoOpsAnimationMarkdownHintLayouts(
            existingAnimationMarkdown,
            sceneIndex,
            merged,
        );
        // animation.md is the authoring source — skip writing tracks/*.json.
    } else {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(
            filePath,
            `${JSON.stringify({ version: 1, layouts: merged }, null, 2)}\n`,
            'utf8',
        );
    }

    const bundledPath = path.join(remotionDir, 'src', 'generated', 'hint-layouts-bundled.json');
    let bundled: Record<string, Record<string, { version: number; layouts: Record<string, HintLayoutRecord> }>> =
        {};
    if (fs.existsSync(bundledPath)) {
        bundled = JSON.parse(fs.readFileSync(bundledPath, 'utf8')) as typeof bundled;
    }
    if (!bundled[scriptId]) {
        bundled[scriptId] = {};
    }
    bundled[scriptId][clean] = { version: 1, layouts: merged };
    fs.mkdirSync(path.dirname(bundledPath), { recursive: true });
    fs.writeFileSync(bundledPath, `${JSON.stringify(bundled, null, 2)}\n`, 'utf8');
    if (
        updatedAnimationMarkdown !== null &&
        updatedAnimationMarkdown !== existingAnimationMarkdown
    ) {
        suppressAnimationMarkdownWatch(animationMarkdownPath, updatedAnimationMarkdown);
        fs.writeFileSync(animationMarkdownPath, updatedAnimationMarkdown, 'utf8');
    }

    return merged;
}
