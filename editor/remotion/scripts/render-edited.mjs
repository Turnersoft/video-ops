#!/usr/bin/env node
// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/scripts/render-edited.mjs
//
// AI-voice edited export. Teleprompter-paced v4 doc lives in .cache/animation-v4.json (from animation.md).
// This script temporarily injects audio-calibrated timings, renders, then restores the cache file.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { scriptDirFor, animationV4CachePath, ANIMATION_V4_CACHE_REL } from './scriptSeries.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const remotionDir = path.resolve(__dirname, '..');
const videoOpsDir = path.join(remotionDir, '..');
const scriptId = process.argv[2];

if (!scriptId) {
    console.error('Usage: npm run render:edited -- <script-id>');
    process.exit(1);
}

const scriptDir = scriptDirFor(videoOpsDir, scriptId);
const animPath = animationV4CachePath(videoOpsDir, scriptId);
const manifestPath = path.join(scriptDir, 'export', 'voice-manifest.json');

if (!fs.existsSync(animPath)) {
    console.error(
        `[render:edited] missing ${ANIMATION_V4_CACHE_REL} — run npm run sync in remotion/ first.`,
    );
    process.exit(1);
}

if (!fs.existsSync(manifestPath)) {
    console.error(`[render:edited] missing ${manifestPath} — run gen_beats.py first.`);
    process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.version !== 2 || !Array.isArray(manifest.beats)) {
    console.error('[render:edited] voice-manifest.json must be version 2 (sentence segments).');
    process.exit(1);
}

const canonical = fs.readFileSync(animPath, 'utf8');
const animation = JSON.parse(canonical);
const scene = animation.scenes[0];
const beats = scene.compare?.beats ?? [];
if (beats.length !== manifest.beats.length) {
    console.error(
        `[render:edited] beat count mismatch: animation ${beats.length} vs manifest ${manifest.beats.length}.`,
    );
    process.exit(1);
}

// Inject audio-calibrated timings (temporary — canonical file restored below).
const beatDurations = manifest.beats.map((beat) => beat.durationSeconds);
const captionSegments = [];
let beatStart = 0;
for (const beat of manifest.beats) {
    for (const segment of beat.segments ?? []) {
        captionSegments.push({
            text: segment.text,
            zh: segment.zh || undefined,
            atSeconds: Math.round((beatStart + segment.offsetSeconds) * 100) / 100,
            durationSeconds: segment.durationSeconds,
        });
    }
    beatStart += beat.durationSeconds;
}

beats.forEach((beat, index) => {
    beat.durationSeconds = beatDurations[index];
});
scene.durationSeconds = Math.round(beatDurations.reduce((sum, value) => sum + value, 0));
scene.burnCaptions = true;
scene.voiceEdit = {
    burnCaptionsZh: manifest.burnCaptionsZh !== false,
    beatVoiceSrc: manifest.beats.map((beat) => beat.audio),
    beatDurationsSeconds: beatDurations,
    captionSegments,
};

fs.writeFileSync(animPath, `${JSON.stringify(animation, null, 2)}\n`);
console.log(
    `[render:edited] injected ${captionSegments.length} caption segments, scene ${scene.durationSeconds}s`,
);

let status = 0;
try {
    const result = spawnSync('node', [path.join(__dirname, 'render-script.mjs'), scriptId], {
        cwd: remotionDir,
        stdio: 'inherit',
        shell: false,
    });
    status = result.status ?? 1;
} finally {
    fs.writeFileSync(animPath, canonical);
    console.log(`[render:edited] restored ${ANIMATION_V4_CACHE_REL} (teleprompter pace)`);
}

if (status !== 0) {
    process.exit(status);
}

const defaultPath = path.join(scriptDir, 'export', 'video.mp4');
const exportPath = path.join(scriptDir, 'export', 'video-edited.mp4');
if (fs.existsSync(defaultPath)) {
    fs.renameSync(defaultPath, exportPath);
    console.log(`[render:edited] wrote ${exportPath}`);
}
