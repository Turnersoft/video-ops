/**
 * Watch scripts/ for animation.md changes → Remotion sync (animation.json).
 * Outdoor teleprompter slides are built live from animation.md / animation.json — no export JSON.
 */

import path from 'node:path';

import { fileExists } from './fs_util.ts';
import { SCRIPTS_DIR, VIDEO_OPS_ROOT } from './paths.ts';

const DEBOUNCE_MS = 400;
const POLL_MS = 20_000;

type WatchCallback = (scriptIds: string[]) => void;

function scriptIdFromAnimationPath(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const fileName = parts[parts.length - 1];
  if (fileName !== 'animation.md') {
    return null;
  }
  const scriptId = parts[parts.length - 2];
  return scriptId && scriptId !== 'scripts' ? scriptId : null;
}

async function runInDir(bin: string, args: string[], cwd: string): Promise<void> {
  const command = new Deno.Command(bin, {
    args,
    cwd,
    stdout: 'piped',
    stderr: 'piped',
    env: Deno.env.toObject(),
  });
  const { code, stdout, stderr } = await command.output();
  const out = new TextDecoder().decode(stdout);
  const err = new TextDecoder().decode(stderr);
  if (code !== 0) {
    throw new Error(`${bin} ${args.join(' ')} failed (exit ${code})\n${err || out}`);
  }
  if (out.trim()) {
    console.log(out.trim());
  }
}

export async function compileAnimationSource(scriptId: string): Promise<void> {
  const remotionDir = path.join(VIDEO_OPS_ROOT, 'remotion');
  console.log(`[scripts-watch] sync Remotion for ${scriptId}`);
  await runInDir('npm', ['run', 'sync', '--', '--script', scriptId], remotionDir);
}

function* walkAnimationMd(): Generator<{ scriptId: string; path: string }> {
  if (!fileExists(SCRIPTS_DIR)) {
    return;
  }
  for (const series of Deno.readDirSync(SCRIPTS_DIR)) {
    if (!series.isDirectory || series.name.startsWith('.') || series.name === '_templates') {
      continue;
    }
    const seriesDir = path.join(SCRIPTS_DIR, series.name);
    for (const episode of Deno.readDirSync(seriesDir)) {
      if (!episode.isDirectory || episode.name === 'shared') {
        continue;
      }
      const mdPath = path.join(seriesDir, episode.name, 'animation.md');
      if (fileExists(mdPath)) {
        yield { scriptId: episode.name, path: mdPath };
      }
    }
  }
}

function mtimeMs(filePath: string): number {
  if (!fileExists(filePath)) {
    return 0;
  }
  return Deno.statSync(filePath).mtime?.getTime() ?? 0;
}

export function listAnimationMdScriptIds(): string[] {
  return [...walkAnimationMd()].map((entry) => entry.scriptId);
}

/** Scan scripts/ and recompile animation.md → Remotion animation.json. */
export async function resyncAllScripts(options: { force?: boolean } = {}): Promise<{
  scanned: number;
  compiled: string[];
  skipped: string[];
  errors: Array<{ scriptId: string; error: string }>;
}> {
  const compiled: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ scriptId: string; error: string }> = [];
  const entries = [...walkAnimationMd()];

  for (const entry of entries) {
    const jsonPath = path.join(path.dirname(entry.path), 'animation.json');
    const needsCompile =
      options.force === true ||
      !fileExists(jsonPath) ||
      mtimeMs(entry.path) > mtimeMs(jsonPath) + 50;

    if (!needsCompile) {
      skipped.push(entry.scriptId);
      continue;
    }
    try {
      await compileAnimationSource(entry.scriptId);
      compiled.push(entry.scriptId);
    } catch (error) {
      errors.push({
        scriptId: entry.scriptId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    scanned: entries.length,
    compiled,
    skipped,
    errors,
  };
}

export function watchScripts(onChange?: WatchCallback): () => void {
  if (!fileExists(SCRIPTS_DIR)) {
    console.warn(`[scripts-watch] missing ${SCRIPTS_DIR}`);
    return () => {};
  }

  const pending = new Set<string>();
  let timer: number | null = null;
  let running = false;
  let closed = false;

  const flush = async () => {
    if (running || pending.size === 0) {
      return;
    }
    running = true;
    const scriptIds = [...pending];
    pending.clear();
    try {
      for (const scriptId of scriptIds) {
        try {
          await compileAnimationSource(scriptId);
        } catch (error) {
          console.error(
            `[scripts-watch] compile failed for ${scriptId}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
      onChange?.(scriptIds);
    } finally {
      running = false;
      if (pending.size > 0) {
        timer = setTimeout(() => {
          void flush();
        }, DEBOUNCE_MS) as unknown as number;
      }
    }
  };

  const schedule = (scriptId: string) => {
    pending.add(scriptId);
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      void flush();
    }, DEBOUNCE_MS) as unknown as number;
  };

  const watcher = Deno.watchFs(SCRIPTS_DIR, { recursive: true });
  const pollKnown = new Map<string, number>();

  void (async () => {
    while (!closed) {
      try {
        for (const entry of walkAnimationMd()) {
          const mtime = Deno.statSync(entry.path).mtime?.getTime() ?? 0;
          const prev = pollKnown.get(entry.scriptId);
          if (prev !== undefined && prev !== mtime) {
            schedule(entry.scriptId);
          }
          pollKnown.set(entry.scriptId, mtime);
        }
      } catch {
        // ignore poll errors
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  })();

  void (async () => {
    for await (const event of watcher) {
      if (closed) {
        break;
      }
      for (const filePath of event.paths) {
        const scriptId = scriptIdFromAnimationPath(filePath);
        if (scriptId) {
          schedule(scriptId);
        }
      }
    }
  })();

  console.log(`[scripts-watch] watching ${SCRIPTS_DIR} for animation.md`);

  return () => {
    closed = true;
    if (timer !== null) {
      clearTimeout(timer);
    }
    try {
      watcher.close();
    } catch {
      // already closed
    }
  };
}
