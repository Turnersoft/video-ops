import {
  createMessageTurn,
  createStreamingAssistantTurn,
  escapeHtml,
  finalizeStreamingTurn,
  updateStreamingTurn,
} from "./render.js";
import { renderMarkdown } from "./markdown.js";
import { navigateTo, parseRoute } from "./router.js";

const $ = (sel) => document.querySelector(sel);

const THREAD_PROMPTS = 5;

const state = {
  view: "workspaces",
  workspaces: [],
  workspace: null,
  chats: [],
  chatOffset: 0,
  chatTotal: 0,
  chatLimit: 50,
  thread: null,
  threadBefore: null,
  threadHasMore: false,
  threadLoadingOlder: false,
  resumeSessionId: null,
  running: false,
  syncingRoute: false,
  lastSentPrompt: null,
};

function fmtTime(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < 604800000) {
    return d.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function setView(view) {
  state.view = view;
  $("#screen-workspaces").classList.toggle("hidden", view !== "workspaces");
  $("#screen-chats").classList.toggle("hidden", view !== "chats");
  $("#screen-thread").classList.toggle("hidden", view !== "thread");
  $("#back-btn").classList.toggle("hidden", view === "workspaces");
  $("#composer").classList.toggle("hidden", view === "workspaces");

  if (view === "workspaces") {
    $("#title").textContent = "Cursor Remote";
    state.resumeSessionId = null;
  } else if (view === "chats" && state.workspace) {
    $("#title").textContent = state.workspace.name;
  } else if (view === "thread" && state.thread) {
    $("#title").textContent = state.thread.title;
  }
}

async function api(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadWorkspaces(limit = 20) {
  const data = await api(`/api/workspaces?limit=${limit}`);
  state.workspaces = data.workspaces;
  renderWorkspaceList();
}

function renderWorkspaceList() {
  const list = $("#workspace-list");
  list.innerHTML = "";
  for (const ws of state.workspaces) {
    const btn = document.createElement("button");
    btn.className = "card";
    btn.type = "button";
    btn.innerHTML = `
      <div class="card-title">${escapeHtml(ws.name)}</div>
      <div class="card-meta">${escapeHtml(shortPath(ws.rootPath))}</div>`;
    btn.onclick = () => openWorkspace(ws);
    list.appendChild(btn);
  }
}

function shortPath(p) {
  if (!p) return "";
  const parts = p.split("/").filter(Boolean);
  if (parts[0] === "Users" && parts.length > 2) {
    return "~/" + parts.slice(2).join("/");
  }
  return p;
}

function findWorkspace(id) {
  return state.workspaces.find((w) => w.id === id) ?? null;
}

async function ensureWorkspace(id) {
  let ws = findWorkspace(id);
  if (ws) return ws;
  await loadWorkspaces(100);
  return findWorkspace(id);
}

async function showWorkspaceChats(ws) {
  state.workspace = ws;
  state.chats = [];
  state.chatOffset = 0;
  await loadMoreChats(true);
  setView("chats");
}

async function openWorkspace(ws) {
  navigateTo(ws.id);
  await showWorkspaceChats(ws);
}

async function loadMoreChats(reset = false) {
  if (!state.workspace) return;
  if (reset) {
    state.chatOffset = 0;
    state.chats = [];
  }
  const data = await api(
    `/api/workspaces/${encodeURIComponent(state.workspace.id)}/chats?limit=${state.chatLimit}&offset=${state.chatOffset}`,
  );
  state.chatTotal = data.total;
  state.chats.push(...data.chats);
  state.chatOffset += data.chats.length;
  renderChatList();
}

function renderChatList() {
  const list = $("#chat-list");
  list.innerHTML = "";
  for (const chat of state.chats) {
    const btn = document.createElement("button");
    btn.className = "card";
    btn.type = "button";
    btn.innerHTML = `
      <div class="card-title">${escapeHtml(chat.title)}</div>
      <div class="card-meta">${fmtTime(chat.updatedAt)} · ${chat.messageCount} messages</div>`;
    btn.onclick = () => openThread(chat);
    list.appendChild(btn);
  }
  const more = $("#load-more");
  more.classList.toggle("hidden", state.chats.length >= state.chatTotal);
}

function scrollStorageKey(sessionId) {
  return `cursor-remote:scroll:${sessionId}`;
}

function saveThreadScroll(sessionId) {
  if (!sessionId) return;
  const screen = $("#screen-thread");
  if (screen.classList.contains("hidden")) return;
  sessionStorage.setItem(scrollStorageKey(sessionId), String(Math.round(screen.scrollTop)));
}

function waitForThreadLayout() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

function lastTurnEl() {
  const turns = $("#thread").querySelectorAll(".turn");
  return turns[turns.length - 1] ?? null;
}

/** Scroll offset that puts `el` at the top of #screen-thread's visible area. */
function scrollTopForElement(el) {
  const screen = $("#screen-thread");
  if (!el || !screen) return 0;
  const paddingTop = Number.parseFloat(getComputedStyle(screen).paddingTop) || 0;
  const screenRect = screen.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  return Math.max(0, Math.round(screen.scrollTop + (elRect.top - screenRect.top) - paddingTop));
}

function scrollToLastMessageStart() {
  const screen = $("#screen-thread");
  const last = lastTurnEl();
  if (!last || screen.classList.contains("hidden")) return;

  const apply = () => {
    screen.scrollTop = scrollTopForElement(last);
  };

  apply();
  // iOS / flex: re-apply after layout settles
  requestAnimationFrame(() => {
    apply();
    requestAnimationFrame(apply);
  });
  if (state.resumeSessionId) saveThreadScroll(state.resumeSessionId);
}

function restoreThreadScroll(sessionId) {
  const raw = sessionStorage.getItem(scrollStorageKey(sessionId));
  if (raw == null) return false;
  const top = Number(raw);
  if (!Number.isFinite(top)) return false;

  const screen = $("#screen-thread");
  if (screen.classList.contains("hidden")) return false;

  screen.scrollTop = top;
  requestAnimationFrame(() => {
    screen.scrollTop = top;
  });
  return true;
}

async function applyThreadScroll(sessionId, mode) {
  await waitForThreadLayout();
  if (mode === "restore" && restoreThreadScroll(sessionId)) return;

  const pinLast = () => {
    if (state.resumeSessionId !== sessionId || state.view !== "thread") return;
    scrollToLastMessageStart();
  };
  pinLast();
  // Content can still grow (fonts / markdown). Keep pinning until stable.
  for (const delay of [50, 150, 400]) {
    window.setTimeout(pinLast, delay);
  }
}

let scrollSaveTimer = null;
function scheduleScrollSave() {
  if (!state.resumeSessionId) return;
  clearTimeout(scrollSaveTimer);
  scrollSaveTimer = setTimeout(() => {
    saveThreadScroll(state.resumeSessionId);
  }, 120);
}

function createMessageBubble(msg) {
  return createMessageTurn(msg);
}

function updateThreadLoadOlder() {
  const btn = $("#thread-load-older");
  btn.classList.toggle("hidden", !state.threadHasMore);
  btn.disabled = state.threadLoadingOlder;
  btn.textContent = state.threadLoadingOlder ? "Loading…" : "Load older messages";
}

function prependThreadMessages(messages) {
  const thread = $("#thread");
  const frag = document.createDocumentFragment();
  for (const msg of messages) {
    frag.appendChild(createMessageBubble(msg));
  }
  thread.insertBefore(frag, thread.firstChild);
}

function renderThreadMessages(messages) {
  const thread = $("#thread");
  thread.innerHTML = "";
  for (const msg of messages) {
    thread.appendChild(createMessageBubble(msg));
  }
}

function appendThreadTurn(msg) {
  const thread = $("#thread");
  thread.appendChild(createMessageBubble(msg));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messagesIncludePrompt(messages, prompt) {
  const needle = prompt.trim();
  if (!needle) return false;
  return messages.some((m) => m.role === "user" && m.text?.trim() === needle);
}

async function reloadThreadWithRetry() {
  if (!state.resumeSessionId || !state.lastSentPrompt) {
    await reloadThread();
    return;
  }

  const prompt = state.lastSentPrompt;
  for (let attempt = 0; attempt < 6; attempt++) {
    const data = await fetchThreadData(state.resumeSessionId);
    if (messagesIncludePrompt(data.messages ?? [], prompt)) {
      await applyThreadData(data);
      await applyThreadScroll(state.resumeSessionId, "last-message");
      return;
    }
    await sleep(400 + attempt * 300);
  }
  await applyThreadScroll(state.resumeSessionId, "last-message");
}

function threadApiUrl(sessionId, before) {
  let url = `/api/chats/${encodeURIComponent(sessionId)}?prompts=${THREAD_PROMPTS}`;
  if (before != null) url += `&before=${before}`;
  return url;
}

async function loadOlderThreadMessages() {
  if (!state.resumeSessionId || state.threadLoadingOlder || !state.threadHasMore) return;
  if (state.threadBefore == null) return;

  state.threadLoadingOlder = true;
  updateThreadLoadOlder();
  try {
    const screen = $("#screen-thread");
    const prevHeight = screen.scrollHeight;
    const data = await api(threadApiUrl(state.resumeSessionId, state.threadBefore));
    if (data.messages?.length) {
      prependThreadMessages(data.messages);
    }
    state.threadBefore = data.before;
    state.threadHasMore = data.hasMore;
    requestAnimationFrame(() => {
      screen.scrollTop += screen.scrollHeight - prevHeight;
      scheduleScrollSave();
    });
  } finally {
    state.threadLoadingOlder = false;
    updateThreadLoadOlder();
  }
}

async function fetchThreadData(sessionId) {
  return api(threadApiUrl(sessionId));
}

async function applyThreadData(data) {
  state.thread = data;
  state.threadBefore = data.before;
  state.threadHasMore = data.hasMore;
  renderThreadMessages(data.messages ?? []);
  updateThreadLoadOlder();
}

async function fetchThreadTail(sessionId) {
  const data = await fetchThreadData(sessionId);
  await applyThreadData(data);
}

async function reloadThread() {
  if (!state.resumeSessionId) return;
  await fetchThreadTail(state.resumeSessionId);
  await applyThreadScroll(state.resumeSessionId, "last-message");
}

async function showThread(sessionId, scrollMode = "restore") {
  state.resumeSessionId = sessionId;
  setView("thread");
  await fetchThreadTail(sessionId);
  await applyThreadScroll(sessionId, scrollMode);
}

async function openThread(chat) {
  if (!state.workspace) return;
  sessionStorage.removeItem(scrollStorageKey(chat.sessionId));
  navigateTo(state.workspace.id, chat.sessionId);
  await showThread(chat.sessionId, "last-message");
}

async function syncFromUrl() {
  if (state.syncingRoute) return;
  state.syncingRoute = true;
  try {
    const route = parseRoute();
    if (route.view === "workspaces") {
      setView("workspaces");
      return;
    }

    const ws = await ensureWorkspace(route.workspaceId);
    if (!ws) {
      navigateTo(null, null, { replace: true });
      setView("workspaces");
      return;
    }

    if (route.view === "chats") {
      if (state.workspace?.id !== ws.id || state.view !== "chats") {
        await showWorkspaceChats(ws);
      } else {
        setView("chats");
      }
      return;
    }

    if (state.workspace?.id !== ws.id || state.view !== "thread" || state.resumeSessionId !== route.sessionId) {
      state.workspace = ws;
      state.chats = [];
      state.chatOffset = 0;
      await loadMoreChats(true);
      await showThread(route.sessionId, "restore");
    } else {
      setView("thread");
      await applyThreadScroll(route.sessionId, "restore");
    }
  } finally {
    state.syncingRoute = false;
  }
}

async function sendPrompt() {
  const prompt = $("#prompt-input").value.trim();
  if (!prompt || state.running || !state.workspace) return;

  const inThread = state.view === "thread" && !!state.resumeSessionId;
  state.lastSentPrompt = prompt;
  state.running = true;
  $("#send-btn").disabled = true;
  $("#status-dot").classList.add("running");
  $("#prompt-input").value = "";

  let streamingTurn = null;
  let streamRaw = "";

  if (inThread) {
    appendThreadTurn({ role: "user", text: prompt });
    streamingTurn = createStreamingAssistantTurn();
    $("#thread").appendChild(streamingTurn);
    await applyThreadScroll(state.resumeSessionId, "last-message");
  } else {
    $("#run-panel").classList.remove("hidden");
    const runOut = $("#run-output");
    runOut.className = "markdown-body";
    runOut.innerHTML = "";
    runOut.dataset.raw = "";
  }

  const applyStreamChunk = (text) => {
    streamRaw += text;
    if (streamingTurn) {
      updateStreamingTurn(streamingTurn, streamRaw);
    } else {
      const runOut = $("#run-output");
      runOut.dataset.raw = streamRaw;
      runOut.innerHTML = renderMarkdown(streamRaw);
    }
  };

  const applyStreamError = (message) => {
    streamRaw += `\n\n[error] ${message}`;
    if (streamingTurn) {
      updateStreamingTurn(streamingTurn, streamRaw);
      finalizeStreamingTurn(streamingTurn, { error: true });
    } else {
      const runOut = $("#run-output");
      runOut.dataset.raw = streamRaw;
      runOut.innerHTML = renderMarkdown(streamRaw);
    }
  };

  try {
    const res = await fetch("/api/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspacePath: state.workspace.rootPath,
        prompt,
        sessionId: state.resumeSessionId || undefined,
      }),
    });
    if (!res.ok) throw new Error(await res.text());

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() ?? "";
      for (const part of parts) {
        const lines = part.split("\n");
        let event = "message";
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          if (line.startsWith("data:")) data = line.slice(5).trim();
        }
        if (!data) continue;
        const payload = JSON.parse(data);
        if (event === "chunk" && payload.text) {
          applyStreamChunk(payload.text);
        }
        if (event === "error") {
          applyStreamError(payload.error ?? "Unknown error");
        }
      }
    }

    if (streamingTurn) {
      finalizeStreamingTurn(streamingTurn, { error: streamRaw.includes("[error]") });
      await reloadThreadWithRetry();
    } else if (state.view === "chats") {
      await loadMoreChats(true);
    }
  } catch (err) {
    applyStreamError(err.message || String(err));
    if (inThread) await reloadThreadWithRetry();
  } finally {
    state.running = false;
    $("#send-btn").disabled = false;
    $("#status-dot").classList.remove("running");
  }
}

$("#back-btn").onclick = () => history.back();

$("#load-more").onclick = () => loadMoreChats(false);
$("#send-btn").onclick = () => sendPrompt();
$("#run-close").onclick = () => $("#run-panel").classList.add("hidden");
$("#thread-load-older").onclick = () => loadOlderThreadMessages();

$("#screen-thread").addEventListener("scroll", () => {
  const screen = $("#screen-thread");
  scheduleScrollSave();
  if (state.view !== "thread" || state.threadLoadingOlder || !state.threadHasMore) return;
  if (screen.scrollTop <= 48) {
    loadOlderThreadMessages();
  }
});

window.addEventListener("beforeunload", () => {
  if (state.resumeSessionId) saveThreadScroll(state.resumeSessionId);
});

window.addEventListener("pagehide", () => {
  if (state.resumeSessionId) saveThreadScroll(state.resumeSessionId);
});

$("#prompt-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendPrompt();
  }
});

window.addEventListener("popstate", () => {
  syncFromUrl();
});

loadWorkspaces()
  .then(() => syncFromUrl())
  .catch((err) => {
    $("#workspace-list").innerHTML = `<p class="hint">Failed to load: ${escapeHtml(String(err))}</p>`;
  });

setInterval(async () => {
  try {
    const { run } = await api("/api/agent/status");
    state.running = run?.status === "running";
    $("#status-dot").classList.toggle("running", state.running);
  } catch {
    // ignore
  }
}, 3000);
