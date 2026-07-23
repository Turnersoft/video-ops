/**
 * Live script from animation.md — compiled on the Remotion dev API in real time.
 */

import path from 'node:path';

import {
  teleprompterTitleFromScriptId,
  styleKitForSeriesId,
  type StyleKit,
} from '../../../src/scriptCollections.ts';
import { fileExists, readJson } from './fs_util.ts';
import { loadAnimationV4, resolveAnimationV4 } from './animation-load.ts';
import { readAnimationMd, writeAnimationMd, titleFromAnimationMd } from './animation-md.ts';
import {
  animationMdPath,
  canonicalizeScriptId,
  scriptDirFor,
  seriesDirFor,
  seriesForScriptId,
} from './paths.ts';
import { compileAnimationSource } from './scripts-watcher.ts';
import { patchBeatSectionVariants, sanitizeSay, type BeatVariantPatch } from '../../../src/beatVariants.ts';

export type LiveBeat = {
  id: string;
  index: number;
  title: string;
  say: string;
  leanCode: string;
  turnCode: string;
  chinese: string;
  hint: string;
  visualNotes: string;
  durationSeconds?: number;
};

export type LiveScript = {
  schemaVersion: 1;
  id: string;
  title: string;
  language: string;
  mode: 'timed';
  countdownSeconds: number;
  source: 'animation.md';
  /** Engineering project folder under projects/ (series id). */
  projectId: string;
  seriesId: string;
  styleKit: StyleKit;
  updatedAt: string | null;
  slides: Array<{
    id: string;
    title: string;
    body: string;
    durationSeconds?: number;
    leanCode?: string;
    turnCode?: string;
    notes?: string;
    codeFocus?: 'lean' | 'turn';
  }>;
  beats: LiveBeat[];
};

function resolveStyleKit(seriesId: string): StyleKit {
  const metaPath = path.join(seriesDirFor(seriesId as never), 'series.json');
  if (fileExists(metaPath)) {
    try {
      const meta = readJson<{ styleKit?: string }>(metaPath);
      if (meta.styleKit) {
        return meta.styleKit as StyleKit;
      }
    } catch {
      // fall through
    }
  }
  return styleKitForSeriesId(seriesId);
}

type AnimationBeat = {
  say?: string;
  sayZh?: string;
  durationSeconds?: number;
  visualNotes?: string;
  lean?: { code?: string; hints?: Array<{ text?: string }> };
  turn?: { code?: string; hints?: Array<{ text?: string }> };
};

type AnimationScene = {
  index?: number;
  title?: string;
  visualNotes?: string;
  durationSeconds?: number;
  countdownSeconds?: number;
  compare?: { beats?: AnimationBeat[] };
  director?: {
    say?: string | string[];
    sayTimings?: number[];
    countdownSeconds?: number;
  };
};

type AnimationDoc = {
  scriptId?: string;
  title?: string;
  scenes?: AnimationScene[];
};

function animationCachePath(scriptId: string): string {
  return path.join(scriptDirFor(scriptId), '.cache', 'animation-v4.json');
}

function mtimeMs(filePath: string): number {
  if (!fileExists(filePath)) {
    return 0;
  }
  return Deno.statSync(filePath).mtime?.getTime() ?? 0;
}

export async function ensureAnimationCompiled(scriptId: string): Promise<void> {
  const mdPath = animationMdPath(scriptId);
  const cachePath = animationCachePath(scriptId);
  if (!fileExists(mdPath)) {
    return;
  }
  if (!fileExists(cachePath) || mtimeMs(mdPath) > mtimeMs(cachePath) + 50) {
    await compileAnimationSource(scriptId);
  }
}

function titleFromVisualNotes(notes: string | undefined, index: number): string {
  const first = notes?.split(/[.\n]/)[0]?.trim();
  if (first) {
    return first;
  }
  return `Beat ${index + 1}`;
}

function liveBeatFromCompare(beat: AnimationBeat, index: number): LiveBeat {
  const leanHints = (beat.lean?.hints ?? []).map((hint) => hint.text?.trim()).filter(Boolean);
  const turnHints = (beat.turn?.hints ?? []).map((hint) => hint.text?.trim()).filter(Boolean);
  return {
    id: `beat-${String(index + 1).padStart(2, '0')}`,
    index,
    title: titleFromVisualNotes(beat.visualNotes, index),
    say: sanitizeSay(beat.say?.trim() ?? ''),
    leanCode: beat.lean?.code?.trim() ?? '',
    turnCode: beat.turn?.code?.trim() ?? '',
    chinese: beat.sayZh?.trim() ?? '',
    hint: [...leanHints, ...turnHints].join('\n'),
    visualNotes: beat.visualNotes?.trim() ?? '',
    durationSeconds: beat.durationSeconds,
  };
}

function liveBeatsFromV4(animation: AnimationDoc): LiveBeat[] | null {
  const beats: LiveBeat[] = [];
  for (const scene of animation.scenes ?? []) {
    const compareBeats = scene.compare?.beats;
    if (!Array.isArray(compareBeats) || compareBeats.length === 0) {
      continue;
    }
    for (const beat of compareBeats) {
      beats.push(liveBeatFromCompare(beat, beats.length));
    }
  }
  return beats.length > 0 ? beats : null;
}

function liveBeatsFromV2(animation: AnimationDoc): LiveBeat[] | null {
  const scenes = animation.scenes;
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return null;
  }

  const beats: LiveBeat[] = [];
  for (const scene of scenes) {
    const director = scene.director;
    if (!director?.say) {
      continue;
    }
    const sayLines = Array.isArray(director.say) ? director.say : [director.say];
    const timings = Array.isArray(director.sayTimings) ? director.sayTimings : [];

    for (let lineIndex = 0; lineIndex < sayLines.length; lineIndex += 1) {
      const start = timings[lineIndex] ?? lineIndex * 5;
      const nextStart = timings[lineIndex + 1];
      const durationSeconds =
        typeof nextStart === 'number'
          ? Math.max(4, nextStart - start)
          : Math.max(4, (scene.durationSeconds ?? 20) - start);
      const body = sayLines[lineIndex]?.trim() ?? '';
      if (!body) {
        continue;
      }
      const index = beats.length;
      beats.push({
        id: `scene-${String(scene.index ?? index + 1).padStart(2, '0')}-line-${
          String(lineIndex + 1).padStart(2, '0')
        }`,
        index,
        title: scene.title ?? `Scene ${scene.index ?? index + 1}`,
        say: body,
        leanCode: '',
        turnCode: '',
        chinese: '',
        hint: '',
        visualNotes: scene.visualNotes?.trim() ?? '',
        durationSeconds,
      });
    }
  }

  return beats.length > 0 ? beats : null;
}

function liveBeatsFromAnimation(animation: AnimationDoc): LiveBeat[] | null {
  return liveBeatsFromV4(animation) ?? liveBeatsFromV2(animation);
}

function toOutdoorSlides(beats: LiveBeat[]) {
  return beats.map((beat) => ({
    id: beat.id,
    title: beat.title,
    body: beat.say,
    durationSeconds: beat.durationSeconds,
    leanCode: beat.leanCode || undefined,
    turnCode: beat.turnCode || undefined,
    notes: [beat.hint, beat.visualNotes, beat.chinese].filter(Boolean).join('\n\n') || undefined,
    codeFocus: (beat.turnCode && !beat.leanCode
      ? 'turn'
      : beat.leanCode
      ? 'lean'
      : undefined) as 'lean' | 'turn' | undefined,
  }));
}

export async function buildLiveScript(rawScriptId: string): Promise<LiveScript | null> {
  const scriptId = canonicalizeScriptId(rawScriptId);
  const md = readAnimationMd(scriptId);

  if (!md.exists) {
    const cachedOnly = loadAnimationV4(scriptId);
    if (!cachedOnly) {
      return null;
    }
  }

  const animation = await resolveAnimationV4(scriptId);
  if (!animation) {
    return null;
  }
  const beats = liveBeatsFromAnimation(animation);
  if (!beats) {
    return null;
  }

  const title = teleprompterTitleFromScriptId(scriptId) ||
    animation.title ||
    animation.scenes?.[0]?.title ||
    (md.exists ? titleFromAnimationMd(md.markdown, scriptId) : scriptId);

  const seriesId = seriesForScriptId(scriptId);
  const styleKit = resolveStyleKit(seriesId);

  return {
    schemaVersion: 1,
    id: scriptId,
    title,
    language: 'en',
    mode: 'timed',
    countdownSeconds: 3,
    source: 'animation.md',
    projectId: seriesId,
    seriesId,
    styleKit,
    updatedAt: md.updatedAt ?? null,
    slides: toOutdoorSlides(beats),
    beats,
  };
}

/** Split animation.md into prefix + beat chunks (each starts with ## Beat). */
function splitAnimationBeats(markdown: string): { prefix: string; beats: string[] } {
  const match = markdown.match(/^([\s\S]*?)(?=^## Beat\s)/m);
  if (!match) {
    return { prefix: markdown, beats: [] };
  }
  const prefix = match[1];
  const rest = markdown.slice(prefix.length);
  const beats = rest.split(/(?=^## Beat\s)/m).filter((chunk) => chunk.trim().startsWith('## Beat'));
  return { prefix, beats };
}

function replaceFencedCode(section: string, lang: 'lean' | 'turn', code: string): string {
  const heading = lang === 'lean' ? '### Lean' : '### Turn';
  const fence = '```' + lang;
  const pattern = new RegExp(
    `(${heading}\\s*\\n(?:<!--[\\s\\S]*?-->\\s*\\n)?)${fence}\\n[\\s\\S]*?\\n\`\`\``,
    'i',
  );
  if (pattern.test(section)) {
    return section.replace(pattern, `$1${fence}\n${code.replace(/\n+$/, '')}\n\`\`\``);
  }
  // Insert section before ### Chinese / ### Visual notes / next ## if missing
  const insert = `\n${heading}\n\n${fence}\n${code.replace(/\n+$/, '')}\n\`\`\`\n`;
  const beforeChinese = section.search(/^### Chinese/m);
  if (beforeChinese >= 0) {
    return section.slice(0, beforeChinese) + insert + section.slice(beforeChinese);
  }
  const beforeVisual = section.search(/^### Visual notes/m);
  if (beforeVisual >= 0) {
    return section.slice(0, beforeVisual) + insert + section.slice(beforeVisual);
  }
  return `${section.trimEnd()}\n${insert}`;
}

function replaceSayInBeat(section: string, say: string): string {
  const lines = section.split('\n');
  let i = 0;
  // skip heading
  i += 1;
  // skip blank + HTML comments
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.trim().startsWith('<!--')) {
      while (i < lines.length && !lines[i].includes('-->')) {
        i += 1;
      }
      i += 1;
      continue;
    }
    break;
  }
  const sayStart = i;
  while (i < lines.length && !/^###\s/.test(lines[i]) && !/^##\s/.test(lines[i])) {
    i += 1;
  }
  const sayLines = say.replace(/\n+$/, '').split('\n');
  return [...lines.slice(0, sayStart), ...sayLines, '', ...lines.slice(i)].join('\n');
}

function replaceHeadingTitle(section: string, title: string, index: number): string {
  return section.replace(/^## Beat\s+\d+:\s*.*$/m, `## Beat ${index + 1}: ${title}`);
}

function replaceVisualNotes(section: string, visualNotes: string): string {
  const heading = '### Visual notes';
  const pattern = new RegExp(
    `(${heading}\\s*\\n)([\\s\\S]*?)(?=\\n### |\\n## |$)`,
    'i',
  );
  const body = visualNotes.replace(/\n+$/, '');
  if (pattern.test(section)) {
    return section.replace(pattern, `$1${body}\n`);
  }
  return `${section.trimEnd()}\n\n${heading}\n\n${body}\n`;
}

export type BeatPatch = BeatVariantPatch;

export async function patchLiveBeat(
  rawScriptId: string,
  beatIndex: number,
  patch: BeatPatch,
): Promise<LiveScript> {
  const scriptId = canonicalizeScriptId(rawScriptId);
  const doc = readAnimationMd(scriptId);
  if (!doc.exists) {
    throw new Error('animation.md not found — cannot edit beats without markdown source');
  }

  const { prefix, beats } = splitAnimationBeats(doc.markdown);
  if (beatIndex < 0 || beatIndex >= beats.length) {
    throw new Error(`Beat ${beatIndex + 1} not found (have ${beats.length})`);
  }

  let section = patchBeatSectionVariants(beats[beatIndex], beatIndex, patch);
  beats[beatIndex] = section.endsWith('\n') ? section : `${section}\n`;

  const nextMarkdown = `${prefix}${beats.join('')}`;
  await writeAnimationMd(scriptId, nextMarkdown, { compile: true });

  const live = await buildLiveScript(scriptId);
  if (!live) {
    throw new Error('Failed to rebuild live script after beat patch');
  }
  return live;
}
