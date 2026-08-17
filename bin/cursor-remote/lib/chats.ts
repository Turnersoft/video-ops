import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  conversationSearchDb,
  cursorProjectsRoot,
  globalStateDb,
  workspaceStorageRoot,
} from "./paths.ts";
import { uriToProjectSlug } from "./workspaces.ts";
import type { WorkspaceInfo } from "./workspaces.ts";

export type ChatSummary = {
  sessionId: string;
  title: string;
  updatedAt: number;
  messageCount: number;
  jsonlPath: string;
  slug: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  tools?: string[];
};

type ChatMeta = { title: string; updatedAt: number };

let conversationMeta: Map<string, ChatMeta> | null = null;
const composerMetaCache = new Map<string, ChatMeta>();

async function querySqliteJson(dbPath: string, sql: string): Promise<unknown[]> {
  try {
    const cmd = new Deno.Command("sqlite3", {
      args: ["-json", `file:${dbPath}?mode=ro`, sql],
      stdout: "piped",
      stderr: "null",
    });
    const { code, stdout } = await cmd.output();
    if (code !== 0) return [];
    const text = new TextDecoder().decode(stdout).trim();
    if (!text) return [];
    return JSON.parse(text) as unknown[];
  } catch {
    return [];
  }
}

async function loadConversationMeta(): Promise<Map<string, ChatMeta>> {
  if (conversationMeta) return conversationMeta;
  const meta = new Map<string, ChatMeta>();
  const rows = await querySqliteJson(
    conversationSearchDb(),
    "SELECT id, title, updated_at as updatedAt FROM conversations WHERE is_archived = 0",
  ) as Array<{ id: string; title: string | null; updatedAt: number | null }>;
  for (const row of rows) {
    if (!row.title) continue;
    meta.set(row.id, { title: row.title, updatedAt: row.updatedAt ?? 0 });
  }
  conversationMeta = meta;
  return meta;
}

async function lookupComposerMeta(sessionId: string): Promise<ChatMeta | null> {
  const cached = composerMetaCache.get(sessionId);
  if (cached) return cached;

  const rows = await querySqliteJson(
    globalStateDb(),
    `SELECT json_extract(value, '$.name') as title,
            COALESCE(
              json_extract(value, '$.conversationCheckpointLastUpdatedAt'),
              json_extract(value, '$.createdAt')
            ) as updatedAt
     FROM cursorDiskKV
     WHERE key = 'composerData:${sessionId}'`,
  ) as Array<{ title: string | null; updatedAt: number | null }>;

  const title = rows[0]?.title?.trim();
  if (!title) return null;

  const meta = { title, updatedAt: rows[0]?.updatedAt ?? 0 };
  composerMetaCache.set(sessionId, meta);
  return meta;
}

async function loadWorkspaceComposerIds(workspaceId: string): Promise<string[]> {
  const dbPath = join(workspaceStorageRoot(), workspaceId, "state.vscdb");
  const rows = await querySqliteJson(
    dbPath,
    `SELECT json_extract(value, '$.selectedComposerIds') as selected,
            json_extract(value, '$.lastFocusedComposerIds') as focused
     FROM ItemTable
     WHERE key = 'composer.composerData'`,
  ) as Array<{ selected: string | null; focused: string | null }>;

  const ids = new Set<string>();
  for (const row of rows) {
    for (const raw of [row.selected, row.focused]) {
      if (!raw) continue;
      try {
        for (const id of JSON.parse(raw) as string[]) {
          if (id) ids.add(id);
        }
      } catch {
        // skip malformed JSON
      }
    }
  }
  return [...ids];
}

async function findJsonlPath(
  sessionId: string,
  slugs: string[],
): Promise<{ jsonlPath: string; slug: string; mtimeMs: number } | null> {
  for (const slug of slugs) {
    const jsonl = join(
      cursorProjectsRoot(),
      slug,
      "agent-transcripts",
      sessionId,
      `${sessionId}.jsonl`,
    );
    try {
      const st = await stat(jsonl);
      return { jsonlPath: jsonl, slug, mtimeMs: st.mtimeMs };
    } catch {
      // not in this slug
    }
  }
  return null;
}

function truncateTitle(text: string, max = 80): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return oneLine.slice(0, max - 1) + "…";
}

async function titleFromFirstUserMessage(jsonlPath: string): Promise<string> {
  try {
    const raw = await readFile(jsonlPath, "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      let obj: Record<string, unknown>;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      if (obj.role !== "user") continue;
      const turn = parseRawTurn(obj);
      if (turn?.text) return truncateTitle(turn.text);
    }
  } catch {
    // ignore
  }
  return "";
}

async function resolveChatTitle(
  sessionId: string,
  jsonlPath?: string,
): Promise<string> {
  const fromComposer = await lookupComposerMeta(sessionId);
  if (fromComposer?.title) return fromComposer.title;

  const conversations = await loadConversationMeta();
  const fromConversation = conversations.get(sessionId);
  if (fromConversation?.title) return fromConversation.title;

  if (jsonlPath) {
    const fromFirstUser = await titleFromFirstUserMessage(jsonlPath);
    if (fromFirstUser) return fromFirstUser;
  }

  return sessionId.slice(0, 8);
}

async function resolveChatUpdatedAt(
  sessionId: string,
  fileMtimeMs: number,
): Promise<number> {
  const composer = await lookupComposerMeta(sessionId);
  const conversations = await loadConversationMeta();
  return Math.max(
    composer?.updatedAt ?? 0,
    conversations.get(sessionId)?.updatedAt ?? 0,
    fileMtimeMs,
  );
}

async function buildChatSummary(
  sessionId: string,
  slugs: string[],
): Promise<ChatSummary | null> {
  const jsonlInfo = await findJsonlPath(sessionId, slugs);
  const composer = await lookupComposerMeta(sessionId);
  const conversations = await loadConversationMeta();

  if (!jsonlInfo && !composer && !conversations.has(sessionId)) {
    return null;
  }

  const jsonlPath = jsonlInfo?.jsonlPath ?? "";
  const slug = jsonlInfo?.slug ?? slugs[0] ?? "";
  const title = await resolveChatTitle(sessionId, jsonlPath || undefined);
  const updatedAt = await resolveChatUpdatedAt(
    sessionId,
    jsonlInfo ? Math.floor(jsonlInfo.mtimeMs) : 0,
  );
  const messageCount = jsonlPath
    ? (await loadTranscriptMessages(jsonlPath)).length
    : 0;

  return {
    sessionId,
    title,
    updatedAt,
    messageCount,
    jsonlPath,
    slug,
  };
}

export type ChatMessagesPage = {
  messages: ChatMessage[];
  total: number;
  hasMore: boolean;
  before: number;
};

export async function listWorkspaceChats(
  workspace: WorkspaceInfo,
  limit: number,
  offset: number,
): Promise<{ chats: ChatSummary[]; total: number }> {
  const slugs = [...new Set(workspace.folderUris.map(uriToProjectSlug))];
  const workspaceComposerIds = await loadWorkspaceComposerIds(workspace.id);
  const all: ChatSummary[] = [];

  for (const sessionId of workspaceComposerIds) {
    const summary = await buildChatSummary(sessionId, slugs);
    if (summary) all.push(summary);
  }

  all.sort((a, b) => b.updatedAt - a.updatedAt);
  return {
    total: all.length,
    chats: all.slice(offset, offset + limit),
  };
}

function stripUserPrompt(text: string): string {
  const m = text.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/i);
  if (m) return m[1].trim();
  return text
    .replace(/<timestamp>[\s\S]*?<\/timestamp>/gi, "")
    .replace(/<\/?user_query>/gi, "")
    .trim();
}

function cleanUserText(text: string): string {
  return stripUserPrompt(text)
    .replace(/\[REDACTED\]/g, "")
    .replace(/\d+ tool call\(s\) hidden — open in Cursor for full detail/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isSystemUserPrompt(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.startsWith("briefly inform the user about the task result") ||
    lower.includes("perform any follow-up actions (if needed)")
  );
}

function cleanAssistantText(text: string): string {
  return text
    .replace(/\[REDACTED\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type RawTurn = {
  role: "user" | "assistant";
  text: string;
  tools: string[];
};

function parseRawTurn(obj: Record<string, unknown>): RawTurn | null {
  if (obj.type === "turn_ended") return null;
  const role = obj.role;
  if (role !== "user" && role !== "assistant") return null;

  const content = (obj.message as { content?: unknown[] })?.content ?? [];
  const texts: string[] = [];
  const tools: string[] = [];
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    const p = part as Record<string, unknown>;
    if (p.type === "text" && typeof p.text === "string") {
      texts.push(p.text);
    } else if (p.type === "tool_use" && typeof p.name === "string") {
      tools.push(p.name);
    }
  }
  let text = texts.join("\n").trim();
  if (role === "user") {
    text = cleanUserText(text);
    if (!text || isSystemUserPrompt(text)) return null;
  }
  if (!text && tools.length === 0) return null;
  return { role, text, tools };
}

function collapseAssistantTurns(turns: RawTurn[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  let pendingTools: string[] = [];

  const attachPendingTools = () => {
    if (pendingTools.length === 0) return;
    const names = [...new Set(pendingTools)];
    pendingTools = [];
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i].role === "assistant") {
        const existing = out[i].tools ?? [];
        out[i].tools = [...new Set([...existing, ...names])];
        return;
      }
    }
  };

  for (const turn of turns) {
    if (turn.role === "user") {
      attachPendingTools();
      if (turn.text) {
        const last = out[out.length - 1];
        if (!(last?.role === "user" && last.text === turn.text)) {
          out.push({ role: "user", text: turn.text });
        }
      }
      continue;
    }

    pendingTools.push(...turn.tools);
    const meaningfulText = cleanAssistantText(turn.text);
    if (meaningfulText) {
      out.push({
        role: "assistant",
        text: meaningfulText,
        tools: pendingTools.length > 0 ? [...new Set(pendingTools)] : undefined,
      });
      pendingTools = [];
    }
  }

  attachPendingTools();
  return out;
}

function mergeChatMessages(
  composer: ChatMessage[],
  transcript: ChatMessage[],
): ChatMessage[] {
  if (composer.length === 0) return transcript;
  if (transcript.length === 0) return composer;

  const firstTranscriptUser = transcript.find((m) => m.role === "user")?.text;
  if (!firstTranscriptUser) return composer;

  const overlapIdx = composer.findIndex(
    (m) => m.role === "user" && m.text === firstTranscriptUser,
  );
  if (overlapIdx >= 0) {
    const composerTail = composer.slice(overlapIdx);
    let matched = 0;
    for (let i = 0; i < composerTail.length && i < transcript.length; i++) {
      const a = composerTail[i];
      const b = transcript[i];
      if (a.role === b.role && a.text === b.text) {
        matched = i + 1;
      } else {
        break;
      }
    }
    if (matched >= transcript.length) return composer;
    return [...composer, ...transcript.slice(matched)];
  }

  return [...composer, ...transcript];
}

const composerMessagesCache = new Map<string, ChatMessage[]>();
const fullMessagesCache = new Map<string, ChatMessage[]>();

type ComposerSessionCache = {
  headers: Array<{ bubbleId: string; type: number }>;
  headerStart: number;
  bubbles: Map<string, Record<string, unknown>>;
  collapsed: ChatMessage[];
};

const composerSessionCache = new Map<string, ComposerSessionCache>();
const HEADER_BATCH = 500;

export function invalidateComposerCache(sessionId?: string): void {
  if (sessionId) {
    composerMessagesCache.delete(sessionId);
    fullMessagesCache.delete(sessionId);
    composerSessionCache.delete(sessionId);
  } else {
    composerMessagesCache.clear();
    fullMessagesCache.clear();
    composerSessionCache.clear();
  }
}

async function getComposerHeaders(
  sessionId: string,
): Promise<Array<{ bubbleId: string; type: number }>> {
  const rows = await querySqliteJson(
    globalStateDb(),
    `SELECT json_extract(value, '$.fullConversationHeadersOnly') as headers
     FROM cursorDiskKV
     WHERE key = 'composerData:${sessionId}'`,
  ) as Array<{ headers: string | null }>;
  if (!rows[0]?.headers) return [];
  try {
    return JSON.parse(rows[0].headers) as Array<{ bubbleId: string; type: number }>;
  } catch {
    return [];
  }
}

async function fetchBubblesBatch(
  sessionId: string,
  bubbleIds: string[],
  into: Map<string, Record<string, unknown>>,
): Promise<void> {
  const missing = bubbleIds.filter((id) => !into.has(id));
  for (let i = 0; i < missing.length; i += 40) {
    const batch = missing.slice(i, i + 40);
    const keys = batch.map((id) => `'bubbleId:${sessionId}:${id}'`).join(", ");
    const rows = await querySqliteJson(
      globalStateDb(),
      `SELECT key, value FROM cursorDiskKV WHERE key IN (${keys})`,
    ) as Array<{ key: string; value: string }>;
    for (const row of rows) {
      const bubbleId = row.key.split(":").pop();
      if (!bubbleId) continue;
      try {
        into.set(bubbleId, JSON.parse(row.value) as Record<string, unknown>);
      } catch {
        // skip
      }
    }
  }
}

function headersToTurns(
  headers: Array<{ bubbleId: string; type: number }>,
  bubbleById: Map<string, Record<string, unknown>>,
): RawTurn[] {
  const turns: RawTurn[] = [];
  for (const header of headers) {
    const bubble = bubbleById.get(header.bubbleId);
    if (!bubble) continue;
    const bubbleType = bubble.type;
    const role = bubbleType === 1 ? "user" : bubbleType === 2 ? "assistant" : null;
    if (!role) continue;
    let text = typeof bubble.text === "string" ? bubble.text.trim() : "";
    if (role === "user") {
      text = cleanUserText(text);
      if (!text || isSystemUserPrompt(text)) continue;
    } else {
      text = cleanAssistantText(text);
      if (!text) continue;
    }
    turns.push({ role, text, tools: [] });
  }
  return turns;
}

async function ensureComposerRange(
  sessionId: string,
  opts: { minUserPrompts?: number; minMessages?: number },
): Promise<ComposerSessionCache> {
  let cache = composerSessionCache.get(sessionId);
  if (!cache) {
    const headers = await getComposerHeaders(sessionId);
    cache = {
      headers,
      headerStart: headers.length,
      bubbles: new Map(),
      collapsed: [],
    };
    composerSessionCache.set(sessionId, cache);
  }

  while (cache.headerStart > 0) {
    const userCount = userPromptIndices(cache.collapsed).length;
    const okPrompts = !opts.minUserPrompts || userCount >= opts.minUserPrompts;
    const okMessages = !opts.minMessages || cache.collapsed.length >= opts.minMessages;
    if (okPrompts && okMessages) break;

    const nextStart = Math.max(0, cache.headerStart - HEADER_BATCH);
    const slice = cache.headers.slice(nextStart, cache.headerStart);
    await fetchBubblesBatch(
      sessionId,
      slice.map((h) => h.bubbleId),
      cache.bubbles,
    );
    cache.headerStart = nextStart;
    const turns = headersToTurns(
      cache.headers.slice(cache.headerStart),
      cache.bubbles,
    );
    cache.collapsed = collapseAssistantTurns(turns);
  }

  return cache;
}

async function loadComposerMessages(sessionId: string): Promise<ChatMessage[]> {
  const cached = composerMessagesCache.get(sessionId);
  if (cached) return cached;

  const cache = await ensureComposerRange(sessionId, {
    minUserPrompts: Number.MAX_SAFE_INTEGER,
  });
  composerMessagesCache.set(sessionId, cache.collapsed);
  return cache.collapsed;
}

async function loadTranscriptMessages(jsonlPath: string): Promise<ChatMessage[]> {
  const raw = await readFile(jsonlPath, "utf8");
  const turns: RawTurn[] = [];

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    const turn = parseRawTurn(obj);
    if (turn) turns.push(turn);
  }

  return collapseAssistantTurns(turns);
}

export async function loadChatMessages(
  jsonlPath: string,
  sessionId?: string,
): Promise<ChatMessage[]> {
  return getFullChatMessages(jsonlPath, sessionId);
}

function userPromptIndices(messages: ChatMessage[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "user") indices.push(i);
  }
  return indices;
}

export function pageChatMessages(
  messages: ChatMessage[],
  promptCount: number,
  before?: number,
): ChatMessagesPage {
  const end = before ?? messages.length;
  const clampedEnd = Math.max(0, Math.min(end, messages.length));
  const prefix = messages.slice(0, clampedEnd);
  const userIdx = userPromptIndices(prefix);

  if (userIdx.length === 0) {
    return { messages: [], total: messages.length, hasMore: false, before: 0 };
  }

  const startIdx = userIdx.length <= promptCount
    ? 0
    : userIdx[userIdx.length - promptCount];

  return {
    messages: prefix.slice(startIdx, clampedEnd),
    total: messages.length,
    hasMore: startIdx > 0,
    before: startIdx,
  };
}

export async function loadChatMessagesPage(
  jsonlPath: string,
  sessionId: string | undefined,
  promptCount: number,
  before?: number,
): Promise<ChatMessagesPage> {
  let transcript: ChatMessage[] = [];
  if (jsonlPath) {
    try {
      transcript = await loadTranscriptMessages(jsonlPath);
    } catch {
      transcript = [];
    }
  }

  let composer: ChatMessage[] = [];
  let composerHasPrefix = false;
  if (sessionId) {
    const cache = await ensureComposerRange(sessionId, {
      minUserPrompts: before == null ? promptCount + 1 : undefined,
      minMessages: before ?? undefined,
    });
    composer = cache.collapsed;
    composerHasPrefix = cache.headerStart > 0;
  }

  const merged = mergeChatMessages(composer, transcript);
  const page = pageChatMessages(merged, promptCount, before);
  page.hasMore = page.before > 0 || composerHasPrefix;
  return page;
}

async function getFullChatMessages(
  jsonlPath: string,
  sessionId?: string,
): Promise<ChatMessage[]> {
  const cacheKey = sessionId ?? jsonlPath;
  const cached = fullMessagesCache.get(cacheKey);
  if (cached) return cached;

  let transcript: ChatMessage[] = [];
  if (jsonlPath) {
    try {
      transcript = await loadTranscriptMessages(jsonlPath);
    } catch {
      transcript = [];
    }
  }

  const merged = sessionId
    ? mergeChatMessages(await loadComposerMessages(sessionId), transcript)
    : transcript;

  if (cacheKey) fullMessagesCache.set(cacheKey, merged);
  return merged;
}

export async function findChatBySessionId(
  sessionId: string,
): Promise<{ summary: ChatSummary; workspaceHint?: string } | null> {
  const root = cursorProjectsRoot();
  let entries: string[] = [];
  try {
    entries = await readdir(root);
  } catch {
    entries = [];
  }

  const slugs = entries.filter((e) => !e.startsWith("."));
  const jsonlInfo = await findJsonlPath(sessionId, slugs);
  const composer = await lookupComposerMeta(sessionId);
  const conversations = await loadConversationMeta();

  if (!jsonlInfo && !composer && !conversations.has(sessionId)) {
    return null;
  }

  const jsonlPath = jsonlInfo?.jsonlPath ?? "";
  const slug = jsonlInfo?.slug ?? slugs[0] ?? "";
  const title = await resolveChatTitle(sessionId, jsonlPath || undefined);
  const updatedAt = await resolveChatUpdatedAt(
    sessionId,
    jsonlInfo ? Math.floor(jsonlInfo.mtimeMs) : 0,
  );

  return {
    summary: {
      sessionId,
      title,
      updatedAt,
      messageCount: 0,
      jsonlPath,
      slug,
    },
  };
}
