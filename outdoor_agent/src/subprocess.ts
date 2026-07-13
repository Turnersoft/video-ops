import path from 'node:path';

import { VIDEO_OPS_ROOT } from './paths.ts';
import {
  appendStageRunLog,
  getActiveStageLogDir,
  logStageRunEvent,
} from './stage-run-log.ts';

const activeByKey = new Map<string, Deno.ChildProcess>();

type RunOptions = {
  abortKey?: string;
  logDir?: string;
};

function resolveLogDir(options?: RunOptions): string | null {
  return options?.logDir ?? getActiveStageLogDir();
}

function track(key: string | undefined, child: Deno.ChildProcess): void {
  if (!key) {
    return;
  }
  activeByKey.set(key, child);
}

function untrack(key: string | undefined): void {
  if (!key) {
    return;
  }
  activeByKey.delete(key);
}

export function abortSubprocess(key: string): boolean {
  const child = activeByKey.get(key);
  if (!child) {
    return false;
  }
  try {
    child.kill('SIGTERM');
  } catch {
    // process may already have exited
  }
  activeByKey.delete(key);
  return true;
}

async function pumpStream(
  stream: ReadableStream<Uint8Array> | null,
  label: 'stdout' | 'stderr',
  logDir: string | null,
  capture: { stderr: string },
): Promise<void> {
  if (!stream) {
    return;
  }
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const text = decoder.decode(value, { stream: true });
      if (!text) {
        continue;
      }
      if (label === 'stderr') {
        capture.stderr += text;
        if (capture.stderr.length > 12000) {
          capture.stderr = capture.stderr.slice(-12000);
        }
      }
      if (logDir) {
        const prefixed = text
          .split('\n')
          .map((line, index, lines) => {
            const suffix = index < lines.length - 1 ? '\n' : '';
            if (!line) {
              return suffix;
            }
            return `[${label}] ${line}${suffix}`;
          })
          .join('');
        appendStageRunLog(logDir, prefixed);
      }
      if (label === 'stderr') {
        console.error(text);
      } else {
        console.log(text);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function stderrSummary(capture: { stderr: string }): string | null {
  const lines = capture.stderr
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return null;
  }
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (line.includes('Error:') || line.includes('Exception:') || line.includes('Traceback')) {
      return line;
    }
  }
  return lines[lines.length - 1] ?? null;
}

async function runTracked(
  label: string,
  command: Deno.Command,
  options?: RunOptions,
): Promise<void> {
  const logDir = resolveLogDir(options);
  const capture = { stderr: '' };
  if (logDir) {
    logStageRunEvent(logDir, `$ ${label}`);
  }
  const child = command.spawn();
  track(options?.abortKey, child);
  try {
    await Promise.all([
      pumpStream(child.stdout, 'stdout', logDir, capture),
      pumpStream(child.stderr, 'stderr', logDir, capture),
    ]);
    const { code } = await child.status;
    if (logDir) {
      logStageRunEvent(logDir, `exit ${code ?? 'unknown'}`);
    }
    if (code !== 0) {
      const summary = stderrSummary(capture);
      throw new Error(summary ? `${label} failed (exit ${code}): ${summary}` : `${label} failed (exit ${code})`);
    }
  } finally {
    untrack(options?.abortKey);
  }
}

export async function runNode(args: string[], options?: RunOptions): Promise<void> {
  const command = new Deno.Command('node', {
    args,
    stdout: 'piped',
    stderr: 'piped',
    env: Deno.env.toObject(),
  });
  await runTracked(`node ${args.join(' ')}`, command, options);
}

export async function runOutdoorPost(
  command: string,
  args: string[],
  options?: RunOptions | string,
): Promise<void> {
  const resolved =
    typeof options === 'string' ? ({ abortKey: options } satisfies RunOptions) : options;
  const scriptPath = path.join(VIDEO_OPS_ROOT, 'outdoor_post/main.ts');
  const denoArgs = ['run', '--allow-all', scriptPath, command, ...args];
  const proc = new Deno.Command('deno', {
    args: denoArgs,
    stdout: 'piped',
    stderr: 'piped',
    env: Deno.env.toObject(),
  });
  await runTracked(`deno ${denoArgs.join(' ')}`, proc, resolved);
}

export async function runCommand(
  bin: string,
  args: string[],
  options?: RunOptions | string,
): Promise<string> {
  const resolved =
    typeof options === 'string' ? ({ abortKey: options } satisfies RunOptions) : options;
  const logDir = resolveLogDir(resolved);
  const command = new Deno.Command(bin, {
    args,
    stdout: 'piped',
    stderr: 'piped',
    env: Deno.env.toObject(),
  });
  if (logDir) {
    logStageRunEvent(logDir, `$ ${bin} ${args.join(' ')}`);
  }
  const child = command.spawn();
  track(resolved?.abortKey, child);
  try {
    const [stdoutText, stderrText, status] = await Promise.all([
      child.stdout
        ? readAllText(child.stdout)
        : Promise.resolve(''),
      child.stderr
        ? readAllText(child.stderr)
        : Promise.resolve(''),
      child.status,
    ]);
    if (logDir) {
      if (stdoutText) {
        appendStageRunLog(
          logDir,
          stdoutText
            .split('\n')
            .map((line) => (line ? `[stdout] ${line}` : line))
            .join('\n') + (stdoutText.endsWith('\n') ? '' : '\n'),
        );
      }
      if (stderrText) {
        appendStageRunLog(
          logDir,
          stderrText
            .split('\n')
            .map((line) => (line ? `[stderr] ${line}` : line))
            .join('\n') + (stderrText.endsWith('\n') ? '' : '\n'),
        );
      }
      logStageRunEvent(logDir, `exit ${status.code ?? 'unknown'}`);
    }
    if (status.code !== 0) {
      throw new Error(`${bin} ${args.join(' ')} failed: ${stderrText || stdoutText || `exit ${status.code}`}`);
    }
    return stdoutText.trim();
  } finally {
    untrack(resolved?.abortKey);
  }
}

async function readAllText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
  return text;
}
