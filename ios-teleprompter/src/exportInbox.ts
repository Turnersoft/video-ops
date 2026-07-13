import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

import {
  clearSessionInboxFolder,
  copyTakeToLinkedInbox,
  ensureLinkedInboxFolder,
  getLinkedInboxLabel,
  ICLOUD_INBOX_FOLDER,
  pickAndLinkInboxFolder,
} from './icloudInboxFolder';
import type { TakeManifest } from './scriptSchema';

const EXPORT_ROOT = `${FileSystem.cacheDirectory ?? ''}turn-outdoor-inbox-export/`;

export { ICLOUD_INBOX_FOLDER, ensureLinkedInboxFolder, getLinkedInboxLabel };

async function ensureExportDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(EXPORT_ROOT);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(EXPORT_ROOT, { intermediates: true });
  }
}

/** Agent inbox file names: `{takeId}.json` + `{takeId}.mp4` */
export async function prepareInboxExport(
  take: TakeManifest,
): Promise<{ jsonUri: string; videoUri: string }> {
  await ensureExportDir();
  const jsonUri = `${EXPORT_ROOT}${take.takeId}.json`;
  const videoUri = `${EXPORT_ROOT}${take.takeId}.mp4`;
  await FileSystem.writeAsStringAsync(jsonUri, `${JSON.stringify(take, null, 2)}\n`);
  await FileSystem.copyAsync({ from: take.videoUri, to: videoUri });
  return { jsonUri, videoUri };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function exportViaShareSheet(take: TakeManifest): Promise<void> {
  const { jsonUri, videoUri } = await prepareInboxExport(take);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  await new Promise<void>((resolve) => {
    Alert.alert(
      'Export to iCloud',
      `Save BOTH files to:\n\n${ICLOUD_INBOX_FOLDER}\n\nStep 1: video (${take.takeId}.mp4)\nChoose Save to Files → browse to that folder.`,
      [{ text: 'Continue', onPress: () => resolve() }],
    );
  });

  await Sharing.shareAsync(videoUri, {
    mimeType: 'video/mp4',
    dialogTitle: `Save ${take.takeId}.mp4`,
    UTI: 'public.mpeg-4',
  });

  await sleep(400);

  await new Promise<void>((resolve) => {
    Alert.alert(
      'Step 2 of 2',
      `Now save the metadata JSON (${take.takeId}.json) to the same folder:\n\n${ICLOUD_INBOX_FOLDER}`,
      [{ text: 'Continue', onPress: () => resolve() }],
    );
  });

  await Sharing.shareAsync(jsonUri, {
    mimeType: 'application/json',
    dialogTitle: `Save ${take.takeId}.json`,
    UTI: 'public.json',
  });
}

/**
 * Prefer direct copy into a linked iCloud folder (folder picker, auto-creates TurnOutdoor/inbox).
 * Falls back to the share sheet if folder access fails.
 */
export async function exportTakeToIcloudFolder(take: TakeManifest): Promise<void> {
  const jsonBody = `${JSON.stringify(take, null, 2)}\n`;

  try {
    await copyTakeToLinkedInbox(take.takeId, take.videoUri, jsonBody);
    const label = (await getLinkedInboxLabel()) ?? ICLOUD_INBOX_FOLDER;
    Alert.alert(
      'Exported to iCloud',
      `Saved ${take.takeId}.mp4 and ${take.takeId}.json to:\n${label}\n\nTake id: ${take.takeId}\nScript: ${take.scriptId}\nVideo file: ${take.takeId}.mp4\n\nYour Mac agent watches that folder and moves the pair into:\nscripts/.../takes/${take.takeId}/\n\nOpen http://127.0.0.1:8788/ on the Mac to confirm the picked filepath.`,
    );
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Folder export failed';
    if (message.toLowerCase().includes('cancel')) {
      throw error;
    }

    const retry = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Could not write to iCloud folder',
        `${message}\n\nPick TurnOutdoor/inbox (not iCloud Drive root), or use the share sheet.`,
        [
          { text: 'Choose folder', onPress: () => resolve(true) },
          { text: 'Share sheet', onPress: () => resolve(false) },
        ],
      );
    });

    if (retry) {
      clearSessionInboxFolder();
      await pickAndLinkInboxFolder();
      await copyTakeToLinkedInbox(take.takeId, take.videoUri, jsonBody);
      Alert.alert(
        'Exported to iCloud',
        `Saved ${take.takeId}.mp4 and .json. Your Mac agent ingests when iCloud syncs.`,
      );
      return;
    }
  }

  await exportViaShareSheet(take);
  Alert.alert(
    'Export started',
    `When both files appear in ${ICLOUD_INBOX_FOLDER} on your Mac, the outdoor agent ingests them automatically.`,
  );
}

/** One-time setup from Settings — opens the folder picker. */
export async function linkIcloudInboxFolder(): Promise<void> {
  const inbox = await pickAndLinkInboxFolder();
  Alert.alert(
    'Inbox folder linked',
    `Takes will export to:\n${inbox.uri}\n\niOS may ask you to pick this folder again after closing the app.`,
  );
}

/** @deprecated Use exportTakeToIcloudFolder */
export async function shareTakeToICloud(take: TakeManifest): Promise<void> {
  await exportTakeToIcloudFolder(take);
}
