import { loadJob } from './src/job-store.ts';
import { runStage } from './src/queue.ts';

const jobId = 'job-take-mrbtjdup';

const job = loadJob(jobId);
if (!job) {
  console.error(`Job not found: ${jobId}`);
  Deno.exit(1);
}

console.log(`[regenerate] ${job.scriptTitle} (${job.takeId})`);

console.log('[regenerate] align (ASR, sentence captions)…');
await runStage(jobId, 'align', { rerun: true, options: { mode: 'asr' } });

console.log('[regenerate] composite (portrait + landscape)…');
await runStage(jobId, 'composite', { rerun: true });

console.log('[regenerate] social pack…');
await runStage(jobId, 'social', { rerun: true });

console.log('[regenerate] done');
