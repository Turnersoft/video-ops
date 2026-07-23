import fs from 'node:fs';
import path from 'node:path';

import { videoOpsScriptDiskFolder } from '../../src/lib/videoOpsPaths';
import { isAnimationV4 } from '../../src/lib/compile/video-ops/videoOpsAnimation';
import type { VideoOpsAnimationV4 } from '../../src/lib/compile/video-ops/videoOpsAnimationBeats';
import {
    updateVideoOpsAnimationMarkdownBeatEditorNotes,
    VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME,
} from '../../src/lib/compile/video-ops/videoOpsAnimationMarkdown';

/** Write a per-beat comment + script-change flag into animation.json v4 compare.beats. */
export function updateBeatEditorNotesInAnimation(
    videoOpsDir: string,
    scriptId: string,
    beatIndex: number,
    comment: string,
    allowScriptChange: boolean,
    sceneIndex = 0,
): { comment: string; allowScriptChange: boolean } {
    const animPath = path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId), 'animation.json');
    if (!fs.existsSync(animPath)) {
        throw new Error(`Missing animation.json for ${scriptId}.`);
    }

    const raw = JSON.parse(fs.readFileSync(animPath, 'utf8'));
    if (!isAnimationV4(raw)) {
        throw new Error(`Beat editor notes require animation.json version 4 for ${scriptId}.`);
    }

    const animation = raw as VideoOpsAnimationV4;
    const beat = animation.scenes[sceneIndex]?.compare?.beats?.[beatIndex];
    if (!beat) {
        throw new Error(`Beat ${beatIndex} missing in animation.json for ${scriptId}.`);
    }
    const animationMarkdownPath = path.join(
        videoOpsDir,
        videoOpsScriptDiskFolder(scriptId),
        VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME,
    );
    const updatedAnimationMarkdown = fs.existsSync(animationMarkdownPath)
        ? updateVideoOpsAnimationMarkdownBeatEditorNotes(
              fs.readFileSync(animationMarkdownPath, 'utf8'),
              sceneIndex,
              beatIndex,
              comment,
              allowScriptChange,
          )
        : null;

    beat.comment = comment;
    delete beat.aiComment;
    beat.allowScriptChange = allowScriptChange;
    fs.writeFileSync(animPath, `${JSON.stringify(animation, null, 2)}\n`, 'utf8');
    if (updatedAnimationMarkdown !== null) {
        fs.writeFileSync(animationMarkdownPath, updatedAnimationMarkdown, 'utf8');
    }
    return { comment, allowScriptChange };
}
