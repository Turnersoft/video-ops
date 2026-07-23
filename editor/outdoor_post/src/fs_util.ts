import path from 'node:path';

export function fileExists(filePath: string): boolean {
  try {
    Deno.statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

export function ensureDir(dirPath: string): void {
  Deno.mkdirSync(dirPath, { recursive: true });
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(Deno.readTextFileSync(filePath)) as T;
}

export function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  Deno.writeTextFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
