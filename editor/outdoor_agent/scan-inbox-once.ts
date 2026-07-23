import { scanInbox } from './src/inbox-watcher.ts';
import { listInboxDirs } from './src/paths.ts';
import { runDefaultPipeline } from './src/queue.ts';

console.log('[scan] watching inboxes:');
for (const dir of listInboxDirs()) {
  console.log(`  - ${dir}`);
}

const jobs = scanInbox();
console.log(`[scan] ingested ${jobs.length} job(s)`);
for (const job of jobs) {
  console.log(`  - ${job.jobId} (${job.scriptTitle})`);
  if (job.autoRun) {
    console.log(`[scan] starting pipeline for ${job.jobId}…`);
    await runDefaultPipeline(job.jobId);
    console.log(`[scan] pipeline complete for ${job.jobId}`);
  }
}
