/**
 * Build beat-studio state from animation.md beat-variants blocks.
 */

import type { DraftBeat } from '../components/ScriptBeatEditorPanel/ScriptBeatEditorPanel.types';
import type { LiveBeat } from '../types';
import type {
  BeatCandidate,
  BeatStudioBeatState,
  BeatStudioDocument,
  BeatTemplateKind,
  BeatTemplateConfig,
} from '../types/beatStudio';
import {
  type BeatVariantCandidateJson,
  type BeatVariantsBlock,
  extractBeatContentFromSection,
  parseBeatVariantsBlock,
  splitAnimationBeatSections,
} from './beatVariants';
import { defaultTemplateConfig, inferTemplateKind, normalizeTemplateConfig, canonicalBeatTemplateKind } from './beatTemplateRegistry';
import { parseBeatStudioFromVisualNotes, stripBeatStudioBlock } from './beatStudioVisualNotes';

export function candidateIdFromLabel(label: string): string {
  return `variant-${label.toLowerCase()}`;
}

function contentFromSection(section: string, beatIndex: number): DraftBeat {
  const raw = extractBeatContentFromSection(section, beatIndex);
  const parsed = parseBeatStudioFromVisualNotes(raw.visualNotes);
  return {
    title: raw.title,
    say: raw.say,
    leanCode: raw.leanCode,
    turnCode: raw.turnCode,
    visualNotes: parsed ? parsed.userNotes : stripBeatStudioBlock(raw.visualNotes),
  };
}

function candidateFromJson(
  json: BeatVariantCandidateJson,
  beat: LiveBeat,
  styleKit: Parameters<typeof inferTemplateKind>[1],
): BeatCandidate {
  const parsed = parseBeatStudioFromVisualNotes(json.content.visualNotes);
  const template =
    canonicalBeatTemplateKind(
      (json.template as string) || parsed?.template || inferTemplateKind(beat, styleKit),
    ) ?? inferTemplateKind(beat, styleKit);
  const templateConfig = normalizeTemplateConfig(
    template,
    (json.templateConfig as BeatTemplateConfig) ??
      parsed?.templateConfig ??
      defaultTemplateConfig(template),
  );
  return {
    id: candidateIdFromLabel(json.label),
    label: json.label,
    template,
    templateConfig,
    content: {
      title: json.content.title,
      say: json.content.say,
      leanCode: json.content.leanCode,
      turnCode: json.content.turnCode,
      visualNotes: parsed ? parsed.userNotes : stripBeatStudioBlock(json.content.visualNotes),
    },
    source: 'manual',
    createdAt: new Date().toISOString(),
  };
}

function beatStateFromVariantsBlock(
  block: BeatVariantsBlock,
  beat: LiveBeat,
  styleKit: Parameters<typeof inferTemplateKind>[1],
): BeatStudioBeatState {
  const candidates = block.candidates.map((entry: BeatVariantCandidateJson) =>
    candidateFromJson(entry, beat, styleKit),
  );
  const selected =
    candidates.find((candidate: BeatCandidate) => candidate.label === block.selected) ??
    candidates[0];
  return {
    selectedCandidateId: selected.id,
    candidates,
  };
}

function beatStateFromSection(
  section: string,
  beatIndex: number,
  beat: LiveBeat,
  styleKit: Parameters<typeof inferTemplateKind>[1],
): BeatStudioBeatState {
  const block = parseBeatVariantsBlock(section);
  if (block) {
    return beatStateFromVariantsBlock(block, beat, styleKit);
  }
  const content = contentFromSection(section, beatIndex);
  const parsed = parseBeatStudioFromVisualNotes(extractBeatContentFromSection(section, beatIndex).visualNotes);
  const template = parsed?.template ?? inferTemplateKind(beat, styleKit);
  const candidate: BeatCandidate = {
    id: candidateIdFromLabel('A'),
    label: 'A',
    template,
    templateConfig: normalizeTemplateConfig(
      template,
      parsed?.templateConfig ?? defaultTemplateConfig(template),
    ),
    content,
    source: 'manual',
    createdAt: new Date().toISOString(),
  };
  return { selectedCandidateId: candidate.id, candidates: [candidate] };
}

/** Parse all beats' variants from animation.md markdown. */
export function beatStudioBeatsFromAnimationMarkdown(
  markdown: string,
  beats: LiveBeat[],
  styleKit: Parameters<typeof inferTemplateKind>[1],
): Record<string, BeatStudioBeatState> {
  const { sections } = splitAnimationBeatSections(markdown);
  const state: Record<string, BeatStudioBeatState> = {};
  for (let index = 0; index < beats.length; index += 1) {
    const section = sections[index] ?? '';
    state[String(index)] = beatStateFromSection(section, index, beats[index], styleKit);
  }
  return state;
}

export function beatStudioDocumentFromAnimationMarkdown(
  scriptId: string,
  markdown: string,
  beats: LiveBeat[],
  styleKit: Parameters<typeof inferTemplateKind>[1],
): BeatStudioDocument {
  return {
    schemaVersion: 1,
    scriptId,
    updatedAt: new Date().toISOString(),
    beats: beatStudioBeatsFromAnimationMarkdown(markdown, beats, styleKit),
  };
}

/** animation.md variants are source of truth; stored selection wins when still valid. */
export function mergeBeatStudioWithAnimationMarkdown(
  stored: BeatStudioDocument | null,
  scriptId: string,
  markdown: string,
  beats: LiveBeat[],
  styleKit: Parameters<typeof inferTemplateKind>[1],
): BeatStudioDocument {
  const fromMd = beatStudioDocumentFromAnimationMarkdown(scriptId, markdown, beats, styleKit);
  if (!stored || stored.scriptId !== scriptId) {
    return fromMd;
  }

  const mergedBeats: Record<string, BeatStudioBeatState> = { ...fromMd.beats };
  for (const key of Object.keys(mergedBeats)) {
    const mdState = mergedBeats[key];
    const storedState = stored.beats[key];
    if (!storedState || mdState.candidates.length <= 1) {
      continue;
    }
    const storedSelected = storedState.candidates.find(
      (candidate) => candidate.id === storedState.selectedCandidateId,
    );
    const byLabel = storedSelected
      ? mdState.candidates.find((candidate) => candidate.label === storedSelected.label)
      : null;
    if (byLabel) {
      mergedBeats[key] = { ...mdState, selectedCandidateId: byLabel.id };
    }
  }

  return { ...fromMd, beats: mergedBeats };
}

export function liveBeatFromCandidate(beat: LiveBeat, candidate: BeatCandidate): LiveBeat {
  return {
    ...beat,
    title: candidate.content.title || beat.title,
    say: candidate.content.say,
    leanCode: candidate.content.leanCode,
    turnCode: candidate.content.turnCode,
    visualNotes: candidate.content.visualNotes,
  };
}

export function liveBeatsWithSelectedCandidates(
  beats: LiveBeat[],
  beatStudio: BeatStudioDocument | null,
): LiveBeat[] {
  if (!beatStudio) {
    return beats;
  }
  return beats.map((beat, index) => {
    const beatState = beatStudio.beats[String(index)];
    const candidate =
      beatState?.candidates.find((entry) => entry.id === beatState.selectedCandidateId) ??
      beatState?.candidates[0];
    if (!candidate) {
      return beat;
    }
    return liveBeatFromCandidate(beat, candidate);
  });
}

/** Editor drafts aligned with the selected variant shown in the storyboard. */
export function draftsFromSelectedCandidates(
  beats: LiveBeat[],
  beatStudio: BeatStudioDocument | null,
): DraftBeat[] {
  return liveBeatsWithSelectedCandidates(beats, beatStudio).map((beat) => ({
    title: beat.title,
    say: beat.say,
    leanCode: beat.leanCode,
    turnCode: beat.turnCode,
    visualNotes: beat.visualNotes,
  }));
}
