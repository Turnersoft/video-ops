import fs from 'node:fs';
import path from 'node:path';

import { videoOpsScriptDiskFolder } from '../../src/lib/videoOpsPaths';
import {
    updateVideoOpsAnimationMarkdownBeatSay,
    VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME,
} from '../../src/lib/compile/video-ops/videoOpsAnimationMarkdown';
import {
    estimateBeatDurationSeconds,
    recomputeDirectorSayTimings,
    resolveSpeechPace,
} from '../../src/lib/compile/video-ops/videoOpsSpeechPace';
import { sceneDurationFromBeatDurations } from '../../src/lib/compile/video-ops/videoOpsAnimationBeats';
import { isAnimationV3, isAnimationV4 } from '../../src/lib/compile/video-ops/videoOpsAnimation';
import type { VideoOpsAnimationV3, VideoOpsAnimationV4 } from '../../src/lib/compile/video-ops/videoOpsAnimationBeats';
import { resolveScriptMarkdownPath } from './videoOpsScriptPaths';

type AnimationOnDisk = {
    version?: number;
    scenes?: Array<{
        durationSeconds?: number;
        teleprompter?: { pace?: import('../../src/lib/compile/video-ops/videoOpsSpeechPace').TeleprompterSpeechPace };
        director?: { say?: string[]; sayTimings?: number[]; teleprompter?: { pace?: import('../../src/lib/compile/video-ops/videoOpsSpeechPace').TeleprompterSpeechPace } };
        compare?: { beats?: Array<{ say?: string; durationSeconds?: number }> };
    }>;
};

function recomputeBeatSayInAnimation(
    videoOpsDir: string,
    scriptId: string,
    beatIndex: number,
    say: string,
    sceneIndex = 0,
): void {
    const animPath = path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId), 'animation.json');
    const markdownPath = resolveScriptMarkdownPath(videoOpsDir, scriptId);
    const markdown = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, 'utf8') : undefined;
    const raw = JSON.parse(fs.readFileSync(animPath, 'utf8'));

    if (isAnimationV4(raw)) {
        const animation = raw as VideoOpsAnimationV4;
        const scene = animation.scenes[sceneIndex];
        const beat = scene?.compare?.beats?.[beatIndex];
        if (!scene || !beat) {
            throw new Error(`Beat ${beatIndex} missing in animation.json for ${scriptId}.`);
        }
        const pace = resolveSpeechPace(scriptId, scene.teleprompter, markdown);
        beat.say = say;
        beat.durationSeconds = estimateBeatDurationSeconds(say, pace);
        scene.durationSeconds = sceneDurationFromBeatDurations(scene.compare.beats);
        fs.writeFileSync(animPath, `${JSON.stringify(animation, null, 2)}\n`, 'utf8');
        return;
    }

    if (isAnimationV3(raw)) {
        const animation = raw as VideoOpsAnimationV3;
        const scene = animation.scenes[sceneIndex];
        const beat = scene?.compare?.beats?.[beatIndex];
        if (!scene || !beat) {
            throw new Error(`Beat ${beatIndex} missing in animation.json for ${scriptId}.`);
        }
        const pace = resolveSpeechPace(scriptId, scene.teleprompter, markdown);
        beat.say = say;
        beat.durationSeconds = estimateBeatDurationSeconds(say, pace);
        scene.durationSeconds = sceneDurationFromBeatDurations(scene.compare.beats);
        fs.writeFileSync(animPath, `${JSON.stringify(animation, null, 2)}\n`, 'utf8');
    }
}

/** Write one teleprompter beat back to animation.json (v4 compare.beats or director.say). */
export function updateBeatSayInAnimation(
    videoOpsDir: string,
    scriptId: string,
    beatIndex: number,
    say: string,
    sceneIndex = 0,
): string {
    const animPath = path.join(videoOpsDir, videoOpsScriptDiskFolder(scriptId), 'animation.json');
    if (!fs.existsSync(animPath)) {
        throw new Error(`Missing animation.json for ${scriptId}.`);
    }

    const animation = JSON.parse(fs.readFileSync(animPath, 'utf8')) as AnimationOnDisk;
    const scene = animation.scenes?.[sceneIndex];
    if (!scene) {
        throw new Error(`Scene ${sceneIndex} missing in animation.json for ${scriptId}.`);
    }

    if (animation.version === 4 && scene.compare?.beats) {
        const animationMarkdownPath = path.join(
            videoOpsDir,
            videoOpsScriptDiskFolder(scriptId),
            VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME,
        );
        const updatedAnimationMarkdown = fs.existsSync(animationMarkdownPath)
            ? updateVideoOpsAnimationMarkdownBeatSay(
                  fs.readFileSync(animationMarkdownPath, 'utf8'),
                  sceneIndex,
                  beatIndex,
                  say,
              )
            : null;
        recomputeBeatSayInAnimation(videoOpsDir, scriptId, beatIndex, say, sceneIndex);
        if (updatedAnimationMarkdown !== null) {
            fs.writeFileSync(animationMarkdownPath, updatedAnimationMarkdown, 'utf8');
        }
        return say;
    }

    if (scene.director?.say) {
        if (beatIndex < 0 || beatIndex >= scene.director.say.length) {
            throw new Error(`Beat ${beatIndex} missing in director.say for ${scriptId}.`);
        }
        scene.director.say[beatIndex] = say;
        const markdownPath = resolveScriptMarkdownPath(videoOpsDir, scriptId);
        const markdown = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, 'utf8') : undefined;
        const pace = resolveSpeechPace(scriptId, scene.director.teleprompter, markdown);
        const { sayTimings, durationSeconds } = recomputeDirectorSayTimings(scene.director.say, pace);
        scene.director.sayTimings = sayTimings;
        scene.durationSeconds = durationSeconds;
    } else if (scene.compare?.beats) {
        recomputeBeatSayInAnimation(videoOpsDir, scriptId, beatIndex, say, sceneIndex);
        return say;
    } else {
        throw new Error(`No say beats found in animation.json for ${scriptId}.`);
    }

    fs.writeFileSync(animPath, `${JSON.stringify(animation, null, 2)}\n`, 'utf8');
    return say;
}
