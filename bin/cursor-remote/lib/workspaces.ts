import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { loadJsonLenient } from "./json.ts";
import { workspaceStorageRoot } from "./paths.ts";

export type WorkspaceInfo = {
  id: string;
  name: string;
  rootPath: string;
  folderUris: string[];
  mtimeMs: number;
};

function workspaceDisplayName(uri: string): string {
  const name = decodeURIComponent(uri.split("/").pop() ?? "");
  if (name.endsWith(".code-workspace")) {
    return name.replace(".code-workspace", "");
  }
  return name;
}

function folderEntriesToUris(
  folders: Array<{ path?: string }>,
  baseDir: string,
): string[] {
  const out: string[] = [];
  for (const entry of folders) {
    const raw = entry.path?.trim();
    if (!raw) continue;
    if (raw.startsWith("file://")) {
      out.push(raw);
    } else if (raw.startsWith("/")) {
      out.push(`file://${raw}`);
    } else {
      out.push(`file://${join(baseDir, raw)}`);
    }
  }
  return out;
}

async function resolveWorkspaceFolders(wsJsonPath: string): Promise<{
  display: string;
  rootPath: string;
  folderUris: string[];
}> {
  const text = await readFile(wsJsonPath, "utf8");
  const data = loadJsonLenient(text) as Record<string, unknown>;
  const uri = String(data.workspace ?? data.folder ?? "");
  const wsPath = wsJsonPath;

  if (Array.isArray(data.folders)) {
    const baseDir = wsPath.replace(/\/[^/]+$/, "");
    let display: string;
    if (basename(wsPath).endsWith(".code-workspace")) {
      display = basename(wsPath).replace(".code-workspace", "");
    } else if (basename(wsPath) === "workspace.json") {
      const folderUrisEarly = folderEntriesToUris(
        data.folders as Array<{ path?: string }>,
        baseDir,
      );
      display = folderUrisEarly.length === 1
        ? workspaceDisplayName(folderUrisEarly[0])
        : "workspace.json";
    } else if (uri) {
      display = workspaceDisplayName(uri);
    } else {
      display = basename(wsPath, ".json");
    }
    const folderUris = folderEntriesToUris(
      data.folders as Array<{ path?: string }>,
      baseDir,
    );
    const rootPath = folderUris[0]
      ? decodeURIComponent(folderUris[0].replace("file://", ""))
      : "";
    return { display, rootPath, folderUris };
  }

  if (uri.endsWith(".code-workspace") || uri.endsWith("workspace.json")) {
    const target = decodeURIComponent(uri.replace("file://", ""));
    const st = await stat(target).catch(() => null);
    if (st?.isFile()) {
      return resolveWorkspaceFolders(target);
    }
  }

  const folderUris = uri
    ? [uri.startsWith("file://") ? uri : `file://${uri}`]
    : [];
  const display = uri ? workspaceDisplayName(uri) : basename(wsPath);
  const rootPath = folderUris[0]
    ? decodeURIComponent(folderUris[0].replace("file://", ""))
    : "";
  return { display, rootPath, folderUris };
}

export function uriToProjectSlug(uri: string): string {
  const path = decodeURIComponent(uri.replace("file://", ""));
  let slug = path.split("/").filter(Boolean).join("-").replaceAll("_", "-");
  if (slug.endsWith(".code-workspace")) {
    slug = slug.replace(".code-workspace", "-code-workspace");
  }
  return slug;
}

export async function discoverWorkspaces(limit = 20): Promise<WorkspaceInfo[]> {
  const root = workspaceStorageRoot();
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const rows: WorkspaceInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const id = entry.name;
    const db = join(root, id, "state.vscdb");
    const wj = join(root, id, "workspace.json");
    try {
      const dbStat = await stat(db);
      const { display, rootPath, folderUris } = await resolveWorkspaceFolders(wj);
      rows.push({
        id,
        name: display,
        rootPath,
        folderUris,
        mtimeMs: dbStat.mtimeMs,
      });
    } catch {
      // skip invalid workspace
    }
  }

  rows.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return rows.slice(0, limit);
}
