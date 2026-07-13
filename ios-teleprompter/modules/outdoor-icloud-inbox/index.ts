import { requireNativeModule } from 'expo-modules-core';

import type { TakeManifest } from '../../src/scriptSchema';

export type IcloudInboxCopyResult = {
  inboxPath: string;
  videoPath: string;
  jsonPath: string;
};

type OutdoorIcloudInboxModule = {
  isAvailable(): Promise<boolean>;
  copyTakeToInbox(videoUri: string, jsonBody: string, takeId: string): Promise<IcloudInboxCopyResult>;
};

let nativeModule: OutdoorIcloudInboxModule | null | undefined;

function getNativeModule(): OutdoorIcloudInboxModule | null {
  if (nativeModule !== undefined) {
    return nativeModule;
  }
  try {
    nativeModule = requireNativeModule<OutdoorIcloudInboxModule>('OutdoorIcloudInbox');
  } catch {
    nativeModule = null;
  }
  return nativeModule;
}

export async function isIcloudInboxAvailable(): Promise<boolean> {
  const native = getNativeModule();
  if (!native) {
    return false;
  }
  try {
    return await native.isAvailable();
  } catch {
    return false;
  }
}

export async function copyTakeToIcloudInbox(take: TakeManifest): Promise<IcloudInboxCopyResult> {
  const native = getNativeModule();
  if (!native) {
    throw new Error(
      'Background iCloud sync needs the Turn Outdoor dev build (not Expo Go). Run: npm run build:ios:device',
    );
  }
  const jsonBody = `${JSON.stringify(take, null, 2)}\n`;
  return native.copyTakeToInbox(take.videoUri, jsonBody, take.takeId);
}
