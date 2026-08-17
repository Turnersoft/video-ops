import { watchInbox } from './src/inbox-watcher.ts';
import { watchScripts } from './src/scripts-watcher.ts';
import { runStage } from './src/queue.ts';
import { ensureDir, INBOX_DIR, listInboxDirs, SCRIPTS_DIR } from './src/paths.ts';
import { applyPublishCredentials } from './src/publish-credentials.ts';
import { createServer } from './src/server.ts';
import { isPipelineStage } from './src/schema.ts';

type CliArgs = {
  host: string;
  port: number;
  watch: boolean;
  command?: 'run-stage';
  jobId?: string;
  stage?: string;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { host: '127.0.0.1', port: 8787, watch: true };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--host' && argv[index + 1]) {
      args.host = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--port' && argv[index + 1]) {
      args.port = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (token === '--no-watch') {
      args.watch = false;
    }
    if (token === 'run-stage') {
      args.command = 'run-stage';
      args.jobId = argv[index + 1];
      args.stage = argv[index + 2];
      index += 2;
    }
  }
  return args;
}

export async function main(): Promise<void> {
  const args = parseArgs(Deno.args);

  if (args.command === 'run-stage') {
    if (!args.jobId || !args.stage || !isPipelineStage(args.stage)) {
      console.error('Usage: deno task run-stage <jobId> <cut|align|composite|social> [--rerun]');
      Deno.exit(1);
    }
    await runStage(args.jobId, args.stage, { rerun: Deno.args.includes('--rerun') });
    console.log(`[outdoor-agent] stage ${args.stage} complete for ${args.jobId}`);
    return;
  }

  ensureDir(INBOX_DIR);
  applyPublishCredentials();
  console.log('[outdoor-agent] watching inboxes:');
  for (const dir of listInboxDirs()) {
    console.log(`  - ${dir}`);
  }
  console.log(`[outdoor-agent] watching scripts: ${SCRIPTS_DIR}`);
  const api = createServer({ host: args.host, port: args.port });
  await api.listen();

  let stopInboxWatch = () => {};
  let stopScriptsWatch = () => {};
  if (args.watch) {
    stopInboxWatch = watchInbox((jobs) => {
      for (const job of jobs) {
        console.log(`[inbox] ingested ${job.jobId} (${job.scriptTitle})`);
      }
    });
    stopScriptsWatch = watchScripts((scriptIds) => {
      for (const scriptId of scriptIds) {
        console.log(`[scripts] animation.md changed ${scriptId}`);
      }
    });
  }

  const shutdown = () => {
    stopInboxWatch();
    stopScriptsWatch();
    api.close();
    Deno.exit(0);
  };
  Deno.addSignalListener('SIGINT', shutdown);
  Deno.addSignalListener('SIGTERM', shutdown);

  await new Promise(() => {});
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    Deno.exit(1);
  });
}
