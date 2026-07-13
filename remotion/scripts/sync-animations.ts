// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/scripts/sync-animations.ts
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    animationToRenderProps,
    applySpeechPaceToAnimation,
    applySpeechPaceToSceneV3,
    applySpeechPaceToSceneV4,
    buildAnimationFromScript,
    compileCompareTracksFromBeats,
    compileCompareTracksFromBeatsV4,
    expandAnimationV3ToV2,
    expandAnimationV4ToV2,
    fillCompareBeatViewports,
    isAnimationV3,
    isAnimationV4,
    mergeScriptCleanIntoCompareBeats,
    mergeScriptCleanIntoCompareBeatsV4,
    mergeScriptCleanTeleprompter,
    normalizeAnimationJson,
    normalizeCompareBeatsOnScene,
    normalizeCompareBeatsOnSceneV4,
    parseAnimationJson,
    type LegacyRemotionConfig,
    type VideoOpsAnimation,
    type VideoOpsAnimationV3,
    type VideoOpsAnimationV4,
    type VideoOpsIdeTrack,
} from '../../../basic_ui/src/pages/VideoOpsPage/videoOpsAnimation';
import {
    parseScriptMarkdown,
    sayLinesFromScriptCleanMarkdown,
    scriptMarkdownUsesScriptClean,
} from '../../../basic_ui/src/pages/VideoOpsPage/parseVideoOpsMarkdown';
import {
    compileVideoOpsAnimationMarkdown,
    VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME,
} from '../../../basic_ui/src/pages/VideoOpsPage/videoOpsAnimationMarkdown';
import {
    convertAnimationV2ToV4Base,
    usesGeneratedCompareLayerV4,
} from '../../../basic_ui/src/pages/VideoOpsPage/videoOpsAnimationBeats';
import {
    buildSocialPostsDocument,
    mergeSocialPostsDocuments,
    parseSocialPostsDocument,
} from '../../../basic_ui/src/pages/VideoOpsPage/videoOpsSocialPosts';
import {
    videoOpsScriptFolder,
    VIDEO_OPS_SCRIPT_EXPORT_DIR,
    VIDEO_OPS_SOCIAL_POSTS_FILENAME,
} from '../../../basic_ui/src/shared/turn-video/videoOpsPaths';

import { TURN_USER_ROOT } from './repoPaths';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const remotionDir = path.resolve(__dirname, '..');
const videoOpsDir = path.resolve(remotionDir, '..');
const generatedDir = path.join(remotionDir, 'src', 'generated');

const manifest = JSON.parse(fs.readFileSync(path.join(videoOpsDir, 'manifest.json'), 'utf8')) as {
    scripts: string[];
};

const forceRebuild = process.argv.includes('--force');
const scriptArgumentIndex = process.argv.indexOf('--script');
const selectedScriptId =
    scriptArgumentIndex >= 0 ? process.argv[scriptArgumentIndex + 1]?.trim() : undefined;
if (scriptArgumentIndex >= 0 && !selectedScriptId) {
    throw new Error('--script requires a script id.');
}
if (selectedScriptId && !manifest.scripts.includes(selectedScriptId)) {
    throw new Error(`Unknown script id "${selectedScriptId}".`);
}
const scriptsToSync = selectedScriptId ? [selectedScriptId] : manifest.scripts;

function readExistingGeneratedRecord<T>(filename: string): Record<string, T> {
    const filePath = path.join(generatedDir, filename);
    if (!selectedScriptId || !fs.existsSync(filePath)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, T>;
}

const compositionMeta: Record<
    string,
    { fps: number; width: number; height: number; totalFrames: number }
> = readExistingGeneratedRecord<{
    fps: number;
    width: number;
    height: number;
    totalFrames: number;
}>('composition-meta.json');

/** Bundled hint callout positions for Remotion CLI export (read at sync time from disk). */
const hintLayoutsBundled: Record<
    string,
    Record<string, { version: number; layouts: Record<string, { xPct: number; yPct: number }> }>
> = readExistingGeneratedRecord<
    Record<string, { version: number; layouts: Record<string, { xPct: number; yPct: number }> }>
>('hint-layouts-bundled.json');

const turnUserRoot = TURN_USER_ROOT;

function resolveScriptDir(scriptId: string): string {
    return path.join(videoOpsDir, videoOpsScriptFolder(scriptId));
}

function probeAudioDurationSeconds(filePath: string): number | null {
    try {
        const raw = execSync(
            `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
            { encoding: 'utf8' },
        ).trim();
        const value = Number.parseFloat(raw);
        return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
        return null;
    }
}

/**
 * When a scene has beat-aligned voice audio (`voiceEdit.beatVoiceSrc`), the real
 * narration timing is the source of truth — not the speech-pace estimate.
 * Prefers explicit `voiceEdit.beatDurationsSeconds` (calibrated by the edited-export
 * pipeline: audio + natural pause), falling back to measuring the audio files.
 */
function overrideBeatDurationsFromVoice(
    scene: VideoOpsAnimationV4['scenes'][number],
    scriptDir: string,
): VideoOpsAnimationV4['scenes'][number] {
    const beats = scene.compare?.beats;
    if (!beats?.length) {
        return scene;
    }
    const explicit =
        scene.outdoorEdit?.beatDurationsSeconds ?? scene.voiceEdit?.beatDurationsSeconds;
    const srcs = scene.voiceEdit?.beatVoiceSrc;
    if (!explicit?.length && !srcs?.length) {
        return scene;
    }
    let changed = false;
    const nextBeats = beats.map((beat, index) => {
        const injected = explicit?.[index];
        if (typeof injected === 'number' && injected > 0) {
            changed = true;
            return { ...beat, durationSeconds: injected };
        }
        const rel = srcs?.[index];
        if (!rel) {
            return beat;
        }
        const measured = probeAudioDurationSeconds(path.join(scriptDir, rel));
        if (measured == null) {
            return beat;
        }
        changed = true;
        return { ...beat, durationSeconds: Math.max(0.5, Math.round(measured * 10) / 10) };
    });
    if (!changed) {
        return scene;
    }
    const durationSeconds = Math.round(
        nextBeats.reduce((sum, beat) => sum + beat.durationSeconds, 0),
    );
    return {
        ...scene,
        durationSeconds,
        compare: { ...scene.compare, beats: nextBeats },
    };
}

function ensureScriptExportDir(scriptDir: string): void {
    const exportDir = path.join(scriptDir, VIDEO_OPS_SCRIPT_EXPORT_DIR);
    fs.mkdirSync(exportDir, { recursive: true });
    const gitignorePath = path.join(exportDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
        fs.writeFileSync(gitignorePath, '*.mp4\n', 'utf8');
    }
}

function syncSocialPostsFile(
    scriptDir: string,
    scriptId: string,
    parsedScript: ReturnType<typeof parseScriptMarkdown>,
    animationTitle?: string,
): void {
    const socialPath = path.join(scriptDir, VIDEO_OPS_SOCIAL_POSTS_FILENAME);
    const existing = fs.existsSync(socialPath)
        ? parseSocialPostsDocument(fs.readFileSync(socialPath, 'utf8'))
        : null;
    const fresh = buildSocialPostsDocument(scriptId, parsedScript, animationTitle);
    const merged = mergeSocialPostsDocuments(existing, fresh);
    fs.writeFileSync(socialPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
}

function parseTurnSourceFileRef(markdown: string): string | undefined {
    const match = markdown.match(/Source file:\s*`([^`]+)`/);
    return match?.[1];
}

/** Copy the real .turn file from turn-user into script/shared/reference/ for Remotion staticFile(). */
function syncTurnSourceFile(markdown: string): string | undefined {
    const rel = parseTurnSourceFileRef(markdown);
    if (!rel) {
        return undefined;
    }

    const localUnderScript = rel.startsWith('script/')
        ? rel.slice('script/'.length)
        : rel.startsWith('scripts/')
          ? rel.replace(/^scripts\/[^/]+\//, '')
          : rel;
    if (localUnderScript.startsWith('shared/reference/')) {
        const localPath = path.join(videoOpsDir, 'scripts/algebra', localUnderScript);
        if (fs.existsSync(localPath)) {
            return localUnderScript;
        }
    }

    const turnRel = rel.replace(/^turn-user\//, '');
    const src = path.join(turnUserRoot, turnRel);
    if (!fs.existsSync(src)) {
        console.warn(`Missing Turn source ${src}`);
        return undefined;
    }
    const refDir = path.join(videoOpsDir, 'scripts/algebra/shared', 'reference');
    fs.mkdirSync(refDir, { recursive: true });
    const destName = path.basename(rel);
    const dest = path.join(refDir, destName);
    fs.copyFileSync(src, dest);
    return `shared/reference/${destName}`;
}

function typingSnippetFromTurnBlock(turnSource: string): string {
    return turnSource.trim();
}

function demoKnowledgePanel(turnSource: string): VideoOpsIdeTrack['knowledgePanel'] | undefined {
    const trimmed = turnSource.trimStart();
    if (/^structure\b/.test(trimmed) || /^relation\b/.test(trimmed)) {
        return {
            heading: 'Knowledge',
            exportPath: undefined,
            items: [
                { label: 'Structure laws', detail: 'Named obligations on the shape' },
                { label: 'Fields & where', detail: 'Data bundled into the block' },
                { label: 'Reuse definition', detail: 'Plug data into the structure' },
            ],
        };
    }
    return undefined;
}

function ensureDemoIdeTrack(
    scriptDir: string,
    sceneIndex: number,
    turnSource: string,
    sourceFile?: string,
): string {
    const tracksDir = path.join(scriptDir, 'tracks');
    fs.mkdirSync(tracksDir, { recursive: true });
    const trackName = `scene-${sceneIndex}-ide.json`;
    const trackPath = path.join(tracksDir, trackName);
    if (!fs.existsSync(trackPath)) {
        const track: VideoOpsIdeTrack = {
            version: 1,
            sourceFile,
            typing: { charsPerSecond: 28, snippet: typingSnippetFromTurnBlock(turnSource) },
            proofPanel: {
                steps: [
                    { label: 'open goal', goal: '⊢ target proposition' },
                    { label: 'apply tactic', goal: 'subgoal after apply' },
                    { label: 'close branch', goal: 'no open goals' },
                ],
            },
            knowledgePanel: demoKnowledgePanel(turnSource),
            interactions: [
                { atSeconds: 1.5, kind: 'click-proof-step', stepIndex: 0 },
                { atSeconds: 3.2, kind: 'click-proof-step', stepIndex: 1 },
                { atSeconds: 5.0, kind: 'click-branch', branchId: 'main' },
            ],
        };
        fs.writeFileSync(trackPath, `${JSON.stringify(track, null, 2)}\n`, 'utf8');
    }
    return `tracks/${trackName}`;
}

function upgradeSceneLayers(
    scriptDir: string,
    animation: VideoOpsAnimation,
    sourceFile?: string,
): VideoOpsAnimation {
    return {
        ...animation,
        scenes: animation.scenes.map((scene) => {
            const turnCode = scene.layers.find((layer) => layer.type === 'turn-code');
            if (!turnCode || turnCode.type !== 'turn-code') {
                return scene;
            }
            const hasIde = scene.layers.some((layer) => layer.type === 'turn-ide');
            if (hasIde) {
                return scene;
            }
            const track = ensureDemoIdeTrack(scriptDir, scene.index, turnCode.source, sourceFile);
            return {
                ...scene,
                layers: [
                    ...scene.layers.filter((layer) => layer.type !== 'turn-code'),
                    { type: 'turn-ide', track },
                ],
            };
        }),
    };
}

for (const scriptId of scriptsToSync) {
    const scriptDir = resolveScriptDir(scriptId);
    const scriptMarkdownPath = path.join(scriptDir, 'script.md');
    if (!fs.existsSync(scriptMarkdownPath)) {
        console.warn(`Skipping ${scriptId}: missing ${scriptMarkdownPath}`);
        continue;
    }
    const animationPath = path.join(scriptDir, 'animation.json');
    const animationMarkdownPath = path.join(
        scriptDir,
        VIDEO_OPS_ANIMATION_MARKDOWN_FILENAME,
    );
    const animationMarkdown = fs.existsSync(animationMarkdownPath)
        ? fs.readFileSync(animationMarkdownPath, 'utf8')
        : null;
    const markdown = fs.readFileSync(scriptMarkdownPath, 'utf8');
    const script = parseScriptMarkdown(scriptId, markdown);
    const sourceFile = syncTurnSourceFile(markdown);

    let animation: VideoOpsAnimation;
    let animationV3: VideoOpsAnimationV3 | null = null;
    let animationV4: VideoOpsAnimationV4 | null = null;
    const rawAnimation: unknown = fs.existsSync(animationPath)
        ? JSON.parse(fs.readFileSync(animationPath, 'utf8'))
        : null;

    if (animationMarkdown) {
        let baseAnimation: VideoOpsAnimationV4 | undefined;
        if (rawAnimation) {
            if (isAnimationV4(rawAnimation)) {
                baseAnimation = rawAnimation;
            } else {
                if (
                    typeof rawAnimation !== 'object' ||
                    !('version' in rawAnimation) ||
                    rawAnimation.version !== 2
                ) {
                    throw new Error(
                        `${animationMarkdownPath} can only compile over animation.json version 2 or 4.`,
                    );
                }
                baseAnimation = convertAnimationV2ToV4Base(
                    normalizeAnimationJson(rawAnimation, scriptId),
                );
            }
        }
        animationV4 = compileVideoOpsAnimationMarkdown(animationMarkdown, {
            baseAnimation,
            expectedScriptId: scriptId,
        });
        animation = expandAnimationV4ToV2(animationV4);
    } else if (!forceRebuild && rawAnimation) {
        if (isAnimationV4(rawAnimation)) {
            animationV4 = rawAnimation as VideoOpsAnimationV4;
            animation = expandAnimationV4ToV2(animationV4);
        } else if (isAnimationV3(rawAnimation)) {
            animationV3 = rawAnimation as VideoOpsAnimationV3;
            animation = expandAnimationV3ToV2(animationV3);
        } else {
            animation = normalizeAnimationJson(rawAnimation, scriptId);
        }
    } else {
        const remotionPath = path.join(scriptDir, 'remotion.json');
        const legacyRemotion = fs.existsSync(remotionPath)
            ? (JSON.parse(fs.readFileSync(remotionPath, 'utf8')) as LegacyRemotionConfig)
            : null;
        animation = buildAnimationFromScript(script, legacyRemotion);
    }

    animation = upgradeSceneLayers(scriptDir, animation, sourceFile);

    const scriptCleanPath = path.join(scriptDir, 'script-clean.md');
    if (
        !animationMarkdown &&
        scriptMarkdownUsesScriptClean(markdown) &&
        fs.existsSync(scriptCleanPath)
    ) {
        const scriptCleanMarkdown = fs.readFileSync(scriptCleanPath, 'utf8');
        if (animationV4) {
            const sayLines = sayLinesFromScriptCleanMarkdown(scriptCleanMarkdown);
            animationV4 = mergeScriptCleanIntoCompareBeatsV4(animationV4, sayLines);
            animation = expandAnimationV4ToV2(animationV4);
        } else if (animationV3) {
            const sayLines = sayLinesFromScriptCleanMarkdown(scriptCleanMarkdown);
            animationV3 = mergeScriptCleanIntoCompareBeats(animationV3, sayLines);
            animation = expandAnimationV3ToV2(animationV3);
        } else {
            animation = mergeScriptCleanTeleprompter(animation, scriptCleanMarkdown);
        }
    }

    if (!animationV4 && !animationV3) {
        animation = applySpeechPaceToAnimation(animation, scriptId, markdown);
    }

    if (animationV4) {
        animationV4 = {
            ...animationV4,
            scenes: animationV4.scenes.map((scene) =>
                overrideBeatDurationsFromVoice(
                    normalizeCompareBeatsOnSceneV4(applySpeechPaceToSceneV4(scene, scriptId, markdown)),
                    resolveScriptDir(scriptId),
                ),
            ),
        };
        animation = expandAnimationV4ToV2(animationV4);
        // Markdown-authored compare beats compile in memory. Remotion reads
        // compiledTracks from expand — do not write scripts/.../tracks/.
        for (const scene of animation.scenes) {
            for (const layer of scene.layers) {
                if (layer.type !== 'compare' || !layer.compiledTracks?.hintLayouts) {
                    continue;
                }
                const hintPath =
                    layer.hintLayoutsPath ?? 'tracks/scene-compare-hint-layouts.json';
                if (!hintLayoutsBundled[scriptId]) {
                    hintLayoutsBundled[scriptId] = {};
                }
                hintLayoutsBundled[scriptId][hintPath] = layer.compiledTracks.hintLayouts;
            }
        }
        if (!animationMarkdown) {
            for (const scene of animationV4.scenes) {
                if (!scene.compare?.beats?.length || !usesGeneratedCompareLayerV4(scene)) {
                    continue;
                }
                const compiled = compileCompareTracksFromBeatsV4(
                    scene.compare,
                    scene.durationSeconds,
                );
                const tracksDir = path.join(scriptDir, 'tracks');
                fs.mkdirSync(tracksDir, { recursive: true });
                fs.writeFileSync(
                    path.join(scriptDir, compiled.leanTrackPath),
                    `${JSON.stringify(compiled.leanTrack, null, 2)}\n`,
                    'utf8',
                );
                fs.writeFileSync(
                    path.join(scriptDir, compiled.turnTrackPath),
                    `${JSON.stringify(compiled.turnTrack, null, 2)}\n`,
                    'utf8',
                );
                fs.writeFileSync(
                    path.join(scriptDir, compiled.goalExportPath),
                    `${JSON.stringify(compiled.goalExport, null, 2)}\n`,
                    'utf8',
                );
                fs.writeFileSync(
                    path.join(scriptDir, compiled.hintLayoutsPath),
                    `${JSON.stringify(compiled.hintLayouts, null, 2)}\n`,
                    'utf8',
                );
            }
        }
        fs.writeFileSync(animationPath, `${JSON.stringify(animationV4, null, 2)}\n`, 'utf8');
    } else if (animationV3) {
        animationV3 = {
            ...animationV3,
            scenes: animationV3.scenes.map((scene) =>
                normalizeCompareBeatsOnScene(
                    applySpeechPaceToSceneV3(
                        {
                            ...scene,
                            compare: {
                                ...scene.compare,
                                beats: fillCompareBeatViewports(scene.compare.beats),
                            },
                        },
                        scriptId,
                        markdown,
                    ),
                ),
            ),
        };
        animation = expandAnimationV3ToV2(animationV3);
        for (const scene of animationV3.scenes) {
            if (!scene.compare?.beats?.length) {
                continue;
            }
            const compiled = compileCompareTracksFromBeats(scene.compare, scene.durationSeconds);
            const tracksDir = path.join(scriptDir, 'tracks');
            fs.mkdirSync(tracksDir, { recursive: true });
            fs.writeFileSync(
                path.join(scriptDir, compiled.leanTrackPath),
                `${JSON.stringify(compiled.leanTrack, null, 2)}\n`,
                'utf8',
            );
            fs.writeFileSync(
                path.join(scriptDir, compiled.turnTrackPath),
                `${JSON.stringify(compiled.turnTrack, null, 2)}\n`,
                'utf8',
            );
            fs.writeFileSync(
                path.join(scriptDir, compiled.goalExportPath),
                `${JSON.stringify(compiled.goalExport, null, 2)}\n`,
                'utf8',
            );
            fs.writeFileSync(
                path.join(scriptDir, compiled.hintLayoutsPath),
                `${JSON.stringify(compiled.hintLayouts, null, 2)}\n`,
                'utf8',
            );
        }
        fs.writeFileSync(animationPath, `${JSON.stringify(animationV3, null, 2)}\n`, 'utf8');
    } else {
        fs.writeFileSync(animationPath, `${JSON.stringify(animation, null, 2)}\n`, 'utf8');
    }

    for (const scene of animation.scenes) {
        for (const layer of scene.layers) {
            if (layer.type !== 'compare') {
                continue;
            }
            const hintPath = layer.hintLayoutsPath;
            if (!hintPath) {
                continue;
            }
            const absoluteHintPath = path.join(scriptDir, hintPath);
            if (!fs.existsSync(absoluteHintPath)) {
                continue;
            }
            if (!hintLayoutsBundled[scriptId]) {
                hintLayoutsBundled[scriptId] = {};
            }
            hintLayoutsBundled[scriptId][hintPath] = JSON.parse(
                fs.readFileSync(absoluteHintPath, 'utf8'),
            ) as { version: number; layouts: Record<string, { xPct: number; yPct: number }> };
        }
    }

    const renderProps = animationToRenderProps(animation);
    compositionMeta[scriptId] = {
        fps: renderProps.fps,
        width: renderProps.width,
        height: renderProps.height,
        totalFrames: renderProps.totalFrames,
    };

    ensureScriptExportDir(scriptDir);
    syncSocialPostsFile(
        scriptDir,
        scriptId,
        script,
        (animationV4 ?? animationV3 ?? animation).title,
    );
}

const outDir = generatedDir;
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
    path.join(outDir, 'composition-meta.json'),
    `${JSON.stringify(compositionMeta, null, 2)}\n`,
    'utf8',
);
fs.writeFileSync(
    path.join(outDir, 'hint-layouts-bundled.json'),
    `${JSON.stringify(hintLayoutsBundled, null, 2)}\n`,
    'utf8',
);
console.log(`Synced ${scriptsToSync.length} animation.json file(s).`);
