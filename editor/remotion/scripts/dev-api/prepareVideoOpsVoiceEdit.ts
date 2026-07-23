#!/usr/bin/env npx tsx
/**
 * Prepare beat-aligned voice + bilingual caption manifest for Remotion edited export.
 *
 * Groups Jianying (剪映) textReading WAV clips (mtime order) into animation beats,
 * concatenates per beat with ffmpeg, updates beat durationSeconds from measured audio,
 * and writes export/voice-manifest.json.
 *
 * Usage:
 *   npx tsx scripts/dev-api/prepareVideoOpsVoiceEdit.ts sets-v2-03-proper-subset
 *   npx tsx scripts/dev-api/prepareVideoOpsVoiceEdit.ts sets-v2-03-proper-subset --jianying "/path/to/draft"
 *   npx tsx scripts/dev-api/prepareVideoOpsVoiceEdit.ts sets-v2-03-proper-subset --say-voice Daniel
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { isAnimationV4 } from '../../src/lib/compile/video-ops/videoOpsAnimationBeats';
import { scriptDirForId } from './videoOpsScriptPaths';

type WavClip = { path: string; duration: number };

type VoiceManifestBeat = {
    index: number;
    audio: string;
    durationSeconds: number;
};

type VoiceManifest = {
    version: 1;
    scriptId: string;
    source: 'jianying-textReading' | 'macos-say';
    jianyingDraft?: string;
    generatedAt: string;
    burnCaptions: true;
    burnCaptionsZh: true;
    beats: VoiceManifestBeat[];
};

function probeDurationSeconds(filePath: string): number {
    const raw = execSync(
        `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
        { encoding: 'utf8' },
    ).trim();
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid duration for ${filePath}: ${raw}`);
    }
    return value;
}

function listJianyingWavs(draftDir: string): WavClip[] {
    const textReading = path.join(draftDir, 'textReading');
    if (!fs.existsSync(textReading)) {
        throw new Error(`Jianying textReading folder not found: ${textReading}`);
    }
    return fs
        .readdirSync(textReading)
        .filter((name) => name.endsWith('.wav'))
        .map((name) => {
            const filePath = path.join(textReading, name);
            return {
                path: filePath,
                duration: probeDurationSeconds(filePath),
                mtime: fs.statSync(filePath).mtimeMs,
            };
        })
        .sort((a, b) => a.mtime - b.mtime)
        .map(({ path: filePath, duration }) => ({ path: filePath, duration }));
}

function groupWavsIntoBeats(clips: WavClip[], beatWeights: number[]): WavClip[][] {
    if (clips.length === 0 || beatWeights.length === 0) {
        return [];
    }
    const totalClipDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);
    const totalWeight = beatWeights.reduce((sum, weight) => sum + weight, 0);
    const groups: WavClip[][] = beatWeights.map(() => []);
    const cumulativeTargets: number[] = [];
    let cumulative = 0;
    for (const weight of beatWeights) {
        cumulative += (weight / totalWeight) * totalClipDuration;
        cumulativeTargets.push(cumulative);
    }

    let clipIndex = 0;
    let timeline = 0;

    for (let beatIndex = 0; beatIndex < beatWeights.length; beatIndex += 1) {
        const isLast = beatIndex === beatWeights.length - 1;
        const targetEnd = cumulativeTargets[beatIndex];

        while (clipIndex < clips.length) {
            if (!isLast && groups[beatIndex].length > 0 && timeline >= targetEnd) {
                break;
            }
            const clip = clips[clipIndex];
            groups[beatIndex].push(clip);
            timeline += clip.duration;
            clipIndex += 1;
            if (isLast) {
                continue;
            }
            if (timeline >= targetEnd) {
                break;
            }
        }
    }

    return groups;
}

function concatWavs(clips: WavClip[], outputPath: string): void {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    if (clips.length === 0) {
        execSync(
            `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 0.5 "${outputPath}"`,
            { stdio: 'pipe' },
        );
        return;
    }
    if (clips.length === 1) {
        execSync(`ffmpeg -y -i "${clips[0].path}" -c:a pcm_s16le "${outputPath}"`, { stdio: 'pipe' });
        return;
    }
    const listPath = path.join(os.tmpdir(), `voice-concat-${Date.now()}.txt`);
    const listBody = clips.map((clip) => `file '${clip.path.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listPath, listBody);
    try {
        execSync(
            `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c:a pcm_s16le "${outputPath}"`,
            { stdio: 'pipe' },
        );
    } finally {
        fs.unlinkSync(listPath);
    }
}

function generateSayWav(text: string, outputPath: string, voice: string): void {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const aiffPath = outputPath.replace(/\.wav$/, '.aiff');
    const escaped = text.replace(/"/g, '\\"');
    execSync(`say -v "${voice}" -o "${aiffPath}" "${escaped}"`, { stdio: 'pipe' });
    execSync(`ffmpeg -y -i "${aiffPath}" -c:a pcm_s16le "${outputPath}"`, { stdio: 'pipe' });
    fs.unlinkSync(aiffPath);
}

function padBeatIndex(index: number): string {
    return String(index).padStart(2, '0');
}

function defaultJianyingDraft(): string | undefined {
    const home = os.homedir();
    const candidate = path.join(
        home,
        'Movies/JianyingPro/User Data/Projects/com.lveditor.draft/7月2日',
    );
    return fs.existsSync(candidate) ? candidate : undefined;
}

function main(): void {
    const args = process.argv.slice(2);
    const scriptId = args.find((arg) => !arg.startsWith('--'));
    if (!scriptId) {
        console.error(
            'Usage: npx tsx scripts/dev-api/prepareVideoOpsVoiceEdit.ts <script-id> [--jianying <draft-dir>] [--say-voice <name>]',
        );
        process.exit(1);
    }

    const jianyingFlag = args.indexOf('--jianying');
    const jianyingDraft =
        jianyingFlag >= 0 ? args[jianyingFlag + 1] : defaultJianyingDraft();
    const sayVoiceFlag = args.indexOf('--say-voice');
    const sayVoice = sayVoiceFlag >= 0 ? args[sayVoiceFlag + 1] : 'Daniel';

    const scriptDir = scriptDirForId(scriptId);
    const animationPath = path.join(scriptDir, 'animation.json');
    const animation = JSON.parse(fs.readFileSync(animationPath, 'utf8'));
    if (!isAnimationV4(animation)) {
        throw new Error(`${scriptId}: voice edit requires animation.json version 4 with compare beats.`);
    }

    const scene = animation.scenes[0];
    const beats = scene.compare?.beats ?? [];
    if (beats.length === 0) {
        throw new Error(`${scriptId}: no compare beats found.`);
    }

    const voiceDir = path.join(scriptDir, 'export', 'voice');
    fs.mkdirSync(voiceDir, { recursive: true });

    const beatWeights = beats.map((beat: { say: string }) => beat.say.replace(/\s+/g, ' ').trim().length);
    let source: VoiceManifest['source'] = 'macos-say';
    let clipGroups: WavClip[][];

    if (jianyingDraft && fs.existsSync(path.join(jianyingDraft, 'textReading'))) {
        const clips = listJianyingWavs(jianyingDraft);
        clipGroups = groupWavsIntoBeats(clips, beatWeights);
        source = 'jianying-textReading';
        console.log(
            `[voice-edit] ${scriptId}: grouped ${clips.length} Jianying clips → ${beats.length} beats`,
        );
    } else {
        clipGroups = beats.map(() => []);
        console.warn(
            `[voice-edit] ${scriptId}: no Jianying draft — generating macOS say (${sayVoice}) per beat`,
        );
    }

    const manifestBeats: VoiceManifestBeat[] = [];

    for (let index = 0; index < beats.length; index += 1) {
        const outputRel = `export/voice/beat-${padBeatIndex(index)}.wav`;
        const outputPath = path.join(scriptDir, outputRel);
        const beat = beats[index];

        if (source === 'jianying-textReading') {
            concatWavs(clipGroups[index] ?? [], outputPath);
        } else {
            generateSayWav(beat.say.replace(/\n/g, ' '), outputPath, sayVoice);
        }

        const durationSeconds = Math.max(0.5, Math.round(probeDurationSeconds(outputPath) * 10) / 10);
        beat.durationSeconds = durationSeconds;
        manifestBeats.push({ index, audio: outputRel, durationSeconds });
        console.log(`[voice-edit] beat ${index}: ${durationSeconds}s → ${outputRel}`);
    }

    scene.durationSeconds = manifestBeats.reduce((sum, beat) => sum + beat.durationSeconds, 0);
    scene.burnCaptions = true;
    scene.voiceEdit = {
        burnCaptionsZh: true,
        beatVoiceSrc: manifestBeats.map((beat) => beat.audio),
    };

    fs.writeFileSync(animationPath, `${JSON.stringify(animation, null, 2)}\n`);

    const manifest: VoiceManifest = {
        version: 1,
        scriptId,
        source,
        jianyingDraft: source === 'jianying-textReading' ? jianyingDraft : undefined,
        generatedAt: new Date().toISOString(),
        burnCaptions: true,
        burnCaptionsZh: true,
        beats: manifestBeats,
    };
    const manifestPath = path.join(scriptDir, 'export', 'voice-manifest.json');
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    console.log(`[voice-edit] ${scriptId}: scene duration ${scene.durationSeconds}s`);
    console.log(`[voice-edit] wrote ${path.relative(process.cwd(), manifestPath)}`);
    console.log(`[voice-edit] updated ${path.relative(process.cwd(), animationPath)}`);
}

main();
