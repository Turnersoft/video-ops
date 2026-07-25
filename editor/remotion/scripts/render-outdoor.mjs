#!/usr/bin/env node
/**
 * Outdoor composite render: build Remotion props in memory and pass them to
 * `remotion render` — no animation-v4 mutation, no repo-wide sync.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { scriptDirFor } from './scriptSeries.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const remotionDir = path.resolve(__dirname, '..');
/** `video_ops` repo root (remotion lives at editor/remotion). */
const videoOpsDir = path.resolve(remotionDir, '../..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, ...options });
  if (result.status !== 0) {
    const error = new Error(`${command} ${args.join(' ')} failed`);
    error.status = result.status ?? 1;
    throw error;
  }
}

function usage() {
  console.log(`Usage:
node editor/remotion/scripts/render-outdoor.mjs <script-id> [--edit-dir path] [--format portrait|landscape|both] [--realign]
`);
}

const scriptId = process.argv[2];
if (!scriptId) {
  usage();
  process.exit(1);
}

let editDir = '';
let format = 'both';
let realign = false;
for (let index = 3; index < process.argv.length; index += 1) {
  const token = process.argv[index];
  if (token === '--edit-dir' && process.argv[index + 1]) {
    editDir = path.resolve(process.argv[index + 1]);
    index += 1;
    continue;
  }
  if (token === '--format' && process.argv[index + 1]) {
    format = process.argv[index + 1];
    index += 1;
    continue;
  }
  if (token === '--realign') {
    realign = true;
  }
}

const scriptDir = scriptDirFor(videoOpsDir, scriptId);
const outdoorPostMain = path.join(videoOpsDir, 'editor/outdoor_post/main.ts');
if (!editDir) {
  editDir = path.join(scriptDir, 'export', 'outdoor-edit-take-mrbtjdup');
}

const alignmentPath = path.join(editDir, 'speech-alignment.json');
const outdoorAnimationPath = path.join(editDir, 'animation-outdoor.json');
if (realign || !fs.existsSync(alignmentPath) || !fs.existsSync(outdoorAnimationPath)) {
  const alignArgs = [
    'run',
    '--allow-all',
    outdoorPostMain,
    'align-speech-to-beats',
    scriptId,
    '--edit-dir',
    editDir,
  ];
  if (realign) {
    alignArgs.push('--retranscribe');
  }
  run('deno', alignArgs);
}

run('deno', [
  'run',
  '--allow-all',
  outdoorPostMain,
  'build-outdoor-manifest',
  scriptId,
  '--edit-dir',
  editDir,
]);

const manifest = readJson(path.join(editDir, 'outdoor-manifest.json'));
console.log(
  `[render-outdoor] ${manifest.captionSegments.length} caption segments, ${manifest.editedDurationSeconds}s`,
);
console.log(`[render-outdoor] beat durations: ${manifest.beatDurationsSeconds.join(', ')}s`);

// Turn knowledge for compare beats (tracks); does not touch animation caches.
run('npm', ['run', 'warm-knowledge', scriptId], { cwd: remotionDir });

const fps = 30;
const totalFrames = Math.max(1, Math.round(manifest.editedDurationSeconds * fps));
const frameRange = `0-${totalFrames - 1}`;

const renders = [];
if (format === 'portrait' || format === 'both') {
  renders.push({
    composition: 'video-outdoor-portrait',
    output: path.join(editDir, 'outdoor-portrait.mp4'),
    format: 'portrait',
  });
}
if (format === 'landscape' || format === 'both') {
  renders.push({
    composition: 'video-outdoor-landscape',
    output: path.join(editDir, 'outdoor-landscape.mp4'),
    format: 'landscape',
  });
}

let status = 0;
try {
  for (const job of renders) {
    const propsPath = path.join(editDir, `remotion-props-${job.format}.json`);
    run(
      'npx',
      [
        'tsx',
        path.join(remotionDir, 'scripts/buildOutdoorRenderProps.ts'),
        scriptId,
        outdoorAnimationPath,
        propsPath,
        job.format,
      ],
      { cwd: remotionDir },
    );

    console.log(`[render-outdoor] rendering ${job.composition} → ${job.output}`);
    run(
      'npx',
      [
        'remotion',
        'render',
        job.composition,
        job.output,
        `--props=${propsPath}`,
        `--frames=${frameRange}`,
        // Required for manim-web / Three.js WebGL in headless Chromium.
        '--gl=angle',
        '--codec=h264',
        '--crf=18',
        '--log=info',
      ],
      { cwd: remotionDir },
    );
  }
} catch (error) {
  status = 1;
  console.error(error);
}

if (status !== 0) {
  process.exit(status);
}

console.log('[render-outdoor] done');
