import { copyTakeToIcloudInbox, isIcloudInboxAvailable } from 'outdoor-icloud-inbox';

import { exportTakeToIcloudFolder } from './exportInbox';
import type { TakeManifest } from './scriptSchema';
import {
  markTakeQueued,
  markTakeSynced,
  persistTakeLocally,
} from './takePersistence';
import { enqueueTakeSync, flushUploadQueue } from './uploadQueue';

export type ProcessTakeResult = {
  method: 'icloud' | 'agent' | 'manual' | 'queued';
  message: string;
};

export {
  persistTakeLocally,
  resolveTakeVideoUri,
  markTakeSynced,
} from './takePersistence';

async function keepTakeAndQueue(take: TakeManifest): Promise<TakeManifest> {
  const saved = await persistTakeLocally(take);
  await enqueueTakeSync(saved.takeId);
  return (await markTakeQueued(saved.takeId)) ?? { ...saved, syncStatus: 'queued' };
}

/** Dev build: silent iCloud write, or agent upload if Mac is online. */
export async function processTakeForWorkflow(take: TakeManifest): Promise<ProcessTakeResult> {
  const saved = await keepTakeAndQueue(take);

  if (await isIcloudInboxAvailable()) {
    try {
      await copyTakeToIcloudInbox(saved);
      await markTakeSynced(saved.takeId, 'exported');
      return {
        method: 'icloud',
        message:
          'Saved to iCloud. You can close the app — your Mac will pick up the take when iCloud syncs.',
      };
    } catch {
      // Keep queued local copy / Photos reference and try agent upload.
    }
  }

  const upload = await flushUploadQueue();
  if (upload.synced.includes(saved.takeId)) {
    return {
      method: 'agent',
      message: 'Uploaded to your Mac agent. Processing will start automatically.',
    };
  }

  return {
    method: 'queued',
    message:
      `Take kept on this iPhone (${saved.takeId}). JSON + video are local` +
      (saved.photoLibraryHint ? `; Photos: ${saved.photoLibraryHint}` : '') +
      '. It will auto-upload when your Mac agent is online again.',
  };
}

/** Save take locally first; iCloud folder/share is best-effort on top. */
export async function exportTakeToIcloudWorkflow(take: TakeManifest): Promise<{
  saved: TakeManifest;
  exported: boolean;
  message: string;
}> {
  const saved = await keepTakeAndQueue(take);

  if (await isIcloudInboxAvailable()) {
    try {
      await copyTakeToIcloudInbox(saved);
      await markTakeSynced(saved.takeId, 'exported');
      return {
        saved,
        exported: true,
        message:
          'Saved to iCloud inbox. Your Mac agent will pick it up when iCloud syncs.',
      };
    } catch {
      // fall through to folder/share
    }
  }

  try {
    await exportTakeToIcloudFolder(saved);
    await markTakeSynced(saved.takeId, 'exported');
    return {
      saved,
      exported: true,
      message: 'Exported to iCloud. Local JSON is also kept for auto-upload backup.',
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'iCloud write failed';
    return {
      saved,
      exported: false,
      message:
        `${detail}\n\nTake JSON is still saved on this phone (${saved.takeId})` +
        (saved.photoLibraryHint ? `\nPhotos tip: ${saved.photoLibraryHint}` : '') +
        '\nIt will auto-upload to your Mac when the agent is online again.',
    };
  }
}
