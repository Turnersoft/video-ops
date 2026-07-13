/**
 * Live script from animation.md / animation.json — never the bundled teleprompter assets.
 */

import path from 'node:path';

import { teleprompterTitleFromScriptId } from '../../src/scriptCollections.ts';
import { fileExists, readJson } from './fs_util.ts';
import { readAnimationMd, writeAnimationMd, titleFromAnimationMd } from './animation-md.ts';
import { animationMdPath, scriptDirFor } from './paths.ts';
import { compileAnimationSource } from './scripts-watcher.ts';

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
  source: 'animation.md' | 'animation.json';
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

function animationJsonPath(scriptId: string): string {
  return path.join(scriptDirFor(scriptId), 'animation.json');
}

function mtimeMs(filePath: string): number {
  if (!fileExists(filePath)) {
    return 0;
  }
  return Deno.statSync(filePath).mtime?.getTime() ?? 0;
}

export async function ensureAnimationCompiled(scriptId: string): Promise<void> {
  const mdPath = animationMdPath(scriptId);
  const jsonPath = animationJsonPath(scriptId);
  if (!fileExists(mdPath)) {
    return;
  }
  if (!fileExists(jsonPath) || mtimeMs(mdPath) > mtimeMs(jsonPath) + 50) {
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
    say: beat.say?.trim() ?? '',
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

export async function buildLiveScript(scriptId: string): Promise<LiveScript | null> {
  const md = readAnimationMd(scriptId);
  const jsonPath = animationJsonPath(scriptId);

  if (md.exists) {
    try {
      await ensureAnimationCompiled(scriptId);
    } catch (error) {
      // Prefer serving existing animation.json over failing the teleprompter.
      if (!fileExists(jsonPath)) {
        throw error;
      }
      console.warn(
        `[live-script] compile failed for ${scriptId}; using existing animation.json`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (!fileExists(jsonPath) && !md.exists) {
    return null;
  }

  if (!fileExists(jsonPath)) {
    return null;
  }

  const animation = readJson<AnimationDoc>(jsonPath);
  const beats = liveBeatsFromAnimation(animation);
  if (!beats) {
    return null;
  }

  const title = teleprompterTitleFromScriptId(scriptId) ||
    animation.title ||
    animation.scenes?.[0]?.title ||
    (md.exists ? titleFromAnimationMd(md.markdown, scriptId) : scriptId);

  return {
    schemaVersion: 1,
    id: animation.scriptId ?? scriptId,
    title,
    language: 'en',
    mode: 'timed',
    countdownSeconds: 3,
    source: md.exists ? 'animation.md' : 'animation.json',
    updatedAt: md.updatedAt ?? (fileExists(jsonPath)
      ? Deno.statSync(jsonPath).mtime?.toISOString() ?? null
      : null),
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

export type BeatPatch = {
  title?: string;
  say?: string;
  leanCode?: string;
  turnCode?: string;
};

export async function patchLiveBeat(
  scriptId: string,
  beatIndex: number,
  patch: BeatPatch,
): Promise<LiveScript> {
  const doc = readAnimationMd(scriptId);
  if (!doc.exists) {
    throw new Error('animation.md not found — cannot edit beats without markdown source');
  }

  const { prefix, beats } = splitAnimationBeats(doc.markdown);
  if (beatIndex < 0 || beatIndex >= beats.length) {
    throw new Error(`Beat ${beatIndex + 1} not found (have ${beats.length})`);
  }

  let section = beats[beatIndex];
  if (typeof patch.title === 'string' && patch.title.trim()) {
    section = replaceHeadingTitle(section, patch.title.trim(), beatIndex);
  }
  if (typeof patch.say === 'string') {
    section = replaceSayInBeat(section, patch.say);
  }
  if (typeof patch.leanCode === 'string') {
    section = replaceFencedCode(section, 'lean', patch.leanCode);
  }
  if (typeof patch.turnCode === 'string') {
    section = replaceFencedCode(section, 'turn', patch.turnCode);
  }
  beats[beatIndex] = section.endsWith('\n') ? section : `${section}\n`;

  const nextMarkdown = `${prefix}${beats.join('')}`;
  await writeAnimationMd(scriptId, nextMarkdown, { compile: true });

  const live = await buildLiveScript(scriptId);
  if (!live) {
    throw new Error('Failed to rebuild live script after beat patch');
  }
  return live;
}
