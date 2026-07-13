#!/usr/bin/env node
// /Users/johndoe/Documents/company/basic_ui/video_ops/remotion/scripts/render-script.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { scriptDirFor } from './scriptSeries.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const remotionDir = path.resolve(__dirname, '..');
const videoOpsDir = path.join(remotionDir, '..');
const scriptId = process.argv[2];

if (!scriptId) {
    console.error('Usage: npm run render:script -- <script-id>');
    process.exit(1);
}

function run(npmArgs) {
    const result = spawnSync('npm', npmArgs, { cwd: remotionDir, stdio: 'inherit', shell: true });
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

run(['run', 'prep']);
run(['run', 'warm-knowledge', scriptId]);

const scriptDir = scriptDirFor(videoOpsDir, scriptId);
const hintLayoutsPath = path.join(scriptDir, 'tracks', 'scene-compare-hint-layouts.json');
if (fs.existsSync(hintLayoutsPath)) {
    const hintFile = JSON.parse(fs.readFileSync(hintLayoutsPath, 'utf8'));
    const count = Object.keys(hintFile.layouts ?? {}).length;
    if (count === 0) {
        console.warn(
            `[render:script] ${scriptId}: hint layouts file is empty. In the VideoOps editor click "Save hint positions" after dragging callouts, then re-run export.`,
        );
    } else {
        console.log(`[render:script] ${scriptId}: ${count} hint layout(s) on disk.`);
    }
}

const exportDir = path.join(scriptDir, 'export');
fs.mkdirSync(exportDir, { recursive: true });
const output = path.join(exportDir, `${scriptId}.mp4`);
console.log(`[render:script] ${scriptId}: writing ${path.relative(videoOpsDir, output)}`);

const result = spawnSync(
    'npx',
    ['remotion', 'render', scriptId, output, '--codec=h264', '--crf=18', '--log=info'],
    { cwd: remotionDir, stdio: 'inherit', shell: true },
);

process.exit(result.status ?? 1);
