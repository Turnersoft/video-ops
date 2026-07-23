import * as FileSystem from 'expo-file-system/legacy';
import { AppState } from 'react-native';

import { checkAgentHealth, uploadTakeToAgent } from './agentClient';
import { markTakeSynced, resolveTakeVideoUri } from './takePersistence';
import type { TakeManifest } from './scriptSchema';
import { getTake, saveTakeManifest } from './storage';

const QUEUE_PATH = `${FileSystem.documentDirectory ?? ''}turn-outdoor-teleprompter/upload-queue.json`;

type UploadQueue = {
  pendingTakeIds: string[];
  syncedTakeIds: string[];
};

async function readQueue(): Promise<UploadQueue> {
  try {
    const raw = await FileSystem.readAsStringAsync(QUEUE_PATH);
    const parsed = JSON.parse(raw) as UploadQueue;
    return {
      pendingTakeIds: parsed.pendingTakeIds ?? [],
      syncedTakeIds: parsed.syncedTakeIds ?? [],
    };
  } catch {
    return { pendingTakeIds: [], syncedTakeIds: [] };
  }
}

async function writeQueue(queue: UploadQueue): Promise<void> {
  await FileSystem.writeAsStringAsync(QUEUE_PATH, JSON.stringify(queue, null, 2));
}

export async function enqueueTakeSync(takeId: string): Promise<void> {
  const queue = await readQueue();
  if (queue.syncedTakeIds.includes(takeId) || queue.pendingTakeIds.includes(takeId)) {
    return;
  }
  queue.pendingTakeIds.push(takeId);
  await writeQueue(queue);
}

export async function flushUploadQueue(
  onJob?: (jobId: string) => void,
): Promise<{ synced: string[]; failed: string[] }> {
  const queue = await readQueue();
  if (!queue.pendingTakeIds.length) {
    return { synced: [], failed: [] };
  }
  if (!(await checkAgentHealth())) {
    return { synced: [], failed: [...queue.pendingTakeIds] };
  }

  const synced: string[] = [];
  const failed: string[] = [];
  const remaining: string[] = [];

  for (const takeId of queue.pendingTakeIds) {
    const take = await getTake(takeId);
    if (!take) {
      continue;
    }
    try {
      const videoUri = await resolveTakeVideoUri(take);
      if (!videoUri) {
        failed.push(takeId);
        remaining.push(takeId);
        continue;
      }
      const uploadTake: TakeManifest =
        videoUri === take.videoUri ? take : { ...take, videoUri };
      if (uploadTake.videoUri !== take.videoUri) {
        await saveTakeManifest(uploadTake);
      }
      const result = await uploadTakeToAgent(uploadTake);
      synced.push(takeId);
      queue.syncedTakeIds.push(takeId);
      await markTakeSynced(takeId, 'synced');
      onJob?.(result.jobId);
    } catch {
      failed.push(takeId);
      remaining.push(takeId);
    }
  }

  queue.pendingTakeIds = remaining;
  await writeQueue(queue);
  return { synced, failed };
}

export function startUploadQueue(onJob?: (jobId: string) => void): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = () => {
    void flushUploadQueue(onJob);
  };

  tick();
  timer = setInterval(tick, 30_000);

  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      tick();
    }
  });

  return () => {
    if (timer) {
      clearInterval(timer);
    }
    subscription.remove();
  };
}
