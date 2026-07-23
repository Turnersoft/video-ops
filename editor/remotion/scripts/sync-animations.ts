// Sync animation.md → .cache/render-props.json + composition meta (no animation.json).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSocialPostsDocument,
  mergeSocialPostsDocuments,
  parseSocialPostsDocument,
} from '../src/lib/compile/compile.ts';
import { compileEpisodeFromDir, writeEpisodeCache } from '../src/lib/compile/compileEpisode.ts';
import { parsedScriptFromAnimationMarkdown } from '../src/lib/compile/animationMdMeta.ts';

const VIDEO_OPS_SCRIPT_EXPORT_DIR = 'export';
const VIDEO_OPS_SOCIAL_POSTS_FILENAME = 'social-posts.json';

import { ALL_SERIES, scriptDirFor } from './scriptSeries.mjs';
import { TURN_USER_ROOT, VIDEO_OPS_ROOT } from './repoPaths';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const remotionDir = path.resolve(__dirname, '..');
const videoOpsDir = VIDEO_OPS_ROOT;
const generatedDir = path.join(remotionDir, 'src', 'lib', 'generated');

const manifest = JSON.parse(fs.readFileSync(path.join(videoOpsDir, 'manifest.json'), 'utf8')) as {
  scripts: string[];
};

const forceRebuild = process.argv.includes('--force');
const strictKit = process.argv.includes('--strict-kit');
const scriptArgumentIndex = process.argv.indexOf('--script');
const selectedScriptId =
  scriptArgumentIndex >= 0 ? process.argv[scriptArgumentIndex + 1]?.trim() : undefined;
if (scriptArgumentIndex >= 0 && !selectedScriptId) {
  throw new Error('--script requires a script id.');
}
if (selectedScriptId) {
  const dir = scriptDirFor(videoOpsDir, selectedScriptId);
  const inManifest = manifest.scripts.includes(selectedScriptId);
  const hasAnimationMd = fs.existsSync(path.join(dir, 'animation.md'));
  if (!inManifest && !hasAnimationMd) {
    throw new Error(`Unknown script id "${selectedScriptId}".`);
  }
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
> = readExistingGeneratedRecord('composition-meta.json');

const hintLayoutsBundled: Record<
  string,
  Record<string, { version: number; layouts: Record<string, { xPct: number; yPct: number }> }>
> = readExistingGeneratedRecord('hint-layouts-bundled.json');

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
  animationMarkdownRaw: string,
  animationTitle?: string,
): void {
  const socialPath = path.join(scriptDir, VIDEO_OPS_SOCIAL_POSTS_FILENAME);
  const existing = fs.existsSync(socialPath)
    ? parseSocialPostsDocument(fs.readFileSync(socialPath, 'utf8'))
    : null;
  const parsedScript = parsedScriptFromAnimationMarkdown(scriptId, animationMarkdownRaw);
  const fresh = buildSocialPostsDocument(scriptId, parsedScript, animationTitle);
  const merged = mergeSocialPostsDocuments(existing, fresh);
  fs.writeFileSync(socialPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
}

let syncedCount = 0;
const failures: string[] = [];

for (const scriptId of scriptsToSync) {
  const scriptDir = scriptDirFor(videoOpsDir, scriptId);
  const animationMarkdownPath = path.join(scriptDir, 'animation.md');
  if (!fs.existsSync(animationMarkdownPath)) {
    console.warn(`Skipping ${scriptId}: missing ${animationMarkdownPath}`);
    continue;
  }

  try {
    const animationMarkdownRaw = fs.readFileSync(animationMarkdownPath, 'utf8');
    const compiled = compileEpisodeFromDir(scriptDir, scriptId, {
      forceRebuild,
      probeAudioDurationSeconds,
      strictKit,
    });
    writeEpisodeCache(scriptDir, compiled);

    if (Object.keys(compiled.hintLayouts).length) {
      hintLayoutsBundled[scriptId] = compiled.hintLayouts as typeof hintLayoutsBundled[string];
    }

    const { renderProps } = compiled;
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
      animationMarkdownRaw,
      compiled.animationV4?.title,
    );
    syncedCount += 1;
    console.log(`Synced ${scriptId} from animation.md → .cache/`);
  } catch (error) {
    failures.push(scriptId);
    console.error(`Failed to sync ${scriptId}:`, error);
  }
}

fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(
  path.join(generatedDir, 'composition-meta.json'),
  `${JSON.stringify(compositionMeta, null, 2)}\n`,
  'utf8',
);
fs.writeFileSync(
  path.join(generatedDir, 'hint-layouts-bundled.json'),
  `${JSON.stringify(hintLayoutsBundled, null, 2)}\n`,
  'utf8',
);

/** Keep browser/Deno series lookup JSON in sync with projects/<series>/<episode>/. */
function writeScriptSeriesMapJson(): void {
  const mapping: Record<string, string> = {};
  const projectsDir = path.join(videoOpsDir, 'projects');
  const seriesDirs = [...ALL_SERIES];
  for (const series of seriesDirs) {
    const seriesDir = path.join(projectsDir, series);
    if (!fs.existsSync(seriesDir)) {
      continue;
    }
    for (const entry of fs.readdirSync(seriesDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'shared' || entry.name.startsWith('.')) {
        continue;
      }
      const epDir = path.join(seriesDir, entry.name);
      if (!fs.existsSync(path.join(epDir, 'animation.md'))) {
        continue;
      }
      mapping[entry.name] = series;
    }
  }
  const sorted = Object.fromEntries(Object.entries(mapping).sort(([a], [b]) => a.localeCompare(b)));
  const jsonPath = path.join(generatedDir, 'scriptSeriesMap.json');
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
}

if (!selectedScriptId) {
  writeScriptSeriesMapJson();
}

if (failures.length) {
  console.error(
    `Synced ${syncedCount}/${scriptsToSync.length} episode(s); failed: ${failures.join(', ')}`,
  );
  process.exit(1);
}

console.log(`Synced ${syncedCount} episode(s) from animation.md.`);

// Silence unused import warning for turn user root (future turn source sync).
void TURN_USER_ROOT;
