import path from 'node:path';

import type { TakeManifest } from '../../ios-teleprompter/src/scriptSchema.ts';
import { recordInboxIngest } from './inbox-status.ts';
import { fileExists, readJson } from './fs_util.ts';
import { createJobFromTake, jobExistsForTake, saveJob } from './job-store.ts';
import { ensureDir, INBOX_DIR, listInboxDirs, takeDir } from './paths.ts';
import { runDefaultPipeline } from './queue.ts';
import type { OutdoorJob } from './schema.ts';
import { appendTakeAgentLog } from './stage-run-log.ts';

type IngestOptions = {
  autoRun?: boolean;
};

function findInboxVideo(inboxDir: string, takeId: string): string | null {
  for (const ext of ['.mp4', '.webm', '.mov', '.MP4']) {
    const candidate = path.join(inboxDir, `${takeId}${ext}`);
    if (fileExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function ingestInboxPair(
  takeId: string,
  inboxDir: string,
  options: IngestOptions = {},
): OutdoorJob | null {
  const videoPath = findInboxVideo(inboxDir, takeId);
  const manifestPath = path.join(inboxDir, `${takeId}.json`);
  if (!videoPath || !fileExists(manifestPath)) {
    return null;
  }
  if (jobExistsForTake(takeId)) {
    return null;
  }

  const take = readJson<TakeManifest>(manifestPath);
  const job = createJobFromTake({
    takeId,
    scriptId: take.scriptId,
    scriptTitle: take.scriptTitle ?? take.scriptId,
    videoPath,
    takeManifestPath: manifestPath,
  });
  job.autoRun = options.autoRun !== false;
  saveJob(job);

  recordInboxIngest({
    takeId,
    inboxDir,
    videoPath,
    manifestPath,
    scriptId: job.scriptId,
    scriptTitle: job.scriptTitle,
    jobId: job.jobId,
    takeDir: takeDir(job.scriptId, job.takeId),
  });
  appendTakeAgentLog(
    job.scriptId,
    job.takeId,
    `ingested from ${inboxDir} → job ${job.jobId} (autoRun=${job.autoRun})`,
  );

  if (job.autoRun) {
    void runDefaultPipeline(job.jobId).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      appendTakeAgentLog(job.scriptId, job.takeId, `pipeline failed: ${message}`);
      console.error(`[inbox] pipeline failed for ${job.jobId}:`, error);
    });
  }

  return job;
}

export function scanInbox(): OutdoorJob[] {
  const ingested: OutdoorJob[] = [];
  for (const inboxDir of listInboxDirs()) {
    ensureDir(inboxDir);
    const names = [...Deno.readDirSync(inboxDir)].map((entry) => entry.name);
    const takeIds = new Set(
      names
        .filter((name) => /\.(mp4|webm|mov)$/i.test(name))
        .map((name) => name.replace(/\.(mp4|webm|mov)$/i, '')),
    );
    for (const takeId of takeIds) {
      const job = ingestInboxPair(takeId, inboxDir);
      if (job) {
        ingested.push(job);
      }
    }
  }
  return ingested;
}

const ICLOUD_RESCAN_MS = 30_000;

export function watchInbox(onIngest?: (jobs: OutdoorJob[]) => void): () => void {
  ensureDir(INBOX_DIR);
  const pending = new Map<string, ReturnType<typeof setTimeout>>();
  const watchers: Deno.FsWatcher[] = [];

  const schedule = (inboxDir: string, takeId: string) => {
    const key = `${inboxDir}:${takeId}`;
    if (pending.has(key)) {
      return;
    }
    const timer = setTimeout(() => {
      pending.delete(key);
      const job = ingestInboxPair(takeId, inboxDir);
      if (job) {
        onIngest?.([job]);
      }
    }, 400);
    pending.set(key, timer);
  };

  const notifyIngested = (jobs: OutdoorJob[]) => {
    for (const job of jobs) {
      onIngest?.([job]);
    }
  };

  notifyIngested(scanInbox());

  // iCloud Drive often misses fs watch events — poll for new flat inbox pairs.
  const rescanTimer = setInterval(() => {
    notifyIngested(scanInbox());
  }, ICLOUD_RESCAN_MS);

  for (const inboxDir of listInboxDirs()) {
    ensureDir(inboxDir);
    const watcher = Deno.watchFs(inboxDir);
    watchers.push(watcher);
    const watchLoop = (async () => {
      try {
        for await (const event of watcher) {
          for (const eventPath of event.paths) {
            const fileName = path.basename(eventPath);
            if (/\.(mp4|webm|mov|json)$/i.test(fileName)) {
              schedule(inboxDir, fileName.replace(/\.(mp4|webm|mov|json)$/i, ''));
            }
          }
        }
      } catch {
        // watcher closed
      }
    })();
    void watchLoop;
  }

  return () => {
    clearInterval(rescanTimer);
    for (const watcher of watchers) {
      watcher.close();
    }
    for (const timer of pending.values()) {
      clearTimeout(timer);
    }
    pending.clear();
  };
}
