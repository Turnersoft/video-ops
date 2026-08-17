export const VOXCPM_TONE_IDS = [
  "grounding",
  "insight",
  "contrast",
  "reveal",
  "takeaway",
] as const;

export type VoxcpmToneId = (typeof VOXCPM_TONE_IDS)[number];

export type VoxcpmTonePreset = {
  id: VoxcpmToneId;
  label: string;
  color: string;
  description: string;
  /** Exact transcript for the generated style-anchor WAV used by VoxCPM continuation mode. */
  promptText: string;
};

/**
 * Delivery colors that work for both mathematical explanation and product-launch narration.
 * VoxCPM conditions on a cached anchor rendered in the same cloned voice; promptText is an
 * audio transcript, not an instruction sent to the model.
 */
export const VOXCPM_TONE_PRESETS: readonly VoxcpmTonePreset[] = [
  {
    id: "grounding",
    label: "Grounding",
    color: "#3b82f6",
    description: "Calm, precise setup for definitions, context, and prerequisites.",
    promptText: "Let us start with the foundation, clearly and precisely.",
  },
  {
    id: "insight",
    label: "Insight",
    color: "#8b5cf6",
    description: "Curious, illuminating delivery for intuition and key ideas.",
    promptText: "Here is the key idea that makes everything click.",
  },
  {
    id: "contrast",
    label: "Contrast",
    color: "#f59e0b",
    description: "Crisp distinction for pitfalls, alternatives, and before-versus-after.",
    promptText: "But notice the difference; this is the important distinction.",
  },
  {
    id: "reveal",
    label: "Reveal",
    color: "#ec4899",
    description: "Energetic emphasis for results, demos, launches, and surprising turns.",
    promptText: "Now here is the result we have been building toward!",
  },
  {
    id: "takeaway",
    label: "Takeaway",
    color: "#22c55e",
    description: "Warm, confident resolution for conclusions and calls to action.",
    promptText: "So this is the point to remember and carry forward.",
  },
] as const;

export type VoxcpmSentenceVoiceMetadata = {
  id: string;
  tone: VoxcpmToneId;
  pauseAfterMs: number;
  fingerprint: string;
};

export type VoxcpmBeatVoiceMetadata = {
  schemaVersion: 1;
  sentences: VoxcpmSentenceVoiceMetadata[];
};

export type VoxcpmScriptSentence = VoxcpmSentenceVoiceMetadata & {
  text: string;
};

const DEFAULT_PAUSE_MS = 180;
const PARAGRAPH_PAUSE_MS = 420;
const ABBREVIATIONS = new Set([
  "e.g.",
  "i.e.",
  "etc.",
  "mr.",
  "mrs.",
  "ms.",
  "dr.",
  "prof.",
  "vs.",
]);

export function isVoxcpmToneId(value: unknown): value is VoxcpmToneId {
  return typeof value === "string" && VOXCPM_TONE_IDS.includes(value as VoxcpmToneId);
}

function normalizeSentenceText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Small deterministic fingerprint for metadata reconciliation; not used for cache integrity. */
export function voxcpmSentenceFingerprint(text: string): string {
  const normalized = normalizeSentenceText(text).toLowerCase();
  let hash = 0x811c9dc5;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function abbreviationBefore(text: string, punctuationIndex: number): boolean {
  const prefix = text.slice(0, punctuationIndex + 1).toLowerCase();
  const token = prefix.match(/(?:^|\s)([a-z](?:\.[a-z])*\.)$/)?.[1] ?? "";
  return ABBREVIATIONS.has(token) || /^[a-z]\.$/.test(token);
}

function splitLineIntoSentences(line: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let inBackticks = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "`") {
      inBackticks = !inBackticks;
      continue;
    }
    if (inBackticks || !/[.!?。！？]/.test(char)) {
      continue;
    }
    if (
      char === "." &&
      ((/\d/.test(line[index - 1] ?? "") && /\d/.test(line[index + 1] ?? "")) ||
        abbreviationBefore(line, index))
    ) {
      continue;
    }

    let end = index + 1;
    while (end < line.length && /[.!?。！？]/.test(line[end] ?? "")) {
      end += 1;
    }
    if (end < line.length && !/\s/.test(line[end] ?? "")) {
      continue;
    }
    const sentence = normalizeSentenceText(line.slice(start, end));
    if (sentence) {
      parts.push(sentence);
    }
    while (end < line.length && /\s/.test(line[end] ?? "")) {
      end += 1;
    }
    start = end;
    index = end - 1;
  }

  const tail = normalizeSentenceText(line.slice(start));
  if (tail) {
    parts.push(tail);
  }
  return parts;
}

export function splitVoxcpmSentences(text: string): Array<{
  text: string;
  pauseAfterMs: number;
}> {
  const sentences: Array<{ text: string; pauseAfterMs: number }> = [];
  const lines = String(text).replace(/\r\n/g, "\n").split("\n");

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]?.trim() ?? "";
    if (!line) {
      if (sentences.length > 0) {
        sentences[sentences.length - 1].pauseAfterMs = PARAGRAPH_PAUSE_MS;
      }
      continue;
    }
    const parts = splitLineIntoSentences(line);
    for (const part of parts) {
      sentences.push({ text: part, pauseAfterMs: DEFAULT_PAUSE_MS });
    }
    if (!(lines[lineIndex + 1]?.trim() ?? "") && sentences.length > 0) {
      sentences[sentences.length - 1].pauseAfterMs = PARAGRAPH_PAUSE_MS;
    }
  }

  if (sentences.length > 0) {
    sentences[sentences.length - 1].pauseAfterMs = 0;
  }
  return sentences;
}

export function defaultVoxcpmSentenceId(beatIndex: number, sentenceIndex: number): string {
  return `beat-${String(beatIndex + 1).padStart(2, "0")}-sentence-${String(
    sentenceIndex + 1,
  ).padStart(2, "0")}`;
}

export function reconcileVoxcpmSentences(
  say: string,
  beatIndex: number,
  stored?: VoxcpmBeatVoiceMetadata,
): VoxcpmScriptSentence[] {
  const split = splitVoxcpmSentences(say);
  const previous = stored?.schemaVersion === 1 ? stored.sentences : [];
  const unused = new Set(previous.map((_entry, index) => index));

  return split.map((entry, sentenceIndex) => {
    const fingerprint = voxcpmSentenceFingerprint(entry.text);
    let previousIndex = previous.findIndex(
      (candidate, index) => unused.has(index) && candidate.fingerprint === fingerprint,
    );
    if (previousIndex < 0 && unused.has(sentenceIndex)) {
      previousIndex = sentenceIndex;
    }
    const matched = previousIndex >= 0 ? previous[previousIndex] : undefined;
    if (previousIndex >= 0) {
      unused.delete(previousIndex);
    }
    return {
      id: matched?.id || defaultVoxcpmSentenceId(beatIndex, sentenceIndex),
      text: entry.text,
      tone: isVoxcpmToneId(matched?.tone) ? matched.tone : "grounding",
      pauseAfterMs: matched?.pauseAfterMs ?? entry.pauseAfterMs,
      fingerprint,
    };
  });
}

export function voxcpmVoiceMetadataFromSentences(
  sentences: VoxcpmScriptSentence[],
): VoxcpmBeatVoiceMetadata {
  return {
    schemaVersion: 1,
    sentences: sentences.map(({ id, tone, pauseAfterMs, text }) => ({
      id,
      tone,
      pauseAfterMs: Math.max(0, Math.round(pauseAfterMs)),
      fingerprint: voxcpmSentenceFingerprint(text),
    })),
  };
}

export function joinVoxcpmSentences(sentences: VoxcpmScriptSentence[]): string {
  return sentences
    .map((sentence, index) => {
      const suffix =
        index < sentences.length - 1 && sentence.pauseAfterMs >= PARAGRAPH_PAUSE_MS
          ? "\n\n"
          : "\n";
      return `${normalizeSentenceText(sentence.text)}${suffix}`;
    })
    .join("")
    .trim();
}
