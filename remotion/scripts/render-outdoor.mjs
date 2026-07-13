#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { scriptDirFor } from './scriptSeries.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const remotionDir = path.resolve(__dirname, '..');
const videoOpsDir = path.join(remotionDir, '..');

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
node video_ops/remotion/scripts/render-outdoor.mjs <script-id> [--edit-dir path] [--format portrait|landscape|both] [--realign]
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
if (!editDir) {
  editDir = path.join(scriptDir, 'export', 'outdoor-edit-take-mrbtjdup');
}

const alignmentPath = path.join(editDir, 'speech-alignment.json');
const outdoorAnimationPath = path.join(editDir, 'animation-outdoor.json');
if (realign || !fs.existsSync(alignmentPath) || !fs.existsSync(outdoorAnimationPath)) {
  const alignArgs = [
    'run',
    '--allow-all',
    path.join(videoOpsDir, 'outdoor_post/main.ts'),
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
  path.join(videoOpsDir, 'outdoor_post/main.ts'),
  'build-outdoor-manifest',
  scriptId,
  '--edit-dir',
  editDir,
]);

const manifest = readJson(path.join(editDir, 'outdoor-manifest.json'));
const animPath = path.join(scriptDir, 'animation.json');
const canonical = fs.readFileSync(animPath, 'utf8');
const outdoorSource = fs.readFileSync(outdoorAnimationPath, 'utf8');
const animation = JSON.parse(outdoorSource);
const scene = animation.scenes[0];

console.log(
  `[render-outdoor] using animation-outdoor.json — ${manifest.captionSegments.length} caption segments, scene ${scene.durationSeconds}s`,
);
console.log(`[render-outdoor] beat durations: ${manifest.beatDurationsSeconds.join(', ')}s`);

fs.writeFileSync(animPath, `${JSON.stringify(animation, null, 2)}\n`);

let status = 0;
try {
  run('npm', ['run', 'sync'], { cwd: remotionDir });
  run('node', [path.join(remotionDir, 'scripts/ensure-public-dir.mjs')]);
  run('npm', ['run', 'warm-knowledge', scriptId], { cwd: remotionDir });

  const fps = animation.composition?.fps ?? 30;
  const totalFrames = Math.max(1, Math.round(manifest.editedDurationSeconds * fps));
  const frameRange = `0-${totalFrames - 1}`;
  const props = JSON.stringify({ scriptId, format: 'portrait' });
  const propsLandscape = JSON.stringify({ scriptId, format: 'landscape' });

  const renders = [];
  if (format === 'portrait' || format === 'both') {
    renders.push({
      composition: 'video-outdoor-portrait',
      output: path.join(editDir, `${scriptId}-outdoor-portrait.mp4`),
      props,
    });
  }
  if (format === 'landscape' || format === 'both') {
    renders.push({
      composition: 'video-outdoor-landscape',
      output: path.join(editDir, `${scriptId}-outdoor-landscape.mp4`),
      props: propsLandscape,
    });
  }

  for (const job of renders) {
    console.log(`[render-outdoor] rendering ${job.composition} → ${job.output}`);
    run('npx', [
      'remotion',
      'render',
      job.composition,
      job.output,
      `--props=${job.props}`,
      `--frames=${frameRange}`,
      '--codec=h264',
      '--crf=18',
      '--log=info',
    ], { cwd: remotionDir });
  }
} catch (error) {
  status = 1;
  console.error(error);
} finally {
  fs.writeFileSync(animPath, canonical);
  console.log('[render-outdoor] restored canonical animation.json');
}

if (status !== 0) {
  process.exit(status);
}

console.log('[render-outdoor] done');
