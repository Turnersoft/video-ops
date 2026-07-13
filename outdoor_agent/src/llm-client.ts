import { loadLlmSettings } from './llm-settings.ts';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/);
  return match ? match[1] : trimmed;
}

async function resolveModel(baseUrl: string, preferred: string | null): Promise<string> {
  if (preferred?.trim()) {
    return preferred.trim();
  }
  try {
    const response = await fetch(`${baseUrl}/v1/models`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return 'local-model';
    }
    const payload = (await response.json()) as { data?: Array<{ id?: string }> };
    const first = payload.data?.[0]?.id;
    return first?.trim() || 'local-model';
  } catch {
    return 'local-model';
  }
}

export async function chatWithLocalLlm(messages: ChatMessage[]): Promise<string> {
  const settings = loadLlmSettings();
  const baseUrl = settings.baseUrl.replace(/\/+$/, '');
  const model = await resolveModel(baseUrl, settings.model);

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  const text = await response.text();
  let payload: ChatCompletionResponse;
  try {
    payload = JSON.parse(text) as ChatCompletionResponse;
  } catch {
    throw new Error(`LM Studio returned non-JSON (${response.status}): ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `LM Studio error ${response.status}`);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error('LM Studio returned empty content');
  }
  return stripCodeFence(content);
}

const ANIMATION_SYSTEM = `You edit VideoOps animation.md files.
Rules:
- Keep YAML frontmatter (videoOps, scriptId, title, format, fps, width, height).
- Preserve structure: # Scene, ## Beat / ## Overlay, ### Lean, ### Turn, ### Hint, ### Chinese, ### Visual notes.
- Keep HTML comments that carry layout/pace/font/hint metadata.
- Spoken English is plain lines under each beat (one teleprompter row per line).
- Return ONLY the full revised animation.md markdown — no preamble.`;

export async function reviseAnimationMarkdown(options: {
  markdown: string;
  instruction: string;
  selection?: string | null;
}): Promise<string> {
  const userParts = [
    `Instruction:\n${options.instruction.trim()}`,
    options.selection?.trim()
      ? `Focus on this selection (still return the FULL file):\n${options.selection.trim()}`
      : null,
    `Current animation.md:\n${options.markdown}`,
  ].filter(Boolean);

  return chatWithLocalLlm([
    { role: 'system', content: ANIMATION_SYSTEM },
    { role: 'user', content: userParts.join('\n\n') },
  ]);
}
