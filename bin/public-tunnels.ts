import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEO_OPS_ROOT = path.resolve(__dirname, '..');

function log(prefix: string, message: string): void {
  console.log(`[${prefix}] ${message}`);
}

function parsePublicUrl(text: string): string | null {
  const labeled = /your url is:\s*(https:\/\/\S+)/i.exec(text);
  if (labeled?.[1]) {
    return labeled[1].replace(/\/+$/, '');
  }
  const bare = /(https:\/\/[a-z0-9-]+\.loca\.lt)/i.exec(text);
  return bare?.[1]?.replace(/\/+$/, '') ?? null;
}

/** localtunnel gives a second/third public HTTPS URL (ngrok free = one hostname only). */
export async function startLocaltunnel(
  children: ChildProcess[],
  port: number,
  label: string,
  prefix: string,
): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(
      Deno.build.os === 'windows' ? 'npx.cmd' : 'npx',
      ['localtunnel', '--port', String(port)],
      {
        cwd: VIDEO_OPS_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    children.push(child);

    const started = Date.now();
    const timeoutMs = 30_000;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearInterval(timer);
      fn();
    };

    const onChunk = (chunk: Uint8Array) => {
      const text = new TextDecoder().decode(chunk);
      const url = parsePublicUrl(text);
      if (url) {
        log(prefix, `${label} public URL → localhost:${port} (${url})`);
        finish(() => resolve(url));
      }
    };

    child.stdout?.on('data', onChunk);
    child.stderr?.on('data', onChunk);
    child.on('exit', (code) => {
      if (!settled && code && code !== 0) {
        finish(() => reject(new Error(`localtunnel for ${label} exited with code ${code}`)));
      }
    });

    const timer = setInterval(() => {
      if (Date.now() - started > timeoutMs) {
        finish(() => reject(new Error(`Timed out waiting for ${label} public tunnel URL`)));
      }
    }, 500);
  });
}
