#!/usr/bin/env node
/**
 * Outdoor composite render: build Remotion props in memory and pass them to
 * `remotion render` — no animation-v4 mutation, no repo-wide sync.
 */
import { spawn, spawnSync } from 'node:child_process';
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

const renderLogPaths = {
  portrait: path.join(editDir, 'render-portrait.log'),
  landscape: path.join(editDir, 'render-landscape.log'),
};

function resetRenderLogs(formats) {
  for (const format of formats) {
    const logPath = renderLogPaths[format];
    if (logPath) {
      fs.writeFileSync(logPath, '');
    }
  }
}

function appendRenderLog(format, line) {
  const logPath = renderLogPaths[format];
  if (logPath) {
    fs.appendFileSync(logPath, `${line}\n`);
  }
}

function runAsync(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false, ...options });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(' ')} failed`));
        return;
      }
      resolve();
    });
  });
}

function runAsyncLabeled(command, args, label, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
      ...options,
    });
    let stdoutRemainder = '';
    let stderrRemainder = '';

    const emitPrefixedLines = (text, streamLabel, remainderKey) => {
      const combined = (remainderKey === 'stdout' ? stdoutRemainder : stderrRemainder) + text;
      const parts = combined.split('\n');
      const remainder = parts.pop() ?? '';
      if (remainderKey === 'stdout') {
        stdoutRemainder = remainder;
      } else {
        stderrRemainder = remainder;
      }
      for (const line of parts) {
        if (!line.trim()) {
          continue;
        }
        appendRenderLog(label, line);
        const prefixed = `[${label}] ${line}`;
        if (streamLabel === 'stderr') {
          console.error(prefixed);
        } else {
          console.log(prefixed);
        }
      }
    };

    child.stdout?.on('data', (chunk) => {
      emitPrefixedLines(chunk.toString(), 'stdout', 'stdout');
    });
    child.stderr?.on('data', (chunk) => {
      emitPrefixedLines(chunk.toString(), 'stderr', 'stderr');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (stdoutRemainder.trim()) {
        appendRenderLog(label, stdoutRemainder.trim());
        console.log(`[${label}] ${stdoutRemainder.trim()}`);
      }
      if (stderrRemainder.trim()) {
        appendRenderLog(label, stderrRemainder.trim());
        console.error(`[${label}] ${stderrRemainder.trim()}`);
      }
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(' ')} failed`));
        return;
      }
      resolve();
    });
  });
}

async function buildRenderProps(job) {
  const propsPath = path.join(editDir, `remotion-props-${job.format}.json`);
  await runAsync(
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
  return propsPath;
}

async function renderJob(job, propsPath) {
  console.log(`[render-outdoor] rendering ${job.composition} → ${job.output}`);
  await runAsyncLabeled(
    'npx',
    [
      'remotion',
      'render',
      job.composition,
      job.output,
      `--props=${propsPath}`,
      `--frames=${frameRange}`,
      '--gl=angle',
      '--codec=h264',
      '--crf=18',
      '--log=info',
    ],
    job.format,
    { cwd: remotionDir },
  );
}

try {
  const propsByFormat = new Map();
  for (const job of renders) {
    propsByFormat.set(job.format, await buildRenderProps(job));
  }
  if (renders.length > 1) {
    console.log(
      `[render-outdoor] parallel render: ${renders.map((job) => job.format).join(' + ')}`,
    );
  }
  resetRenderLogs(renders.map((job) => job.format));
  await Promise.all(
    renders.map((job) => renderJob(job, propsByFormat.get(job.format))),
  );
} catch (error) {
  console.error(error);
  process.exit(1);
}

console.log('[render-outdoor] done');
