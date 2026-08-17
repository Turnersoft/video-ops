import { homedir } from "node:os";
import { join } from "node:path";

export function cursorRoot(): string {
  return join(homedir(), "Library", "Application Support", "Cursor");
}

export function cursorProjectsRoot(): string {
  return join(homedir(), ".cursor", "projects");
}

export function conversationSearchDb(): string {
  return join(cursorRoot(), "User", "globalStorage", "conversation-search.db");
}

export function globalStateDb(): string {
  return join(cursorRoot(), "User", "globalStorage", "state.vscdb");
}

export function workspaceStorageRoot(): string {
  return join(cursorRoot(), "User", "workspaceStorage");
}
