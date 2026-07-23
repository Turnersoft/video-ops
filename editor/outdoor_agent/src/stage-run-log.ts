import path from 'node:path';

import { fileExists } from './fs_util.ts';
import { ensureDir, takeDir } from './paths.ts';

export const STAGE_RUN_LOG = 'stage-run.log';
export const TAKE_AGENT_LOG = 'agent.log';

const activeStageLogDir: { value: string | null } = { value: null };

export function setActiveStageLogDir(logDir: string | null): void {
  activeStageLogDir.value = logDir;
}

export function getActiveStageLogDir(): string | null {
  return activeStageLogDir.value;
}

export function stageRunLogPath(logDir: string): string {
  return path.join(logDir, STAGE_RUN_LOG);
}

export function takeAgentLogPath(scriptId: string, takeId: string): string {
  return path.join(takeDir(scriptId, takeId), TAKE_AGENT_LOG);
}

function timestamp(): string {
  return new Date().toISOString();
}

export function appendStageRunLog(logDir: string, chunk: string): void {
  if (!chunk) {
    return;
  }
  ensureDir(logDir);
  Deno.writeTextFileSync(stageRunLogPath(logDir), chunk, { append: true });
}

export function appendTakeAgentLog(scriptId: string, takeId: string, message: string): void {
  const file = takeAgentLogPath(scriptId, takeId);
  ensureDir(path.dirname(file));
  Deno.writeTextFileSync(file, `[${timestamp()}] ${message}\n`, { append: true });
}

export function openStageRunLog(
  logDir: string,
  header: Record<string, string | number | boolean | null | undefined>,
): void {
  const lines = [`# stage-run ${timestamp()}`];
  for (const [key, value] of Object.entries(header)) {
    if (value === undefined || value === null) {
      continue;
    }
    lines.push(`${key}=${String(value)}`);
  }
  lines.push('');
  appendStageRunLog(logDir, `${lines.join('\n')}\n`);
}

export function logStageRunEvent(logDir: string, message: string): void {
  appendStageRunLog(logDir, `[${timestamp()}] ${message}\n`);
}

export function readTextTail(filePath: string, maxLines = 48): string | null {
  if (!fileExists(filePath)) {
    return null;
  }
  const text = Deno.readTextFileSync(filePath);
  if (!text.trim()) {
    return null;
  }
  const lines = text.split('\n');
  if (lines.length <= maxLines) {
    return text.trimEnd();
  }
  return lines.slice(-maxLines).join('\n').trimEnd();
}

export function readStageRunLogTail(logDir: string, maxLines = 48): string | null {
  return readTextTail(stageRunLogPath(logDir), maxLines);
}

export function readTakeAgentLogTail(scriptId: string, takeId: string, maxLines = 32): string | null {
  return readTextTail(takeAgentLogPath(scriptId, takeId), maxLines);
}

export function stageRunLogExists(logDir: string): boolean {
  return fileExists(stageRunLogPath(logDir));
}
