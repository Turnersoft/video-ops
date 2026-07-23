import * as FileSystem from 'expo-file-system/legacy';
import { Directory, File } from 'expo-file-system';
import { Alert } from 'react-native';

/** Folder path shown in UI; Mac agent watches the synced copy of this folder. */
export const ICLOUD_INBOX_FOLDER = 'iCloud Drive → TurnOutdoor → inbox';

const SETTINGS_PATH = `${FileSystem.documentDirectory ?? ''}turn-outdoor-teleprompter/icloud-inbox-settings.json`;

type IcloudInboxSettings = {
  inboxUri?: string;
  inboxLabel?: string;
};

let sessionInboxDir: Directory | null = null;

function isDirectory(entry: Directory | File): entry is Directory {
  return entry instanceof Directory;
}

function findChildDir(parent: Directory, name: string): Directory | null {
  for (const entry of parent.list()) {
    if (isDirectory(entry) && entry.name === name) {
      return entry;
    }
  }
  return null;
}

/**
 * Prefer `new Directory(parent, name).create()` —
 * `Directory.createDirectory` / `createFile` break under Metro/babel on SharedObjects
 * (`createFile is not a function`).
 */
function ensureChildDirectory(parent: Directory, name: string): Directory {
  const existing = findChildDir(parent, name);
  if (existing) {
    return existing;
  }
  const child = new Directory(parent, name);
  if (!child.exists) {
    child.create({ intermediates: true, idempotent: true });
  }
  return child;
}

async function readSettings(): Promise<IcloudInboxSettings> {
  try {
    const raw = await FileSystem.readAsStringAsync(SETTINGS_PATH);
    return JSON.parse(raw) as IcloudInboxSettings;
  } catch {
    return {};
  }
}

async function writeSettings(settings: IcloudInboxSettings): Promise<void> {
  const dir = `${FileSystem.documentDirectory ?? ''}turn-outdoor-teleprompter/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  await FileSystem.writeAsStringAsync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export async function getLinkedInboxLabel(): Promise<string | null> {
  const settings = await readSettings();
  return settings.inboxLabel ?? null;
}

export function clearSessionInboxFolder(): void {
  sessionInboxDir = null;
}

/**
 * Resolve the inbox folder from what the user picked in the document picker.
 * iOS only grants write access inside the picked folder — we cannot create TurnOutdoor at iCloud Drive root.
 */
export function resolveInboxDirectory(picked: Directory): Directory {
  if (picked.name === 'inbox') {
    return picked;
  }

  if (picked.name === 'TurnOutdoor') {
    return ensureChildDirectory(picked, 'inbox');
  }

  const turnOutdoor = findChildDir(picked, 'TurnOutdoor');
  if (turnOutdoor) {
    return ensureChildDirectory(turnOutdoor, 'inbox');
  }

  throw new Error(
    `Could not find TurnOutdoor/inbox. Open Files → iCloud Drive → TurnOutdoor → inbox and select that folder. ` +
      `On Mac run: bash bin/setup-icloud-inbox.sh`,
  );
}

async function confirmFolderPicker(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      'Choose iCloud inbox folder',
      `Select the inbox folder directly:\n\n${ICLOUD_INBOX_FOLDER}\n\n` +
        `Or select the TurnOutdoor folder — the app can create inbox inside it.\n\n` +
        `Do not pick iCloud Drive itself. iOS only keeps folder access until you close the app.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Open picker', onPress: () => resolve(true) },
      ],
    );
  });
}

export async function pickAndLinkInboxFolder(initialUri?: string): Promise<Directory> {
  const confirmed = await confirmFolderPicker();
  if (!confirmed) {
    throw new Error('Folder selection cancelled.');
  }

  let picked;
  try {
    picked = await Directory.pickDirectoryAsync(initialUri);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Folder picker failed';
    if (message.toLowerCase().includes('cancel')) {
      throw new Error('Folder selection cancelled.');
    }
    throw new Error(`Could not open folder picker: ${message}`);
  }

  const inbox = resolveInboxDirectory(new Directory(picked.uri));
  if (!inbox.exists) {
    throw new Error('Selected inbox folder is not accessible. Pick TurnOutdoor/inbox again.');
  }
  sessionInboxDir = inbox;

  const label = inbox.name === 'inbox' ? ICLOUD_INBOX_FOLDER : inbox.uri;
  await writeSettings({ inboxUri: inbox.uri, inboxLabel: label });
  return inbox;
}

export async function ensureLinkedInboxFolder(forceRepick = false): Promise<Directory> {
  if (!forceRepick && sessionInboxDir) {
    try {
      if (sessionInboxDir.exists) {
        return sessionInboxDir;
      }
    } catch {
      sessionInboxDir = null;
    }
  }

  const settings = await readSettings();
  return pickAndLinkInboxFolder(forceRepick ? undefined : settings.inboxUri);
}

function writeFileReplacing(inbox: Directory, name: string, content: string | Uint8Array): void {
  const dest = new File(inbox, name);
  if (dest.exists) {
    dest.delete();
  }
  dest.create({ intermediates: true, overwrite: true });
  dest.write(content);
}

export async function copyTakeToLinkedInbox(
  takeId: string,
  videoUri: string,
  jsonBody: string,
): Promise<Directory> {
  const inbox = await ensureLinkedInboxFolder();
  const srcVideo = new File(videoUri);
  if (!srcVideo.exists) {
    throw new Error('Recorded video file is missing. Retake and try export again.');
  }

  const videoDest = new File(inbox, `${takeId}.mp4`);
  if (videoDest.exists) {
    videoDest.delete();
  }
  try {
    srcVideo.copy(videoDest);
  } catch {
    // Security-scoped iCloud folders sometimes reject copy; fall back to bytes write.
    const videoBytes = await srcVideo.bytes();
    writeFileReplacing(inbox, `${takeId}.mp4`, videoBytes);
  }
  writeFileReplacing(inbox, `${takeId}.json`, jsonBody);
  return inbox;
}
