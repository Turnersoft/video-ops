import path from 'node:path';

import {
  VOXCPM_TONE_PRESETS,
  isVoxcpmToneId,
  joinVoxcpmSentences,
  reconcileVoxcpmSentences,
  voxcpmSentenceFingerprint,
  voxcpmVoiceMetadataFromSentences,
  type VoxcpmScriptSentence,
  type VoxcpmToneId,
} from '../../../src/voxcpmScript.ts';
import {
  parseBeatVariantsBlock,
  splitAnimationBeatSections,
} from '../../../src/beatVariants.ts';
import { readAnimationMd } from './animation-md.ts';
import { fileExists, readJson, writeJsonAtomic } from './fs_util.ts';
import { buildLiveScript, patchLiveBeat } from './live-script.ts';
import { ensureDir, scriptDirFor, VIDEO_OPS_ROOT } from './paths.ts';
import { compileAnimationSource } from './scripts-watcher.ts';
import { runCommand } from './subprocess.ts';
import {
  cloneVoxcpmAudio,
  ensureVoxcpmServer,
  probeAudioDurationSeconds,
} from './voxcpm-client.ts';
import {
  resolveVoxcpmReferenceClip,
  type VoxcpmReferenceOptions,
} from './voxcpm-reference.ts';
import {
  VOXCPM_CFG_VALUE,
  VOXCPM_INFERENCE_TIMESTEPS,
} from './voxcpm-config.ts';
import {
  cloneIndexTtsAudio,
  ensureIndexTtsServer,
} from './indextts-client.ts';
import { defaultVoiceEngine, parseVoiceEngine, type VoiceEngineId } from '../../../src/voiceEngine.ts';
import { parseScriptLanguage, type ScriptLanguageId } from '../../../src/scriptLanguage.ts';

export type VoxcpmEditorSentenceStatus =
  | 'idle'
  | 'queued'
  | 'rendering'
  | 'ready'
  | 'failed';

export type VoxcpmEditorSentence = VoxcpmScriptSentence & {
  status: VoxcpmEditorSentenceStatus;
  /** True when cached audio matches the current sentence text + tone + reference. */
  hasLatestAudio: boolean;
  /** 0–100 progress toward latest VoxCPM audio for this sentence. */
  progressPercent: number;
  audioUrl: string | null;
  durationSeconds: number | null;
  error: string | null;
};

export type VoxcpmEditorBeat = {
  beatIndex: number;
  beatId: string;
  title: string;
  sentences: VoxcpmEditorSentence[];
  beatAudioUrl: string | null;
  beatDurationSeconds: number | null;
  /** Stable path under the script folder for Remotion Studio (`export/voice/…`). */
  previewVoiceSrc: string | null;
  /** Ready sentence count / total — drives progressive Remotion duration. */
  readySentenceCount: number;
};

export type VoxcpmEditorDocument = {
  schemaVersion: 1;
  scriptId: string;
  title: string;
  animationMdUpdatedAt: string | null;
  referenceTakeId: string | null;
  voiceEngine: VoiceEngineId;
  scriptLanguage: ScriptLanguageId;
  /** Active engine wired into Remotion preview voiceEdit. */
  previewVoiceEngine: VoiceEngineId;
  previewEnginesReady: Record<VoiceEngineId, boolean>;
  /** Changes when preview voice files or beat durations are republished. */
  previewRevision: string;
  beats: VoxcpmEditorBeat[];
};

export type VoiceEditorOptions = VoxcpmReferenceOptions & {
  voiceEngine?: VoiceEngineId;
  scriptLanguage?: ScriptLanguageId;
};

function resolveVoiceEngine(options: VoiceEditorOptions = {}): VoiceEngineId {
  return parseVoiceEngine(options.voiceEngine);
}

function resolveScriptLanguage(options: VoiceEditorOptions = {}): ScriptLanguageId {
  return parseScriptLanguage(options.scriptLanguage);
}

function spokenTextForBeat(
  beat: { say: string; chinese: string },
  scriptLanguage: ScriptLanguageId,
): string {
  if (scriptLanguage === 'zh') {
    return beat.chinese.trim() || beat.say.trim();
  }
  return beat.say.trim();
}

export type VoxcpmRelativeCaptionSegment = {
  id: string;
  text: string;
  atSeconds: number;
  durationSeconds: number;
};

type CachedSentence = {
  sentenceId: string;
  cacheKey: string;
  tone: VoxcpmToneId;
  fingerprint: string;
  referenceKey: string;
  audioFile: string;
  durationSeconds: number;
  updatedAt: string;
};

type CachedBeat = {
  beatIndex: number;
  revisionKey: string;
  referenceKey: string;
  audioFile: string;
  durationSeconds: number;
  updatedAt: string;
};

type VoxcpmEditorManifest = {
  schemaVersion: 1;
  updatedAt: string;
  lastReferenceTakeId?: string;
  lastReferenceAudioPath?: string;
  sentences: Record<string, CachedSentence>;
  beats: Record<string, CachedBeat>;
};

type ActiveRender = {
  status: 'queued' | 'rendering' | 'failed';
  progressPercent: number;
  error?: string;
};

function progressForStatus(
  status: VoxcpmEditorSentenceStatus,
  active?: ActiveRender,
): number {
  if (active) {
    return Math.max(0, Math.min(100, Math.round(active.progressPercent)));
  }
  switch (status) {
    case 'ready':
      return 100;
    case 'queued':
      return 8;
    case 'rendering':
      return 55;
    case 'failed':
    case 'idle':
      return 0;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

const STYLE_ANCHOR_VERSION = 2;
const activeRenders = new Map<string, ActiveRender>();
/** Pipeline I/O around the single-model VoxCPM lock (default 1). */
const SYNTHESIS_CONCURRENCY = Math.max(
  1,
  Math.min(4, Number(Deno.env.get('VOXCPM_SYNTHESIS_CONCURRENCY') ?? '1') || 1),
);

let synthesisActive = 0;
const synthesisWaiters: Array<() => void> = [];
let manifestChain: Promise<void> = Promise.resolve();
const styleAnchorJobs = new Map<
  string,
  Promise<{ promptText: string; promptWavPath: string }>
>();
let publishTimer: ReturnType<typeof setTimeout> | null = null;
let publishChain: Promise<void> = Promise.resolve();
let pendingPublishScriptId: string | null = null;

function roundSeconds(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function cacheFolderForEngine(engine: VoiceEngineId, scriptLanguage: ScriptLanguageId): string {
  const base = engine === 'indextts' ? 'indextts-script' : 'voxcpm-script';
  return `${base}-${scriptLanguage}`;
}

function cacheRoot(
  scriptId: string,
  engine: VoiceEngineId,
  scriptLanguage: ScriptLanguageId,
): string {
  return path.join(scriptDirFor(scriptId), '.cache', cacheFolderForEngine(engine, scriptLanguage));
}

function manifestPath(
  scriptId: string,
  engine: VoiceEngineId,
  scriptLanguage: ScriptLanguageId,
): string {
  return path.join(cacheRoot(scriptId, engine, scriptLanguage), 'manifest.json');
}

function sentenceAudioDir(
  scriptId: string,
  engine: VoiceEngineId,
  scriptLanguage: ScriptLanguageId,
): string {
  return path.join(cacheRoot(scriptId, engine, scriptLanguage), 'sentences');
}

function beatAudioDir(
  scriptId: string,
  engine: VoiceEngineId,
  scriptLanguage: ScriptLanguageId,
): string {
  return path.join(cacheRoot(scriptId, engine, scriptLanguage), 'beats');
}

function previewVoiceRel(beatIndex: number, engine: VoiceEngineId): string {
  return `export/voice/${engine}/beat-${String(beatIndex + 1).padStart(2, '0')}.wav`;
}

function legacyPreviewVoiceRel(beatIndex: number): string {
  return `export/voice/beat-${String(beatIndex + 1).padStart(2, '0')}.wav`;
}

function previewVoiceDir(scriptId: string): string {
  return path.join(scriptDirFor(scriptId), 'export', 'voice');
}

function previewRevisionStampPath(scriptId: string): string {
  return path.join(previewVoiceDir(scriptId), '.revision');
}

function previewVoiceEnginePath(scriptId: string): string {
  return path.join(scriptDirFor(scriptId), '.cache', 'preview-voice-engine.json');
}

type VoicePreviewByEngine = {
  beatVoiceSrc: string[];
  beatDurationsSeconds: number[];
};

function readActivePreviewEngine(scriptId: string): VoiceEngineId {
  const storedPath = previewVoiceEnginePath(scriptId);
  if (fileExists(storedPath)) {
    try {
      const stored = readJson<{ engine?: unknown }>(storedPath);
      return parseVoiceEngine(stored.engine);
    } catch {
      // fall through
    }
  }
  const v4Path = path.join(scriptDirFor(scriptId), '.cache', 'animation-v4.json');
  if (fileExists(v4Path)) {
    try {
      const animation = readJson<AnimationV4Doc>(v4Path);
      const active = animation.scenes?.[0]?.voiceEdit?.activePreviewEngine;
      if (active) {
        return parseVoiceEngine(active);
      }
    } catch {
      // fall through
    }
  }
  return defaultVoiceEngine();
}

function writeActivePreviewEngine(scriptId: string, engine: VoiceEngineId): void {
  ensureDir(path.join(scriptDirFor(scriptId), '.cache'));
  writeJsonAtomic(previewVoiceEnginePath(scriptId), { engine });
}

function previewEngineHasVoice(scriptId: string, engine: VoiceEngineId): boolean {
  const scriptDir = scriptDirFor(scriptId);
  const v4Path = path.join(scriptDir, '.cache', 'animation-v4.json');
  if (fileExists(v4Path)) {
    try {
      const animation = readJson<AnimationV4Doc>(v4Path);
      const preview = animation.scenes?.[0]?.voiceEdit?.previewByEngine?.[engine];
      if (preview?.beatVoiceSrc?.some((rel) => rel && fileExists(path.join(scriptDir, rel)))) {
        return true;
      }
    } catch {
      // fall through
    }
  }
  if (engine === 'voxcpm') {
    for (let beatIndex = 0; beatIndex < 32; beatIndex += 1) {
      if (fileExists(path.join(scriptDir, legacyPreviewVoiceRel(beatIndex)))) {
        return true;
      }
    }
  }
  return false;
}

function readPreviewEnginesReady(scriptId: string): Record<VoiceEngineId, boolean> {
  return {
    voxcpm: previewEngineHasVoice(scriptId, 'voxcpm'),
    indextts: previewEngineHasVoice(scriptId, 'indextts'),
  };
}

function readPreviewRevisionStamp(scriptId: string): string {
  const stampPath = previewRevisionStampPath(scriptId);
  if (!fileExists(stampPath)) {
    return '';
  }
  try {
    return Deno.readTextFileSync(stampPath).trim();
  } catch {
    return '';
  }
}

function styleAnchorDir(): string {
  return path.join(VIDEO_OPS_ROOT, '.cache', 'voxcpm-style-prompts');
}

function emptyManifest(): VoxcpmEditorManifest {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    sentences: {},
    beats: {},
  };
}

function loadManifest(
  scriptId: string,
  engine: VoiceEngineId,
  scriptLanguage: ScriptLanguageId,
): VoxcpmEditorManifest {
  const filePath = manifestPath(scriptId, engine, scriptLanguage);
  if (!fileExists(filePath)) {
    return emptyManifest();
  }
  try {
    const parsed = readJson<VoxcpmEditorManifest>(filePath);
    if (parsed.schemaVersion === 1 && parsed.sentences && parsed.beats) {
      return parsed;
    }
  } catch {
    // Regenerate derived cache metadata.
  }
  return emptyManifest();
}

function saveManifest(
  scriptId: string,
  engine: VoiceEngineId,
  scriptLanguage: ScriptLanguageId,
  manifest: VoxcpmEditorManifest,
): void {
  writeJsonAtomic(manifestPath(scriptId, engine, scriptLanguage), {
    ...manifest,
    updatedAt: new Date().toISOString(),
  });
}

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function referenceKey(referenceAudioPath: string): Promise<string> {
  const stat = await Deno.stat(referenceAudioPath);
  return digest(
    `${path.resolve(referenceAudioPath)}\n${stat.size}\n${stat.mtime?.getTime() ?? 0}`,
  );
}

function presetFor(tone: VoxcpmToneId) {
  return VOXCPM_TONE_PRESETS.find((preset) => preset.id === tone) ??
    VOXCPM_TONE_PRESETS[0];
}

async function sentenceCacheKey(
  sentence: VoxcpmScriptSentence,
  resolvedReferenceKey: string,
  engine: VoiceEngineId,
): Promise<string> {
  if (engine === 'indextts') {
    return digest([resolvedReferenceKey, sentence.text.trim()].join('\n'));
  }
  const preset = presetFor(sentence.tone);
  return digest(
    [
      STYLE_ANCHOR_VERSION,
      resolvedReferenceKey,
      sentence.tone,
      preset.promptText,
      sentence.text.trim(),
    ].join('\n'),
  );
}

function safeSentenceId(sentenceId: string): string {
  return sentenceId.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 100);
}

function activeKey(
  scriptId: string,
  sentenceId: string,
  engine: VoiceEngineId,
  scriptLanguage: ScriptLanguageId,
): string {
  return `${engine}:${scriptLanguage}:${scriptId}:${sentenceId}`;
}

function editorAudioUrl(
  scriptId: string,
  kind: 'sentences' | 'beats',
  fileName: string,
  revision: string,
  engine: VoiceEngineId,
): string {
  return `/api/scripts/${encodeURIComponent(scriptId)}/voxcpm-editor/audio/${kind}/${encodeURIComponent(
    fileName,
  )}?engine=${engine}&v=${encodeURIComponent(revision)}`;
}

function temporaryWavPath(finalPath: string): string {
  return path.join(
    path.dirname(finalPath),
    `.${path.basename(finalPath, '.wav')}.${crypto.randomUUID()}.tmp.wav`,
  );
}

function queueSynthesis<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const start = () => {
      synthesisActive += 1;
      void task()
        .then(resolve, reject)
        .finally(() => {
          synthesisActive -= 1;
          const next = synthesisWaiters.shift();
          if (next) {
            next();
          }
        });
    };
    if (synthesisActive < SYNTHESIS_CONCURRENCY) {
      start();
      return;
    }
    synthesisWaiters.push(start);
  });
}

function withManifestLock<T>(task: () => T | Promise<T>): Promise<T> {
  const run = manifestChain.then(task, task);
  manifestChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

let pendingPublishVoiceEngine: VoiceEngineId = 'voxcpm';
let pendingPublishScriptLanguage: ScriptLanguageId = 'en';

function schedulePublishPreviewVoice(
  scriptId: string,
  voiceEngine: VoiceEngineId,
  scriptLanguage: ScriptLanguageId = 'en',
  options: { immediate?: boolean } = {},
): void {
  pendingPublishScriptId = scriptId;
  pendingPublishVoiceEngine = voiceEngine;
  pendingPublishScriptLanguage = scriptLanguage;
  if (publishTimer) {
    clearTimeout(publishTimer);
  }
  const delayMs = options.immediate ? 0 : 700;
  publishTimer = setTimeout(() => {
    const target = pendingPublishScriptId;
    pendingPublishScriptId = null;
    publishTimer = null;
    if (!target) {
      return;
    }
    publishChain = publishChain
      .then(() =>
        publishVoxcpmPreviewVoice(
          target,
          pendingPublishVoiceEngine,
          pendingPublishScriptLanguage,
        )
      )
      .then(() => undefined)
      .catch((publishError) => {
        console.warn(
          `[voxcpm-editor] preview publish failed for ${target}:`,
          publishError instanceof Error ? publishError.message : String(publishError),
        );
      });
  }, delayMs);
}

function copyBeatPreviewWav(
  scriptId: string,
  beatIndex: number,
  sourcePath: string,
  engine: VoiceEngineId,
): string | null {
  if (!fileExists(sourcePath)) {
    return null;
  }
  const scriptDir = scriptDirFor(scriptId);
  const destRel = previewVoiceRel(beatIndex, engine);
  ensureDir(path.join(scriptDir, 'export', 'voice', engine));
  Deno.copyFileSync(sourcePath, path.join(scriptDir, destRel));
  return destRel;
}

async function ensureStyleAnchor(
  referenceAudioPath: string,
  resolvedReferenceKey: string,
  tone: VoxcpmToneId,
): Promise<{ promptText: string; promptWavPath: string }> {
  const preset = presetFor(tone);
  const anchorKey = await digest(
    `${STYLE_ANCHOR_VERSION}\n${resolvedReferenceKey}\n${tone}\n${preset.promptText}`,
  );
  const jobKey = `${resolvedReferenceKey}:${tone}:${anchorKey.slice(0, 16)}`;
  const inflight = styleAnchorJobs.get(jobKey);
  if (inflight) {
    return inflight;
  }
  const job = (async () => {
    const directory = styleAnchorDir();
    ensureDir(directory);
    const promptWavPath = path.join(directory, `${tone}-${anchorKey.slice(0, 16)}.wav`);
    if (!fileExists(promptWavPath)) {
      const temporaryPath = temporaryWavPath(promptWavPath);
      await cloneVoxcpmAudio({
        text: preset.promptText,
        referenceAudioPath,
        outputPath: temporaryPath,
        inferenceTimesteps: VOXCPM_INFERENCE_TIMESTEPS,
        cfgValue: VOXCPM_CFG_VALUE,
      });
      Deno.renameSync(temporaryPath, promptWavPath);
    }
    return { promptText: preset.promptText, promptWavPath };
  })();
  styleAnchorJobs.set(jobKey, job);
  try {
    return await job;
  } finally {
    // Keep resolved promise so concurrent callers reuse the same file path.
  }
}

async function renderSentenceCore(params: {
  scriptId: string;
  sentence: VoxcpmScriptSentence;
  referenceAudioPath: string;
  referenceTakeId?: string;
  force?: boolean;
  voiceEngine: VoiceEngineId;
  scriptLanguage: ScriptLanguageId;
}): Promise<CachedSentence> {
  const engine = params.voiceEngine;
  const scriptLanguage = params.scriptLanguage;
  if (engine === 'indextts') {
    await ensureIndexTtsServer();
  } else {
    await ensureVoxcpmServer();
  }
  const resolvedReferenceKey = await referenceKey(params.referenceAudioPath);
  const cacheKey = await sentenceCacheKey(params.sentence, resolvedReferenceKey, engine);
  const manifest = loadManifest(params.scriptId, engine, scriptLanguage);
  const existing = manifest.sentences[params.sentence.id];
  const existingPath = existing
    ? path.join(sentenceAudioDir(params.scriptId, engine, scriptLanguage), existing.audioFile)
    : '';
  if (!params.force && existing?.cacheKey === cacheKey && fileExists(existingPath)) {
    return existing;
  }

  const directory = sentenceAudioDir(params.scriptId, engine, scriptLanguage);
  ensureDir(directory);
  const audioFile = `${safeSentenceId(params.sentence.id)}-${cacheKey.slice(0, 16)}.wav`;
  const outputPath = path.join(directory, audioFile);
  const temporaryPath = temporaryWavPath(outputPath);
  if (engine === 'indextts') {
    await cloneIndexTtsAudio({
      text: params.sentence.text.trim(),
      referenceAudioPath: params.referenceAudioPath,
      outputPath: temporaryPath,
    });
  } else {
    const styleAnchor = await ensureStyleAnchor(
      params.referenceAudioPath,
      resolvedReferenceKey,
      params.sentence.tone,
    );
    await cloneVoxcpmAudio({
      text: params.sentence.text.trim(),
      referenceAudioPath: params.referenceAudioPath,
      outputPath: temporaryPath,
      promptText: styleAnchor.promptText,
      promptWavPath: styleAnchor.promptWavPath,
      inferenceTimesteps: VOXCPM_INFERENCE_TIMESTEPS,
      cfgValue: VOXCPM_CFG_VALUE,
    });
  }
  Deno.renameSync(temporaryPath, outputPath);
  const cached: CachedSentence = {
    sentenceId: params.sentence.id,
    cacheKey,
    tone: params.sentence.tone,
    fingerprint: voxcpmSentenceFingerprint(params.sentence.text),
    referenceKey: resolvedReferenceKey,
    audioFile,
    durationSeconds: await probeAudioDurationSeconds(outputPath),
    updatedAt: new Date().toISOString(),
  };
  await withManifestLock(() => {
    const latestManifest = loadManifest(params.scriptId, engine, scriptLanguage);
    latestManifest.sentences[params.sentence.id] = cached;
    latestManifest.lastReferenceTakeId =
      params.referenceTakeId ?? latestManifest.lastReferenceTakeId;
    latestManifest.lastReferenceAudioPath = params.referenceAudioPath;
    saveManifest(params.scriptId, engine, scriptLanguage, latestManifest);
  });
  return cached;
}

async function silencePath(
  scriptId: string,
  durationMs: number,
  engine: VoiceEngineId,
  scriptLanguage: ScriptLanguageId,
): Promise<string> {
  const roundedMs = Math.max(0, Math.round(durationMs));
  const directory = path.join(cacheRoot(scriptId, engine, scriptLanguage), 'silence');
  ensureDir(directory);
  const outputPath = path.join(directory, `silence-${roundedMs}ms.wav`);
  if (!fileExists(outputPath)) {
    await runCommand('ffmpeg', [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'anullsrc=r=48000:cl=mono',
      '-t',
      (roundedMs / 1000).toFixed(3),
      outputPath,
    ]);
  }
  return outputPath;
}

function concatListLine(filePath: string): string {
  return `file '${filePath.replace(/'/g, "'\\''")}'`;
}

/** Pending-sentence placeholder timing until VoxCPM audio lands. */
function estimateSentenceSpeechSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 0) {
    return 0.8;
  }
  return Math.max(0.7, Math.round((words / 2.6) * 100) / 100);
}

type BeatAudioClip = {
  sentence: VoxcpmScriptSentence;
  audioPath: string;
  durationSeconds: number;
  ready: boolean;
  cacheKey: string;
};

async function planBeatAudioClips(params: {
  scriptId: string;
  sentences: VoxcpmScriptSentence[];
  resolvedReferenceKey: string;
  allowPartial: boolean;
  voiceEngine: VoiceEngineId;
  scriptLanguage: ScriptLanguageId;
}): Promise<BeatAudioClip[] | null> {
  const manifest = loadManifest(params.scriptId, params.voiceEngine, params.scriptLanguage);
  const clips: BeatAudioClip[] = [];
  for (const sentence of params.sentences) {
    const expected = await sentenceCacheKey(
      sentence,
      params.resolvedReferenceKey,
      params.voiceEngine,
    );
    const entry = manifest.sentences[sentence.id];
    const audioPath = entry
      ? path.join(
          sentenceAudioDir(params.scriptId, params.voiceEngine, params.scriptLanguage),
          entry.audioFile,
        )
      : '';
    const ready = Boolean(
      entry && entry.cacheKey === expected && audioPath && fileExists(audioPath),
    );
    if (ready && entry) {
      clips.push({
        sentence,
        audioPath,
        durationSeconds: entry.durationSeconds,
        ready: true,
        cacheKey: expected,
      });
      continue;
    }
    if (!params.allowPartial) {
      return null;
    }
    const durationSeconds = estimateSentenceSpeechSeconds(sentence.text);
    clips.push({
      sentence,
      audioPath: await silencePath(
        params.scriptId,
        Math.round(durationSeconds * 1000),
        params.voiceEngine,
        params.scriptLanguage,
      ),
      durationSeconds,
      ready: false,
      cacheKey: `pending:${expected.slice(0, 16)}:${durationSeconds}`,
    });
  }
  return clips;
}

function beatDurationFromClips(clips: BeatAudioClip[]): number {
  let total = 0;
  for (let index = 0; index < clips.length; index += 1) {
    total += clips[index].durationSeconds;
    if (index < clips.length - 1 && clips[index].sentence.pauseAfterMs > 0) {
      total += clips[index].sentence.pauseAfterMs / 1000;
    }
  }
  return roundSeconds(Math.max(0.5, total));
}

async function concatenateBeatClips(params: {
  scriptId: string;
  clips: BeatAudioClip[];
  outputPath: string;
  voiceEngine: VoiceEngineId;
  scriptLanguage: ScriptLanguageId;
}): Promise<{
  durationSeconds: number;
  captions: VoxcpmRelativeCaptionSegment[];
}> {
  ensureDir(path.dirname(params.outputPath));
  const listPath = path.join(
    path.dirname(params.outputPath),
    `.voxcpm-concat-${crypto.randomUUID()}.txt`,
  );
  const paths: string[] = [];
  const captions: VoxcpmRelativeCaptionSegment[] = [];
  let cursor = 0;

  for (let index = 0; index < params.clips.length; index += 1) {
    const clip = params.clips[index];
    paths.push(clip.audioPath);
    captions.push({
      id: clip.sentence.id,
      text: clip.sentence.text,
      atSeconds: roundSeconds(cursor),
      durationSeconds: clip.durationSeconds,
    });
    cursor += clip.durationSeconds;
    if (index < params.clips.length - 1 && clip.sentence.pauseAfterMs > 0) {
      paths.push(
        await silencePath(
          params.scriptId,
          clip.sentence.pauseAfterMs,
          params.voiceEngine,
          params.scriptLanguage,
        ),
      );
      cursor += clip.sentence.pauseAfterMs / 1000;
    }
  }

  await Deno.writeTextFile(listPath, paths.map(concatListLine).join('\n'));
  const temporaryPath = temporaryWavPath(params.outputPath);
  try {
    await runCommand('ffmpeg', [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      listPath,
      '-ar',
      '48000',
      '-ac',
      '1',
      temporaryPath,
    ]);
    Deno.renameSync(temporaryPath, params.outputPath);
  } finally {
    try {
      Deno.removeSync(listPath);
    } catch {
      // Best-effort cleanup.
    }
  }

  return {
    durationSeconds: await probeAudioDurationSeconds(params.outputPath),
    captions,
  };
}

async function expectedBeatRevision(
  clips: BeatAudioClip[],
): Promise<string> {
  return digest(
    clips
      .map(
        (clip) =>
          `${clip.cacheKey}:${clip.sentence.pauseAfterMs}:${clip.ready ? 'ready' : 'pending'}`,
      )
      .join('\n'),
  );
}

async function buildBeatAudioFromCache(params: {
  scriptId: string;
  beatIndex: number;
  sentences: VoxcpmScriptSentence[];
  referenceAudioPath: string;
  voiceEngine: VoiceEngineId;
  scriptLanguage: ScriptLanguageId;
  /** When true, pending sentences become timed silence so Remotion can preview early. */
  allowPartial?: boolean;
}): Promise<{
  path: string | null;
  durationSeconds: number;
  captions: VoxcpmRelativeCaptionSegment[];
  anyReady: boolean;
  allReady: boolean;
  readyCount: number;
} | null> {
  const allowPartial = params.allowPartial === true;
  const engine = params.voiceEngine;
  const scriptLanguage = params.scriptLanguage;
  const resolvedReferenceKey = await referenceKey(params.referenceAudioPath);
  const clips = await planBeatAudioClips({
    scriptId: params.scriptId,
    sentences: params.sentences,
    resolvedReferenceKey,
    allowPartial,
    voiceEngine: engine,
    scriptLanguage,
  });
  if (!clips) {
    return null;
  }
  const readyCount = clips.filter((clip) => clip.ready).length;
  const anyReady = readyCount > 0;
  const allReady = readyCount === clips.length;
  const plannedDuration = beatDurationFromClips(clips);

  if (!anyReady) {
    await withManifestLock(() => {
      const latestManifest = loadManifest(params.scriptId, engine, scriptLanguage);
      latestManifest.beats[String(params.beatIndex)] = {
        beatIndex: params.beatIndex,
        revisionKey: `pending-only:${plannedDuration}`,
        referenceKey: resolvedReferenceKey,
        audioFile: '',
        durationSeconds: plannedDuration,
        updatedAt: new Date().toISOString(),
      };
      saveManifest(params.scriptId, engine, scriptLanguage, latestManifest);
    });
    return {
      path: null,
      durationSeconds: plannedDuration,
      captions: [],
      anyReady: false,
      allReady: false,
      readyCount: 0,
    };
  }

  const revisionKey = await expectedBeatRevision(clips);
  const directory = beatAudioDir(params.scriptId, engine, scriptLanguage);
  ensureDir(directory);
  const audioFile = `beat-${String(params.beatIndex + 1).padStart(2, '0')}-${revisionKey.slice(
    0,
    16,
  )}.wav`;
  const outputPath = path.join(directory, audioFile);
  const result = await concatenateBeatClips({
    scriptId: params.scriptId,
    clips,
    outputPath,
    voiceEngine: engine,
    scriptLanguage,
  });
  await withManifestLock(() => {
    const latestManifest = loadManifest(params.scriptId, engine, scriptLanguage);
    latestManifest.beats[String(params.beatIndex)] = {
      beatIndex: params.beatIndex,
      revisionKey,
      referenceKey: resolvedReferenceKey,
      audioFile,
      durationSeconds: result.durationSeconds,
      updatedAt: new Date().toISOString(),
    };
    saveManifest(params.scriptId, engine, scriptLanguage, latestManifest);
  });
  return {
    path: outputPath,
    ...result,
    anyReady,
    allReady,
    readyCount,
  };
}

async function editorSentencesForBeat(
  scriptId: string,
  beatIndex: number,
  say: string,
): Promise<VoxcpmScriptSentence[]> {
  const markdown = readAnimationMd(scriptId).markdown;
  const sections = splitAnimationBeatSections(markdown).sections;
  const voice = parseBeatVariantsBlock(sections[beatIndex] ?? '')?.voice;
  return reconcileVoxcpmSentences(say, beatIndex, voice);
}

type AnimationV4SceneVoice = {
  voiceEdit?: {
    beatVoiceSrc?: string[];
    beatDurationsSeconds?: number[];
    burnCaptionsZh?: boolean;
    activePreviewEngine?: VoiceEngineId;
    previewByEngine?: Partial<Record<VoiceEngineId, VoicePreviewByEngine>>;
  };
  compare?: {
    beats?: Array<{ durationSeconds?: number }>;
  };
  durationSeconds?: number;
};

type AnimationV4Doc = {
  scenes?: AnimationV4SceneVoice[];
};

function resolvePreviewByEngine(
  scriptId: string,
  scene: AnimationV4SceneVoice,
  engine: VoiceEngineId,
): VoicePreviewByEngine | null {
  const stored = scene.voiceEdit?.previewByEngine?.[engine];
  if (stored?.beatVoiceSrc?.some((rel) => rel && fileExists(path.join(scriptDirFor(scriptId), rel)))) {
    return {
      beatVoiceSrc: stored.beatVoiceSrc,
      beatDurationsSeconds: stored.beatDurationsSeconds ?? [],
    };
  }
  if (engine !== 'voxcpm') {
    return null;
  }
  const scriptDir = scriptDirFor(scriptId);
  const beatVoiceSrc: string[] = [];
  const beatDurationsSeconds: number[] = [];
  for (let beatIndex = 0; beatIndex < 64; beatIndex += 1) {
    const legacyRel = legacyPreviewVoiceRel(beatIndex);
    if (!fileExists(path.join(scriptDir, legacyRel))) {
      break;
    }
    beatVoiceSrc[beatIndex] = legacyRel;
    beatDurationsSeconds[beatIndex] = 0;
  }
  return beatVoiceSrc.length > 0
    ? { beatVoiceSrc, beatDurationsSeconds }
    : null;
}

function applyPreviewEngineToScene(
  scene: AnimationV4SceneVoice,
  preview: VoicePreviewByEngine,
  engine: VoiceEngineId,
): AnimationV4SceneVoice {
  const beatDurationsSeconds = preview.beatDurationsSeconds;
  const nextBeats = (scene.compare?.beats ?? []).map((beat, index) => {
    const duration = beatDurationsSeconds[index];
    if (!(duration > 0)) {
      return beat;
    }
    return {
      ...beat,
      durationSeconds: duration,
    };
  });
  const sceneDuration = nextBeats.reduce(
    (sum, beat) => sum + (beat.durationSeconds ?? 0),
    0,
  );
  return {
    ...scene,
    voiceEdit: {
      ...scene.voiceEdit,
      burnCaptionsZh: scene.voiceEdit?.burnCaptionsZh ?? true,
      activePreviewEngine: engine,
      previewByEngine: scene.voiceEdit?.previewByEngine,
      beatVoiceSrc: preview.beatVoiceSrc,
      beatDurationsSeconds: preview.beatDurationsSeconds,
    },
    compare: scene.compare ? { ...scene.compare, beats: nextBeats } : scene.compare,
    durationSeconds: sceneDuration > 0 ? Math.round(sceneDuration) : scene.durationSeconds,
  };
}

function writePreviewRevisionStamp(
  scriptId: string,
  engine: VoiceEngineId,
  beatDurationsSeconds: number[],
  beatVoiceSrc: string[],
): void {
  ensureDir(previewVoiceDir(scriptId));
  Deno.writeTextFileSync(
    previewRevisionStampPath(scriptId),
    `${engine}\n${new Date().toISOString()}\n${beatDurationsSeconds.join(',')}\n${beatVoiceSrc.join('|')}\n`,
  );
}

async function persistAnimationVoiceEdit(
  scriptId: string,
  scene: AnimationV4SceneVoice,
): Promise<void> {
  const scriptDir = scriptDirFor(scriptId);
  const v4Path = path.join(scriptDir, '.cache', 'animation-v4.json');
  const animation = readJson<AnimationV4Doc>(v4Path);
  animation.scenes = [scene, ...(animation.scenes?.slice(1) ?? [])];
  writeJsonAtomic(v4Path, animation);

  const animationJsonPath = path.join(scriptDir, 'animation.json');
  if (fileExists(animationJsonPath)) {
    try {
      const animationJson = readJson<AnimationV4Doc>(animationJsonPath);
      const jsonScene = animationJson.scenes?.[0];
      if (jsonScene) {
        jsonScene.voiceEdit = scene.voiceEdit;
        if (jsonScene.compare && scene.compare) {
          jsonScene.compare = scene.compare;
        }
        if (scene.durationSeconds) {
          jsonScene.durationSeconds = scene.durationSeconds;
        }
        writeJsonAtomic(animationJsonPath, animationJson);
      }
    } catch {
      // Preview path only needs .cache/animation-v4.json + sync.
    }
  }
}

/** Switch Remotion preview to a published engine without re-synthesizing. */
export async function setPreviewVoiceEngine(
  scriptId: string,
  voiceEngine: VoiceEngineId,
): Promise<{ previewVoiceEngine: VoiceEngineId; previewRevision: string }> {
  const engine = parseVoiceEngine(voiceEngine);
  if (!previewEngineHasVoice(scriptId, engine)) {
    throw new Error(`No ${engine} preview voice published yet — render sentences first`);
  }
  const scriptDir = scriptDirFor(scriptId);
  const v4Path = path.join(scriptDir, '.cache', 'animation-v4.json');
  if (!fileExists(v4Path)) {
    await compileAnimationSource(scriptId);
  }
  if (!fileExists(v4Path)) {
    throw new Error(`Missing animation cache for ${scriptId}`);
  }
  const animation = readJson<AnimationV4Doc>(v4Path);
  const scene = animation.scenes?.[0];
  if (!scene) {
    throw new Error(`Missing scene for ${scriptId}`);
  }
  const preview = resolvePreviewByEngine(scriptId, scene, engine);
  if (!preview) {
    throw new Error(`No ${engine} preview voice published yet — render sentences first`);
  }
  const nextScene = applyPreviewEngineToScene(scene, preview, engine);
  await persistAnimationVoiceEdit(scriptId, nextScene);
  writeActivePreviewEngine(scriptId, engine);
  writePreviewRevisionStamp(
    scriptId,
    engine,
    preview.beatDurationsSeconds,
    preview.beatVoiceSrc,
  );
  // Remotion Studio live-compiles from animation-v4.json mtime — no npm sync.
  return {
    previewVoiceEngine: engine,
    previewRevision: readPreviewRevisionStamp(scriptId),
  };
}

/**
 * Assemble partial/full beat WAVs (ready clips + estimated silence for pending),
 * write stable export/voice paths, and wire Remotion voiceEdit durations so the
 * Studio preview beside the beat editor tracks each finished/pending sentence.
 */
export async function publishVoxcpmPreviewVoice(
  scriptId: string,
  voiceEngine: VoiceEngineId = 'voxcpm',
  scriptLanguage: ScriptLanguageId = 'en',
): Promise<boolean> {
  const live = await buildLiveScript(scriptId);
  if (!live?.beats.length) {
    return false;
  }
  const scriptDir = scriptDirFor(scriptId);
  const manifest = loadManifest(scriptId, voiceEngine, scriptLanguage);
  let referenceAudioPath: string | null = null;
  if (manifest.lastReferenceAudioPath && fileExists(manifest.lastReferenceAudioPath)) {
    referenceAudioPath = manifest.lastReferenceAudioPath;
  }

  const beatCount = live.beats.length;
  const beatVoiceSrc = Array.from({ length: beatCount }, () => '');
  const beatDurationsSeconds = Array.from({ length: beatCount }, () => 0);
  ensureDir(previewVoiceDir(scriptId));

  for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
    try {
      const beatSpoken = spokenTextForBeat(live.beats[beatIndex], scriptLanguage);
      const sentences = await editorSentencesForBeat(
        scriptId,
        beatIndex,
        beatSpoken,
      );
      let durationSeconds = estimateSentenceSpeechSeconds(beatSpoken);
      if (referenceAudioPath) {
        const built = await buildBeatAudioFromCache({
          scriptId,
          beatIndex,
          sentences,
          referenceAudioPath,
          voiceEngine,
          scriptLanguage,
          allowPartial: true,
        });
        if (built) {
          durationSeconds = built.durationSeconds;
          if (built.path) {
            const destRel = copyBeatPreviewWav(scriptId, beatIndex, built.path, voiceEngine);
            if (destRel) {
              beatVoiceSrc[beatIndex] = destRel;
            }
          }
        }
        // Fallback: beat may already be assembled in cache even if this rebuild
        // returned no path (race / pending reconciliation).
        if (!beatVoiceSrc[beatIndex]) {
          const cached = loadManifest(scriptId, voiceEngine, scriptLanguage).beats[
            String(beatIndex)
          ];
          if (cached?.audioFile) {
            const cachedPath = path.join(
              beatAudioDir(scriptId, voiceEngine, scriptLanguage),
              cached.audioFile,
            );
            const destRel = copyBeatPreviewWav(scriptId, beatIndex, cachedPath, voiceEngine);
            if (destRel) {
              beatVoiceSrc[beatIndex] = destRel;
              if (cached.durationSeconds > 0) {
                durationSeconds = cached.durationSeconds;
              }
            }
          }
        }
      } else {
        const clips = sentences.map((sentence) => ({
          durationSeconds: estimateSentenceSpeechSeconds(sentence.text),
          pauseAfterMs: sentence.pauseAfterMs,
        }));
        durationSeconds = roundSeconds(
          Math.max(
            0.5,
            clips.reduce((sum, clip, index) => {
              const pause =
                index < clips.length - 1 ? clip.pauseAfterMs / 1000 : 0;
              return sum + clip.durationSeconds + pause;
            }, 0),
          ),
        );
      }
      beatDurationsSeconds[beatIndex] = Math.max(
        0.5,
        Math.round(durationSeconds * 10) / 10,
      );
    } catch (beatError) {
      console.warn(
        `[voxcpm-editor] preview beat ${beatIndex + 1} failed for ${scriptId}:`,
        beatError instanceof Error ? beatError.message : String(beatError),
      );
      beatDurationsSeconds[beatIndex] = Math.max(
        0.5,
        beatDurationsSeconds[beatIndex] ||
          estimateSentenceSpeechSeconds(
            spokenTextForBeat(live.beats[beatIndex] ?? { say: '', chinese: '' }, scriptLanguage),
          ),
      );
    }
  }

  const v4Path = path.join(scriptDir, '.cache', 'animation-v4.json');
  if (!fileExists(v4Path)) {
    await compileAnimationSource(scriptId);
  }
  if (!fileExists(v4Path)) {
    return false;
  }

  const animation = readJson<AnimationV4Doc>(v4Path);
  const scene = animation.scenes?.[0];
  if (!scene) {
    return false;
  }
  const previewByEngine: Partial<Record<VoiceEngineId, VoicePreviewByEngine>> = {
    ...scene.voiceEdit?.previewByEngine,
    [voiceEngine]: { beatVoiceSrc, beatDurationsSeconds },
  };
  scene.voiceEdit = {
    ...scene.voiceEdit,
    burnCaptionsZh: scene.voiceEdit?.burnCaptionsZh ?? true,
    previewByEngine,
  };
  const activeEngine = readActivePreviewEngine(scriptId);
  const previewForActive = previewByEngine[activeEngine] ?? previewByEngine[voiceEngine];
  const engineToApply = previewByEngine[activeEngine] ? activeEngine : voiceEngine;
  if (previewForActive) {
    const nextScene = applyPreviewEngineToScene(scene, previewForActive, engineToApply);
    animation.scenes = [nextScene, ...(animation.scenes?.slice(1) ?? [])];
    writeActivePreviewEngine(scriptId, engineToApply);
    writePreviewRevisionStamp(
      scriptId,
      engineToApply,
      previewForActive.beatDurationsSeconds,
      previewForActive.beatVoiceSrc,
    );
  }
  writeJsonAtomic(v4Path, animation);

  const updatedScene = animation.scenes?.[0];
  if (updatedScene) {
    const animationJsonPath = path.join(scriptDir, 'animation.json');
    if (fileExists(animationJsonPath)) {
      try {
        const animationJson = readJson<AnimationV4Doc>(animationJsonPath);
        const jsonScene = animationJson.scenes?.[0];
        if (jsonScene) {
          jsonScene.voiceEdit = updatedScene.voiceEdit;
          if (jsonScene.compare && updatedScene.compare) {
            jsonScene.compare = updatedScene.compare;
          }
          if (updatedScene.durationSeconds) {
            jsonScene.durationSeconds = updatedScene.durationSeconds;
          }
          writeJsonAtomic(animationJsonPath, animationJson);
        }
      } catch {
        // Preview path only needs .cache/animation-v4.json + sync.
      }
    }
  }

  // Remotion Studio polls /video_ops/api/render-props and picks up animation-v4.json
  // changes via mtime — avoid npm sync here (rebuilds webpack + remounts outdoor iframe).
  return true;
}

export async function readVoxcpmEditorDocument(
  scriptId: string,
  referenceOptions: VoiceEditorOptions = {},
): Promise<VoxcpmEditorDocument> {
  const voiceEngine = resolveVoiceEngine(referenceOptions);
  const scriptLanguage = resolveScriptLanguage(referenceOptions);
  const live = await buildLiveScript(scriptId);
  if (!live) {
    throw new Error(`Script not found: ${scriptId}`);
  }
  const animationMd = readAnimationMd(scriptId);
  const sections = splitAnimationBeatSections(animationMd.markdown).sections;
  const manifest = loadManifest(scriptId, voiceEngine, scriptLanguage);
  let referenceAudioPath: string | null = null;
  let resolvedReferenceKey: string | null = null;
  try {
    referenceAudioPath =
      referenceOptions.referenceTakeId || referenceOptions.referenceAudioPath
        ? await resolveVoxcpmReferenceClip(scriptId, referenceOptions)
        : manifest.lastReferenceAudioPath ?? null;
    if (referenceAudioPath && fileExists(referenceAudioPath)) {
      resolvedReferenceKey = await referenceKey(referenceAudioPath);
    }
  } catch {
    referenceAudioPath = null;
  }

  const beats: VoxcpmEditorBeat[] = [];
  for (let beatIndex = 0; beatIndex < live.beats.length; beatIndex += 1) {
    const beat = live.beats[beatIndex];
    const voice = parseBeatVariantsBlock(sections[beatIndex] ?? '')?.voice;
    const spokenText = spokenTextForBeat(beat, scriptLanguage);
    const sentences = reconcileVoxcpmSentences(spokenText, beatIndex, voice);
    const editorSentences: VoxcpmEditorSentence[] = [];
    for (const sentence of sentences) {
      const active = activeRenders.get(
        activeKey(scriptId, sentence.id, voiceEngine, scriptLanguage),
      );
      const cached = manifest.sentences[sentence.id];
      const expected =
        resolvedReferenceKey && cached
          ? await sentenceCacheKey(sentence, resolvedReferenceKey, voiceEngine)
          : null;
      const ready = Boolean(
        cached &&
          expected === cached.cacheKey &&
          fileExists(
            path.join(
              sentenceAudioDir(scriptId, voiceEngine, scriptLanguage),
              cached.audioFile,
            ),
          ),
      );
      const status: VoxcpmEditorSentenceStatus =
        active?.status ?? (ready ? 'ready' : 'idle');
      editorSentences.push({
        ...sentence,
        status,
        hasLatestAudio: ready && !active,
        progressPercent: progressForStatus(status, active),
        audioUrl:
          ready && cached
            ? editorAudioUrl(
                scriptId,
                'sentences',
                cached.audioFile,
                cached.updatedAt,
                voiceEngine,
              )
            : null,
        durationSeconds: ready && cached ? cached.durationSeconds : null,
        error: active?.error ?? null,
      });
    }

    const readySentenceCount = editorSentences.filter(
      (sentence) => sentence.hasLatestAudio,
    ).length;
    let beatDurationSeconds: number | null = null;
    if (resolvedReferenceKey) {
      const clips = await planBeatAudioClips({
        scriptId,
        sentences,
        resolvedReferenceKey,
        allowPartial: true,
        voiceEngine,
        scriptLanguage,
      });
      if (clips) {
        beatDurationSeconds = beatDurationFromClips(clips);
      }
    }
    const cachedBeat = manifest.beats[String(beatIndex)];
    if (cachedBeat?.durationSeconds && cachedBeat.durationSeconds > 0) {
      beatDurationSeconds = cachedBeat.durationSeconds;
    }
    const previewEngine = readActivePreviewEngine(scriptId);
    const previewSrc = previewVoiceRel(beatIndex, previewEngine);
    const previewReady = fileExists(path.join(scriptDirFor(scriptId), previewSrc));
    const beatAudioReady = Boolean(
      cachedBeat?.audioFile &&
        fileExists(
          path.join(
            beatAudioDir(scriptId, voiceEngine, scriptLanguage),
            cachedBeat.audioFile,
          ),
        ),
    );
    beats.push({
      beatIndex,
      beatId: beat.id,
      title: beat.title,
      sentences: editorSentences,
      beatAudioUrl:
        beatAudioReady && cachedBeat
          ? editorAudioUrl(
              scriptId,
              'beats',
              cachedBeat.audioFile,
              cachedBeat.updatedAt,
              voiceEngine,
            )
          : null,
      beatDurationSeconds,
      previewVoiceSrc: previewReady ? previewSrc : null,
      readySentenceCount,
    });
  }

  const previewRevision = [
    readPreviewRevisionStamp(scriptId),
    ...beats.map(
      (beat) =>
        `${beat.beatIndex}:${beat.beatDurationSeconds ?? 0}:${beat.readySentenceCount}:${
          beat.previewVoiceSrc ?? ''
        }`,
    ),
  ].join('|');

  return {
    schemaVersion: 1,
    scriptId,
    title: live.title,
    animationMdUpdatedAt: animationMd.updatedAt,
    referenceTakeId:
      referenceOptions.referenceTakeId ?? manifest.lastReferenceTakeId ?? null,
    voiceEngine,
    scriptLanguage,
    previewVoiceEngine: readActivePreviewEngine(scriptId),
    previewEnginesReady: readPreviewEnginesReady(scriptId),
    previewRevision,
    beats,
  };
}

function parseEditorSentences(value: unknown): VoxcpmScriptSentence[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('At least one sentence is required');
  }
  const seen = new Set<string>();
  return value.map((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      throw new Error(`Sentence ${index + 1} is invalid`);
    }
    const item = raw as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const text = typeof item.text === 'string' ? item.text.replace(/\s+/g, ' ').trim() : '';
    if (!id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id) || seen.has(id)) {
      throw new Error(`Sentence ${index + 1} has an invalid or duplicate id`);
    }
    if (!text) {
      throw new Error(`Sentence ${index + 1} is empty`);
    }
    if (!isVoxcpmToneId(item.tone)) {
      throw new Error(`Sentence ${index + 1} has an invalid voice color`);
    }
    seen.add(id);
    return {
      id,
      text,
      tone: item.tone,
      pauseAfterMs:
        typeof item.pauseAfterMs === 'number' && Number.isFinite(item.pauseAfterMs)
          ? Math.max(0, Math.min(5000, Math.round(item.pauseAfterMs)))
          : index === value.length - 1
            ? 0
            : 180,
      fingerprint: voxcpmSentenceFingerprint(text),
    };
  });
}

export async function saveVoxcpmEditorBeat(
  scriptId: string,
  beatIndex: number,
  rawSentences: unknown,
  referenceOptions: VoiceEditorOptions = {},
): Promise<VoxcpmEditorDocument> {
  const voiceEngine = resolveVoiceEngine(referenceOptions);
  const scriptLanguage = resolveScriptLanguage(referenceOptions);
  const sentences = parseEditorSentences(rawSentences);
  sentences[sentences.length - 1].pauseAfterMs = 0;
  const joined = joinVoxcpmSentences(sentences);
  await patchLiveBeat(scriptId, beatIndex, {
    ...(scriptLanguage === 'zh' ? { chinese: joined } : { say: joined }),
    voice: voxcpmVoiceMetadataFromSentences(sentences),
  });
  try {
    const referenceAudioPath = await resolveVoxcpmReferenceClip(scriptId, referenceOptions);
    await buildBeatAudioFromCache({
      scriptId,
      beatIndex,
      sentences,
      referenceAudioPath,
      voiceEngine,
      scriptLanguage,
      allowPartial: true,
    });
    schedulePublishPreviewVoice(scriptId, voiceEngine, scriptLanguage);
  } catch {
    // Saving animation.md must not depend on a reference take or complete audio cache.
  }
  for (const sentence of sentences) {
    const state = activeRenders.get(
      activeKey(scriptId, sentence.id, voiceEngine, scriptLanguage),
    );
    if (state?.status === 'failed') {
      activeRenders.delete(activeKey(scriptId, sentence.id, voiceEngine, scriptLanguage));
    }
  }
  return readVoxcpmEditorDocument(scriptId, referenceOptions);
}

export type VoxcpmRenderQueueOptions = VoiceEditorOptions & {
  /** When true, re-synthesize even if cached audio already matches. Default false. */
  force?: boolean;
};

export async function queueVoxcpmSentenceRender(
  scriptId: string,
  beatIndex: number,
  sentenceId: string,
  referenceOptions: VoxcpmRenderQueueOptions,
): Promise<void> {
  const voiceEngine = resolveVoiceEngine(referenceOptions);
  const scriptLanguage = resolveScriptLanguage(referenceOptions);
  const document = await readVoxcpmEditorDocument(scriptId, referenceOptions);
  const beat = document.beats[beatIndex];
  const sentence = beat?.sentences.find((candidate) => candidate.id === sentenceId);
  if (!beat || !sentence) {
    throw new Error(`Sentence not found in beat ${beatIndex + 1}: ${sentenceId}`);
  }
  const force = Boolean(referenceOptions.force);
  // Keep converted audio: queue/all only regenerates when text/tone/reference changed.
  if (!force && sentence.hasLatestAudio) {
    return;
  }
  const referenceAudioPath = await resolveVoxcpmReferenceClip(scriptId, referenceOptions);
  const key = activeKey(scriptId, sentenceId, voiceEngine, scriptLanguage);
  activeRenders.set(key, { status: 'queued', progressPercent: 8 });
  void queueSynthesis(async () => {
    activeRenders.set(key, { status: 'rendering', progressPercent: 55 });
    try {
      await renderSentenceCore({
        scriptId,
        sentence,
        referenceAudioPath,
        referenceTakeId: referenceOptions.referenceTakeId,
        force,
        voiceEngine,
        scriptLanguage,
      });
      activeRenders.set(key, { status: 'rendering', progressPercent: 85 });
      let beatFullyReady = false;
      try {
        const freshLive = await buildLiveScript(scriptId);
        const freshBeat = freshLive?.beats[beatIndex];
        if (freshBeat) {
          const freshSentences = await editorSentencesForBeat(
            scriptId,
            beatIndex,
            spokenTextForBeat(freshBeat, scriptLanguage),
          );
          const built = await buildBeatAudioFromCache({
            scriptId,
            beatIndex,
            sentences: freshSentences,
            referenceAudioPath,
            voiceEngine,
            scriptLanguage,
            allowPartial: true,
          });
          beatFullyReady = Boolean(built?.allReady);
          if (built?.path) {
            copyBeatPreviewWav(scriptId, beatIndex, built.path, voiceEngine);
          }
        }
      } finally {
        activeRenders.delete(key);
        schedulePublishPreviewVoice(scriptId, voiceEngine, scriptLanguage, {
          immediate: beatFullyReady,
        });
      }
    } catch (error) {
      activeRenders.set(key, {
        status: 'failed',
        progressPercent: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

export async function queueVoxcpmBeatRender(
  scriptId: string,
  beatIndex: number,
  referenceOptions: VoxcpmRenderQueueOptions,
): Promise<void> {
  const voiceEngine = resolveVoiceEngine(referenceOptions);
  const scriptLanguage = resolveScriptLanguage(referenceOptions);
  const document = await readVoxcpmEditorDocument(scriptId, referenceOptions);
  const beat = document.beats[beatIndex];
  if (!beat) {
    throw new Error(`Beat ${beatIndex + 1} not found`);
  }
  const force = Boolean(referenceOptions.force);
  const sentencesToRender = force
    ? beat.sentences
    : beat.sentences.filter((sentence) => !sentence.hasLatestAudio);
  if (sentencesToRender.length === 0) {
    return;
  }
  const referenceAudioPath = await resolveVoxcpmReferenceClip(scriptId, referenceOptions);
  for (const sentence of sentencesToRender) {
    activeRenders.set(activeKey(scriptId, sentence.id, voiceEngine, scriptLanguage), {
      status: 'queued',
      progressPercent: 8,
    });
  }
  void (async () => {
    try {
      await Promise.all(
        sentencesToRender.map((sentence) =>
          queueSynthesis(async () => {
            const key = activeKey(scriptId, sentence.id, voiceEngine, scriptLanguage);
            activeRenders.set(key, { status: 'rendering', progressPercent: 55 });
            try {
              await renderSentenceCore({
                scriptId,
                sentence,
                referenceAudioPath,
                referenceTakeId: referenceOptions.referenceTakeId,
                force,
                voiceEngine,
                scriptLanguage,
              });
              activeRenders.delete(key);
              await buildBeatAudioFromCache({
                scriptId,
                beatIndex,
                sentences: beat.sentences,
                referenceAudioPath,
                voiceEngine,
                scriptLanguage,
                allowPartial: true,
              });
              schedulePublishPreviewVoice(scriptId, voiceEngine, scriptLanguage);
            } catch (error) {
              activeRenders.set(key, {
                status: 'failed',
                progressPercent: 0,
                error: error instanceof Error ? error.message : String(error),
              });
              throw error;
            }
          }),
        ),
      );
      await buildBeatAudioFromCache({
        scriptId,
        beatIndex,
        sentences: beat.sentences,
        referenceAudioPath,
        voiceEngine,
        scriptLanguage,
        allowPartial: true,
      });
      schedulePublishPreviewVoice(scriptId, voiceEngine, scriptLanguage);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const sentence of sentencesToRender) {
        const key = activeKey(scriptId, sentence.id, voiceEngine, scriptLanguage);
        if (activeRenders.has(key)) {
          activeRenders.set(key, {
            status: 'failed',
            progressPercent: 0,
            error: message,
          });
        }
      }
    }
  })();
}

export function resolveVoxcpmEditorAudioPath(
  scriptId: string,
  kind: string,
  fileName: string,
  voiceEngine: VoiceEngineId = 'voxcpm',
  scriptLanguage: ScriptLanguageId = 'en',
): string | null {
  if ((kind !== 'sentences' && kind !== 'beats') || path.basename(fileName) !== fileName) {
    return null;
  }
  const engine = parseVoiceEngine(voiceEngine);
  const language = parseScriptLanguage(scriptLanguage);
  const directory =
    kind === 'sentences'
      ? sentenceAudioDir(scriptId, engine, language)
      : beatAudioDir(scriptId, engine, language);
  const filePath = path.join(directory, fileName);
  return fileExists(filePath) ? filePath : null;
}

export async function synthesizeVoxcpmBeatFromSentences(params: {
  scriptId: string;
  beatIndex: number;
  say: string;
  referenceAudioPath: string;
  referenceTakeId?: string;
  outputPath: string;
  force?: boolean;
  voiceEngine?: VoiceEngineId;
  scriptLanguage?: ScriptLanguageId;
  onSentence?: (sentenceIndex: number, sentenceCount: number) => void;
}): Promise<{
  durationSeconds: number;
  captions: VoxcpmRelativeCaptionSegment[];
}> {
  const voiceEngine = parseVoiceEngine(params.voiceEngine);
  const scriptLanguage = parseScriptLanguage(params.scriptLanguage);
  const sentences = await editorSentencesForBeat(
    params.scriptId,
    params.beatIndex,
    params.say,
  );
  if (!sentences.length) {
    throw new Error(`Beat ${params.beatIndex + 1} has empty say text`);
  }

  let completed = 0;
  await Promise.all(
    sentences.map((sentence, index) =>
      queueSynthesis(async () => {
        await renderSentenceCore({
          scriptId: params.scriptId,
          sentence,
          referenceAudioPath: params.referenceAudioPath,
          referenceTakeId: params.referenceTakeId,
          force: params.force,
          voiceEngine,
          scriptLanguage,
        });
        completed += 1;
        params.onSentence?.(Math.min(index, completed - 1), sentences.length);
      }),
    ),
  );
  const built = await buildBeatAudioFromCache({
    scriptId: params.scriptId,
    beatIndex: params.beatIndex,
    sentences,
    referenceAudioPath: params.referenceAudioPath,
    voiceEngine,
    scriptLanguage,
    allowPartial: false,
  });
  if (!built?.path || !built.allReady) {
    throw new Error(`Could not assemble VoxCPM beat ${params.beatIndex + 1}`);
  }
  ensureDir(path.dirname(params.outputPath));
  Deno.copyFileSync(built.path, params.outputPath);
  return {
    durationSeconds: built.durationSeconds,
    captions: built.captions,
  };
}
