import path from 'node:path';

import { ensureDir, fileExists, readJson, writeJson } from './fs_util.ts';
import { scriptFolder, VIDEO_OPS_ROOT } from './paths.ts';

type AnimationBeat = {
  say?: string;
  sayZh?: string;
  durationSeconds?: number;
  countdownSeconds?: number;
  focus?: string;
  visualNotes?: string;
  lean?: { code?: string; hints?: Array<{ target?: string }> };
  turn?: { code?: string; hints?: Array<{ target?: string }> };
};

type AnimationScene = {
  index?: number;
  title?: string;
  durationSeconds?: number;
  countdownSeconds?: number;
  visualNotes?: string;
  compare?: { beats?: AnimationBeat[] };
  director?: {
    say?: string | string[];
    sayTimings?: number[];
    countdownSeconds?: number;
  };
};

type Animation = {
  scriptId?: string;
  title?: string;
  scenes?: AnimationScene[];
};

type OutdoorSlide = {
  id: string;
  title: string;
  durationSeconds?: number;
  body?: string;
  notes?: string;
  leanCode?: string;
  turnCode?: string;
  codeFocus?: string;
  countdownSeconds?: number;
};

function beatTitle(beat: AnimationBeat, index: number): string {
  return beat.visualNotes?.split('.')[0]?.slice(0, 80) || `Beat ${index + 1}`;
}

function beatNotes(beat: AnimationBeat): string {
  return [
    beat.lean?.code ? `Lean:\n${beat.lean.code}` : '',
    beat.turn?.code ? `Turn:\n${beat.turn.code}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function isAsBefore(code: string | undefined): boolean {
  return typeof code === 'string' && /^as\s+before$/i.test(code.trim());
}

function beatCodeFocus(beat: AnimationBeat): string {
  if (beat.focus === 'turn') {
    return 'turn';
  }
  if (beat.focus === 'lean' || beat.focus === 'both') {
    return 'lean';
  }

  const leanHasHint = beat.lean?.hints?.some((hint) => hint.target?.startsWith('lean-'));
  const turnHasHint = beat.turn?.hints?.some((hint) => hint.target?.startsWith('turn-'));
  if (turnHasHint && !leanHasHint) {
    return 'turn';
  }

  const turnCode = beat.turn?.code?.trim() ?? '';
  const leanCode = beat.lean?.code?.trim() ?? '';
  if (isAsBefore(turnCode) && !isAsBefore(leanCode)) {
    return 'lean';
  }
  if (isAsBefore(leanCode) && !isAsBefore(turnCode)) {
    return 'turn';
  }

  const title = beat.visualNotes?.split('.')[0]?.trim().toLowerCase() ?? '';
  if (title.startsWith('turn:')) {
    return 'turn';
  }

  return 'lean';
}

function slideFromBeat(beat: AnimationBeat, index: number): OutdoorSlide {
  const leanCode = beat.lean?.code?.trim() || undefined;
  const turnCode = beat.turn?.code?.trim() || undefined;
  const slide: OutdoorSlide = {
    id: `beat-${String(index + 1).padStart(2, '0')}`,
    title: beatTitle(beat, index),
    durationSeconds: beat.durationSeconds,
    body: beat.say,
    notes: beatNotes(beat) || undefined,
    leanCode,
    turnCode,
    codeFocus: beatCodeFocus(beat),
  };
  if (typeof beat.countdownSeconds === 'number') {
    slide.countdownSeconds = beat.countdownSeconds;
  }
  return slide;
}

function slidesFromV4(animation: Animation): OutdoorSlide[] | null {
  const scene = animation.scenes?.[0];
  const beats = scene?.compare?.beats;
  if (!Array.isArray(beats) || beats.length === 0) {
    return null;
  }
  return beats.map(slideFromBeat);
}

function slidesFromV2(animation: Animation): OutdoorSlide[] | null {
  const scenes = animation.scenes;
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return null;
  }

  const slides: OutdoorSlide[] = [];
  for (const scene of scenes) {
    const director = scene.director;
    if (!director?.say) {
      continue;
    }
    const sayLines = Array.isArray(director.say) ? director.say : [director.say];
    const timings = Array.isArray(director.sayTimings) ? director.sayTimings : [];
    const sceneCountdown =
      typeof director.countdownSeconds === 'number'
        ? director.countdownSeconds
        : typeof scene.countdownSeconds === 'number'
        ? scene.countdownSeconds
        : undefined;

    for (let lineIndex = 0; lineIndex < sayLines.length; lineIndex += 1) {
      const start = timings[lineIndex] ?? lineIndex * 5;
      const nextStart = timings[lineIndex + 1];
      const durationSeconds =
        typeof nextStart === 'number'
          ? Math.max(4, nextStart - start)
          : Math.max(4, (scene.durationSeconds ?? 20) - start);

      const slide: OutdoorSlide = {
        id: `scene-${String(scene.index).padStart(2, '0')}-line-${String(lineIndex + 1).padStart(2, '0')}`,
        title: scene.title ?? `Scene ${scene.index}`,
        durationSeconds,
        body: sayLines[lineIndex],
        notes: scene.visualNotes || undefined,
      };
      if (typeof sceneCountdown === 'number') {
        slide.countdownSeconds = sceneCountdown;
      }
      slides.push(slide);
    }
  }

  return slides.length > 0 ? slides : null;
}

function extractSlides(animation: Animation): OutdoorSlide[] | null {
  return slidesFromV4(animation) ?? slidesFromV2(animation);
}

function usage(): void {
  console.log(
    'Usage: deno task export-script <script-id> [out.json]\n' +
      '   or: deno run --allow-all main.ts export-outdoor-script <script-id> [out.json]',
  );
}

export async function runExportOutdoorScript(argv: string[]): Promise<void> {
  const scriptId = argv[0];
  if (!scriptId) {
    usage();
    Deno.exit(1);
  }

  const folder = path.join(VIDEO_OPS_ROOT, scriptFolder(scriptId));
  const animationPath = path.join(folder, '.cache', 'animation-v4.json');
  if (!fileExists(animationPath)) {
    throw new Error(`Missing ${animationPath} — run npm run sync in remotion/ first.`);
  }

  const animation = readJson<Animation>(animationPath);
  const slides = extractSlides(animation);
  if (!slides) {
    throw new Error(`No outdoor slides found in ${animationPath}`);
  }

  const scene = animation.scenes?.[0];
  const outdoorScript = {
    schemaVersion: 1,
    id: animation.scriptId ?? scriptId,
    title: animation.title ?? scene?.title ?? scriptId,
    language: 'en',
    mode: 'manual',
    countdownSeconds: 3,
    defaultFontScale: 1,
    slides,
  };

  const outPath = argv[1]
    ? path.resolve(argv[1])
    : path.join(folder, 'export', 'outdoor-script.json');

  ensureDir(path.dirname(outPath));
  writeJson(outPath, outdoorScript);
  console.log(outPath);
}
