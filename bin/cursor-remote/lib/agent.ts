export type AgentRunState = {
  id: string;
  workspacePath: string;
  sessionId?: string;
  status: "running" | "done" | "error";
  output: string;
  startedAt: number;
  finishedAt?: number;
  error?: string;
};

let activeRun: {
  id: string;
  process: Deno.ChildProcess;
  state: AgentRunState;
  listeners: Set<(chunk: string, done: boolean) => void>;
} | null = null;

function agentBin(): string {
  return Deno.env.get("CURSOR_AGENT_BIN") ?? "agent";
}

export function getActiveRun(): AgentRunState | null {
  return activeRun?.state ?? null;
}

export async function runAgentPrompt(opts: {
  workspacePath: string;
  prompt: string;
  sessionId?: string;
  onChunk: (text: string) => void;
  onDone?: (state: AgentRunState) => void;
}): Promise<AgentRunState> {
  if (activeRun?.state.status === "running") {
    throw new Error("An agent run is already in progress");
  }

  const runId = crypto.randomUUID();
  const args = [
    "-p",
    "--trust",
    "--workspace",
    opts.workspacePath,
    "--output-format",
    "text",
  ];
  if (opts.sessionId) {
    args.push("--resume", opts.sessionId);
  }
  args.push(opts.prompt);

  const process = new Deno.Command(agentBin(), {
    args,
    stdout: "piped",
    stderr: "piped",
    stdin: "null",
  }).spawn();

  const state: AgentRunState = {
    id: runId,
    workspacePath: opts.workspacePath,
    sessionId: opts.sessionId,
    status: "running",
    output: "",
    startedAt: Date.now(),
  };

  activeRun = { id: runId, process, state, listeners: new Set() };

  const readStream = async () => {
    const reader = process.stdout.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        state.output += chunk;
        opts.onChunk(chunk);
        for (const fn of activeRun?.listeners ?? []) {
          fn(chunk, false);
        }
      }
    } finally {
      reader.releaseLock();
    }
    const stderr = await new Response(process.stderr).text();
    const status = await process.status;
    state.finishedAt = Date.now();
    if (!status.success) {
      state.status = "error";
      state.error = stderr.trim() || `agent exited ${status.code}`;
    } else {
      state.status = "done";
    }
    if (stderr.trim()) {
      state.output += `\n${stderr}`;
    }
    for (const fn of activeRun?.listeners ?? []) {
      fn("", true);
    }
    opts.onDone?.(state);
    if (activeRun?.id === runId) {
      activeRun = null;
    }
  };

  readStream().catch((err) => {
    state.status = "error";
    state.error = String(err);
    state.finishedAt = Date.now();
    if (activeRun?.id === runId) {
      activeRun = null;
    }
    opts.onDone?.(state);
  });

  return state;
}

export function subscribeActiveRun(
  listener: (chunk: string, done: boolean) => void,
): () => void {
  if (!activeRun) return () => {};
  activeRun.listeners.add(listener);
  return () => activeRun?.listeners.delete(listener);
}

export async function createAgentChat(): Promise<string> {
  const cmd = new Deno.Command(agentBin(), {
    args: ["create-chat"],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await cmd.output();
  if (code !== 0) {
    throw new Error(new TextDecoder().decode(stderr) || "create-chat failed");
  }
  return new TextDecoder().decode(stdout).trim();
}
