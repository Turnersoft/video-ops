import type { DraftBeat } from '../components/ScriptBeatEditorPanel/ScriptBeatEditorPanel.types';
import type { LiveBeat } from '../types';
import type {
  BeatCandidate,
  BeatStudioBeatState,
  BeatStudioDocument,
  BeatTemplateKind,
} from '../types/beatStudio';
import { defaultTemplateConfig, inferTemplateKind, normalizeTemplateConfig } from './beatTemplateRegistry';
import {
  parseBeatStudioFromVisualNotes,
  stripBeatStudioBlock,
} from './beatStudioVisualNotes';

function nowIso(): string {
  return new Date().toISOString();
}

function newCandidateId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function draftFromLiveBeat(beat: LiveBeat): DraftBeat {
  const parsed = parseBeatStudioFromVisualNotes(beat.visualNotes);
  return {
    title: beat.title,
    say: beat.say,
    leanCode: beat.leanCode,
    turnCode: beat.turnCode,
    visualNotes: parsed ? parsed.userNotes : stripBeatStudioBlock(beat.visualNotes),
  };
}

export function createCandidate(
  beat: LiveBeat,
  styleKit: Parameters<typeof inferTemplateKind>[1],
  options: {
    label?: string;
    template?: BeatTemplateKind;
    templateConfig?: BeatCandidate['templateConfig'];
    content?: DraftBeat;
    source?: BeatCandidate['source'];
    aiPrompt?: string;
  } = {},
): BeatCandidate {
  const parsed = parseBeatStudioFromVisualNotes(beat.visualNotes);
  const template = options.template ?? parsed?.template ?? inferTemplateKind(beat, styleKit);
  return {
    id: newCandidateId(),
    label: options.label ?? 'A',
    template,
    templateConfig: normalizeTemplateConfig(
      template,
      options.templateConfig ?? parsed?.templateConfig ?? defaultTemplateConfig(template),
    ),
    content: options.content ?? draftFromLiveBeat(beat),
    source: options.source ?? 'manual',
    createdAt: nowIso(),
    aiPrompt: options.aiPrompt,
  };
}

export function initBeatStudioState(
  beats: LiveBeat[],
  styleKit: Parameters<typeof inferTemplateKind>[1],
): Record<string, BeatStudioBeatState> {
  const state: Record<string, BeatStudioBeatState> = {};
  beats.forEach((beat, index) => {
    const candidate = createCandidate(beat, styleKit, { label: 'A' });
    state[String(index)] = {
      selectedCandidateId: candidate.id,
      candidates: [candidate],
    };
  });
  return state;
}

export function getSelectedCandidate(
  beatState: BeatStudioBeatState | undefined,
): BeatCandidate | null {
  if (!beatState) {
    return null;
  }
  const candidate =
    beatState.candidates.find((entry) => entry.id === beatState.selectedCandidateId) ??
    beatState.candidates[0] ??
    null;
  if (!candidate) {
    return null;
  }
  return {
    ...candidate,
    templateConfig: normalizeTemplateConfig(candidate.template, candidate.templateConfig),
  };
}

export function selectCandidate(
  beatState: BeatStudioBeatState,
  candidateId: string,
): BeatStudioBeatState {
  if (!beatState.candidates.some((candidate) => candidate.id === candidateId)) {
    return beatState;
  }
  return { ...beatState, selectedCandidateId: candidateId };
}

export function addCandidate(
  beatState: BeatStudioBeatState,
  candidate: BeatCandidate,
): BeatStudioBeatState {
  return {
    selectedCandidateId: candidate.id,
    candidates: [...beatState.candidates, candidate],
  };
}

export function deleteCandidate(
  beatState: BeatStudioBeatState,
  candidateId: string,
): BeatStudioBeatState {
  if (beatState.candidates.length <= 1) {
    return beatState;
  }
  const remaining = beatState.candidates.filter((candidate) => candidate.id !== candidateId);
  const selectedCandidateId =
    beatState.selectedCandidateId === candidateId
      ? remaining[0]?.id ?? beatState.selectedCandidateId
      : beatState.selectedCandidateId;
  return { selectedCandidateId, candidates: remaining };
}

export function updateCandidate(
  beatState: BeatStudioBeatState,
  candidateId: string,
  patch: Partial<Pick<BeatCandidate, 'content' | 'template' | 'templateConfig' | 'label'>>,
): BeatStudioBeatState {
  return {
    ...beatState,
    candidates: beatState.candidates.map((candidate) =>
      candidate.id === candidateId ? { ...candidate, ...patch } : candidate,
    ),
  };
}

export function nextCandidateLabel(candidates: BeatCandidate[]): string {
  const used = new Set(candidates.map((candidate) => candidate.label));
  for (const code of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    if (!used.has(code)) {
      return code;
    }
  }
  return `V${candidates.length + 1}`;
}

export function beatStudioStorageKey(scriptId: string): string {
  return `outdoor-beat-studio-${scriptId}`;
}

export function readBeatStudioFromSession(scriptId: string): BeatStudioDocument | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(beatStudioStorageKey(scriptId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as BeatStudioDocument;
  } catch {
    return null;
  }
}

export function writeBeatStudioToSession(doc: BeatStudioDocument): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(beatStudioStorageKey(doc.scriptId), JSON.stringify(doc));
  } catch {
    // ignore quota errors
  }
}

export function mergeBeatStudioWithLive(
  stored: BeatStudioDocument | null,
  scriptId: string,
  beats: LiveBeat[],
  styleKit: Parameters<typeof inferTemplateKind>[1],
): BeatStudioDocument {
  const fresh = initBeatStudioState(beats, styleKit);
  if (!stored || stored.scriptId !== scriptId) {
    return { schemaVersion: 1, scriptId, updatedAt: nowIso(), beats: fresh };
  }
  const merged: Record<string, BeatStudioBeatState> = { ...fresh };
  for (const key of Object.keys(stored.beats)) {
    const index = Number(key);
    if (Number.isNaN(index) || index >= beats.length) {
      continue;
    }
    const storedState = stored.beats[key];
    if (!storedState?.candidates?.length) {
      continue;
    }
    merged[key] = storedState;
  }
  return { schemaVersion: 1, scriptId, updatedAt: nowIso(), beats: merged };
}

export function ensureBeatStudioBeatCount(
  doc: BeatStudioDocument,
  beats: LiveBeat[],
  styleKit: Parameters<typeof inferTemplateKind>[1],
): BeatStudioDocument {
  const nextBeats = { ...doc.beats };
  let changed = false;
  for (let index = 0; index < beats.length; index += 1) {
    const key = String(index);
    if (!nextBeats[key]?.candidates?.length) {
      const candidate = createCandidate(beats[index], styleKit, { label: 'A' });
      nextBeats[key] = { selectedCandidateId: candidate.id, candidates: [candidate] };
      changed = true;
    }
  }
  for (const key of Object.keys(nextBeats)) {
    if (Number(key) >= beats.length) {
      delete nextBeats[key];
      changed = true;
    }
  }
  if (!changed) {
    return doc;
  }
  return { ...doc, updatedAt: nowIso(), beats: nextBeats };
}

/** Pull animation.md beat text + embedded template metadata into each beat's selected candidate. */
export function syncSelectedCandidatesFromLive(
  doc: BeatStudioDocument,
  beats: LiveBeat[],
): BeatStudioDocument {
  const nextBeats = { ...doc.beats };
  let changed = false;

  for (let index = 0; index < beats.length; index += 1) {
    const key = String(index);
    const beatState = nextBeats[key];
    if (!beatState) {
      continue;
    }
    const selected = getSelectedCandidate(beatState);
    if (!selected) {
      continue;
    }

    const beat = beats[index];
    const liveDraft = draftFromLiveBeat(beat);
    const parsed = parseBeatStudioFromVisualNotes(beat.visualNotes);
    const template = parsed?.template ?? selected.template;
    const templateConfig =
      parsed?.templateConfig ?? selected.templateConfig ?? defaultTemplateConfig(template);

    const contentSame =
      selected.content.title === liveDraft.title &&
      selected.content.say === liveDraft.say &&
      selected.content.leanCode === liveDraft.leanCode &&
      selected.content.turnCode === liveDraft.turnCode &&
      selected.content.visualNotes === liveDraft.visualNotes;
    const metaSame =
      selected.template === template &&
      JSON.stringify(selected.templateConfig) === JSON.stringify(templateConfig);

    if (contentSame && metaSame) {
      continue;
    }

    nextBeats[key] = updateCandidate(beatState, selected.id, {
      content: liveDraft,
      template,
      templateConfig,
    });
    changed = true;
  }

  if (!changed) {
    return doc;
  }
  return { ...doc, updatedAt: nowIso(), beats: nextBeats };
}
