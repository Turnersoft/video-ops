import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverWorkspaces } from "./lib/workspaces.ts";
import { findChatBySessionId, invalidateComposerCache, listWorkspaceChats, loadChatMessagesPage } from "./lib/chats.ts";
import {
  createAgentChat,
  getActiveRun,
  runAgentPrompt,
} from "./lib/agent.ts";

const PORT = Number(Deno.env.get("CURSOR_REMOTE_PORT") ?? 5055);
const HOST = Deno.env.get("CURSOR_REMOTE_HOST") ?? "0.0.0.0";
const STATIC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "static");

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function cors(): HeadersInit {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type" };
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function serveStatic(pathname: string): Promise<Response | null> {
  const safe = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  if (safe.includes("..")) return null;
  const filePath = join(STATIC_DIR, safe);
  try {
    const data = await Deno.readFile(filePath);
    const ext = safe.split(".").pop() ?? "";
    const types: Record<string, string> = {
      html: "text/html; charset=utf-8",
      css: "text/css; charset=utf-8",
      js: "text/javascript; charset=utf-8",
    };
    return new Response(data, {
      headers: { "Content-Type": types[ext] ?? "application/octet-stream" },
    });
  } catch {
    return null;
  }
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors() });
  }

  if (path === "/api/workspaces" && req.method === "GET") {
    const limit = Number(url.searchParams.get("limit") ?? "20");
    const workspaces = await discoverWorkspaces(limit);
    return json({ workspaces }, 200);
  }

  const wsMatch = path.match(/^\/api\/workspaces\/([^/]+)\/chats$/);
  if (wsMatch && req.method === "GET") {
    const wsId = decodeURIComponent(wsMatch[1]);
    const limit = Number(url.searchParams.get("limit") ?? "50");
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const workspaces = await discoverWorkspaces(100);
    const workspace = workspaces.find((w) => w.id === wsId);
    if (!workspace) return json({ error: "Workspace not found" }, 404);
    const result = await listWorkspaceChats(workspace, limit, offset);
    return json({ workspace, ...result });
  }

  const chatMatch = path.match(/^\/api\/chats\/([^/]+)$/);
  if (chatMatch && req.method === "GET") {
    const sessionId = decodeURIComponent(chatMatch[1]);
    const found = await findChatBySessionId(sessionId);
    if (!found) return json({ error: "Chat not found" }, 404);
    const prompts = Number(url.searchParams.get("prompts") ?? "5");
    const beforeRaw = url.searchParams.get("before");
    const before = beforeRaw != null && beforeRaw !== ""
      ? Number(beforeRaw)
      : undefined;
    const page = await loadChatMessagesPage(
      found.summary.jsonlPath,
      sessionId,
      prompts,
      before,
    );
    return json({ ...found.summary, ...page });
  }

  if (path === "/api/agent/status" && req.method === "GET") {
    return json({ run: getActiveRun() });
  }

  if (path === "/api/agent/create-chat" && req.method === "POST") {
    try {
      const id = await createAgentChat();
      return json({ sessionId: id });
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  }

  if (path === "/api/agent/run" && req.method === "POST") {
    const body = await readBody(req);
    const prompt = String(body.prompt ?? "").trim();
    const workspacePath = String(body.workspacePath ?? "").trim();
    const sessionId = body.sessionId ? String(body.sessionId) : undefined;
    if (!prompt) return json({ error: "prompt required" }, 400);
    if (!workspacePath) return json({ error: "workspacePath required" }, 400);

    if (getActiveRun()?.status === "running") {
      return json({ error: "Agent already running" }, 409);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        };
        runAgentPrompt({
          workspacePath,
          prompt,
          sessionId,
          onChunk: (text) => send("chunk", { text }),
          onDone: (run) => {
            if (sessionId) invalidateComposerCache(sessionId);
            send("done", { run });
            controller.close();
          },
        })
          .then((run) => send("started", { run }))
          .catch((err) => {
            send("error", { error: String(err) });
            controller.close();
          });
      },
    });

    return new Response(stream, {
      headers: {
        ...cors(),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const staticResponse = await serveStatic(path);
  if (staticResponse) return staticResponse;
  if (!path.startsWith("/api/")) {
    const index = await serveStatic("/");
    if (index) return index;
  }

  return json({ error: "Not found" }, 404);
}

console.log(`[cursor-remote] http://${HOST}:${PORT}`);
Deno.serve({ hostname: HOST, port: PORT }, handler);
