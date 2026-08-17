import { escapeHtml, renderMarkdown } from "./markdown.js";

const TOOL_ICONS = {
  Read: "↳",
  Write: "✎",
  Shell: "▸",
  Grep: "⌕",
  Glob: "◎",
  StrReplace: "⟳",
  Delete: "−",
  WebFetch: "⤓",
  WebSearch: "⌕",
  Task: "◆",
  Await: "◷",
  default: "⚙",
};

function toolIcon(name) {
  return TOOL_ICONS[name] ?? TOOL_ICONS.default;
}

function formatToolName(name) {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function createMessageTurn(msg) {
  const turn = document.createElement("article");
  turn.className = `turn turn-${msg.role}`;

  if (msg.role === "user") {
    const label = document.createElement("div");
    label.className = "turn-label";
    label.textContent = "You";

    const content = document.createElement("div");
    content.className = "turn-content user-content";
    if (msg.text) {
      content.textContent = msg.text.slice(0, 12000) + (msg.text.length > 12000 ? "…" : "");
    }

    turn.append(label, content);
    return turn;
  }

  const header = document.createElement("div");
  header.className = "turn-header";
  header.innerHTML = `
    <span class="turn-avatar" aria-hidden="true">◇</span>
    <span class="turn-label">Agent</span>`;

  turn.appendChild(header);

  if (msg.tools?.length) {
    const rail = document.createElement("div");
    rail.className = "tool-rail";
    for (const name of msg.tools) {
      const chip = document.createElement("span");
      chip.className = "tool-chip";
      chip.innerHTML = `<span class="tool-icon">${toolIcon(name)}</span><span class="tool-name">${escapeHtml(formatToolName(name))}</span>`;
      rail.appendChild(chip);
    }
    turn.appendChild(rail);
  }

  if (msg.text) {
    const body = document.createElement("div");
    body.className = "turn-content markdown-body";
    body.innerHTML = renderMarkdown(msg.text);
    turn.appendChild(body);
  }

  return turn;
}

export function createStreamingAssistantTurn() {
  const turn = document.createElement("article");
  turn.className = "turn turn-assistant turn-streaming";
  turn.dataset.streaming = "true";

  const header = document.createElement("div");
  header.className = "turn-header";
  header.innerHTML = `
    <span class="turn-avatar" aria-hidden="true">◇</span>
    <span class="turn-label">Agent</span>
    <span class="turn-streaming-badge">Running…</span>`;
  turn.appendChild(header);

  const body = document.createElement("div");
  body.className = "turn-content markdown-body";
  turn.appendChild(body);

  return turn;
}

export function updateStreamingTurn(turn, rawText) {
  turn.dataset.raw = rawText;
  const body = turn.querySelector(".turn-content.markdown-body");
  if (body) body.innerHTML = renderMarkdown(rawText);
}

export function finalizeStreamingTurn(turn, { error = false } = {}) {
  turn.classList.remove("turn-streaming");
  delete turn.dataset.streaming;
  const badge = turn.querySelector(".turn-streaming-badge");
  if (badge) badge.remove();
  if (error) turn.classList.add("turn-error");
}

export { escapeHtml };
