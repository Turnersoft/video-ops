import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { layoutStylesFor } from '../../layout';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { formatOutdoorApiError } from "../../api/client";
import { BeatCandidateRail } from "../../components/BeatCandidateRail/BeatCandidateRail";
import { BeatOverviewStrip } from "../../components/BeatOverviewStrip/BeatOverviewStrip";
import {
  ScriptRemotionPreview,
  type ScriptRemotionPreviewHandle,
} from "../../components/ScriptRemotionPreview/ScriptRemotionPreview";
import {
  ScriptBeatEditorPanel,
  type DraftBeat,
} from "../../components/ScriptBeatEditorPanel/ScriptBeatEditorPanel";
import { draftsFromLive, draftDiffersFromBeat } from "../../components/ScriptBeatEditorPanel/ScriptBeatEditorPanel.utils";
import { Header } from "../../components/Header/Header";
import { Button } from "../../components/Button/Button";
import { ScriptCoversPanel } from "../../components/ScriptCoversPanel/ScriptCoversPanel";
import { OrientationToggle } from "../../components/OrientationToggle/OrientationToggle";
import { VoiceEngineToggle } from "../../components/VoiceEngineToggle/VoiceEngineToggle";
import { LanguageToggle } from "../../components/LanguageToggle/LanguageToggle";
import { useOutdoorUi } from "../../context/OutdoorUiContext";
import { useOutdoorRoute } from "../../hooks/useOutdoorRoute";
import { useScriptLanguage } from "../../hooks/useScriptLanguage";
import { useVoiceEngine } from "../../hooks/useVoiceEngine";
import { colors, radii, sharedStyles, spacing, typography } from "../../theme";
import type { LiveBeat, LiveScript, StyleKit } from "../../types";
import type {
  BeatStudioDocument,
  BeatTemplateConfig,
  BeatTemplateKind,
} from "../../types/beatStudio";
import { beatStartFrame } from "../../utils/beatSeek";
import type { RemotionSeekOptions } from "../../components/RemotionEmbed/RemotionEmbed.types";
import {
  addCandidate,
  createCandidate,
  draftFromLiveBeat,
  getSelectedCandidate,
  mergeBeatStudioWithLive,
  nextCandidateLabel,
  readBeatStudioFromSession,
  selectCandidate,
  updateCandidate,
  writeBeatStudioToSession,
} from "../../utils/beatStudio";
import { encodeVisualNotesForSave } from "../../utils/beatStudioVisualNotes";
import {
  draftsFromSelectedCandidates,
  liveBeatsWithSelectedCandidates,
  mergeBeatStudioWithAnimationMarkdown,
} from "../../utils/beatVariantsFromAnimation";
import { defaultTemplateConfig } from "../../utils/beatTemplateRegistry";
import {
  applyFormatToAnimationMd,
  inferFormatFromAnimationMd,
  type OutdoorPreviewFormat,
} from "../../utils/animationMdFormat";
import { computeScriptRemotionPreviewSize } from "../../utils/scriptRemotionPreviewLayout";
import { templateConfigNeedsRemotionSync } from "../../utils/templateConfigRemotionSync";
import { queueVoxcpmPendingSentences } from "../../utils/queueVoxcpmPending";
import {
  VOICE_ENGINE_LABELS,
  VOICE_ENGINE_IDS,
  defaultVoiceEngine,
  type VoiceEngineId,
} from "../../utils/voiceEngine";
import classes from "./AnimationEditorScreen.module.scss";

function resolveStyleKit(live: LiveScript | null): StyleKit {
  return live?.styleKit ?? "compare";
}

export type AnimationEditorScreenProps = {
  scriptId: string;
};

type AiBeatChange = {
  beatIndex: number;
  field: "title" | "say" | "leanCode" | "turnCode" | "visualNotes" | "beat";
  before: string;
  after: string;
};

type AiSessionEntry = {
  id: string;
  at: string;
  kind: "user" | "status" | "change" | "error";
  message: string;
  changes?: AiBeatChange[];
};

function nowId(): string {
  return `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function truncate(text: string, max = 120): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1)}…`;
}

function diffBeats(before: LiveBeat[], after: LiveBeat[]): AiBeatChange[] {
  const changes: AiBeatChange[] = [];
  const maxLen = Math.max(before.length, after.length);

  for (let index = 0; index < maxLen; index += 1) {
    const prev = before[index];
    const next = after[index];
    if (!prev && next) {
      changes.push({
        beatIndex: index,
        field: "beat",
        before: "",
        after: next.title || `Beat ${index + 1}`,
      });
      continue;
    }
    if (!next) {
      continue;
    }
    const fields: Array<
      "title" | "say" | "leanCode" | "turnCode" | "visualNotes"
    > = ["title", "say", "leanCode", "turnCode", "visualNotes"];
    for (const field of fields) {
      const beforeValue = prev?.[field] ?? "";
      const afterValue = next[field] ?? "";
      if (beforeValue !== afterValue) {
        changes.push({
          beatIndex: index,
          field,
          before: beforeValue,
          after: afterValue,
        });
      }
    }
  }

  return changes;
}

function formatChangeLine(change: AiBeatChange): string {
  const beatLabel = `Beat ${change.beatIndex + 1}`;
  if (change.field === "beat") {
    return `${beatLabel}: added`;
  }
  if (!change.before.trim()) {
    return `${beatLabel} · ${change.field}: added “${truncate(change.after, 80)}”`;
  }
  if (!change.after.trim()) {
    return `${beatLabel} · ${change.field}: cleared`;
  }
  return `${beatLabel} · ${change.field}: “${truncate(change.before, 48)}” → “${truncate(change.after, 48)}”`;
}

export function AnimationEditorScreen({
  scriptId,
}: AnimationEditorScreenProps) {
  const { api, invalidateAll, layout, onOpenFilm } = useOutdoorUi();
  const { voiceEngine, setVoiceEngine } = useVoiceEngine();
  const { scriptLanguage, setScriptLanguage } = useScriptLanguage();
  const layoutStyles = layoutStylesFor(layout);
  const {
    navigateToLibrary,
    navigateToPlatforms,
    navigateToFilm,
    navigateToScript,
    navigateToPostProcess,
    navigateToTake,
  } = useOutdoorRoute();

  const [live, setLive] = useState<LiveScript | null>(null);
  const [drafts, setDrafts] = useState<DraftBeat[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [aiSession, setAiSession] = useState<AiSessionEntry[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [previewFormat, setPreviewFormat] = useState<OutdoorPreviewFormat>("landscape");
  const [formatBusy, setFormatBusy] = useState(false);
  const [seekStatus, setSeekStatus] = useState<string | null>(null);
  const [voxcpmAllBusy, setVoxcpmAllBusy] = useState(false);
  const [voxcpmRegenerateBusy, setVoxcpmRegenerateBusy] = useState(false);
  const [previewVoiceEngine, setPreviewVoiceEngineState] = useState<VoiceEngineId>(
    defaultVoiceEngine(),
  );
  const [previewEnginesReady, setPreviewEnginesReady] = useState<
    Record<VoiceEngineId, boolean>
  >({
    voxcpm: false,
    indextts: false,
  });
  const [previewVoiceBusy, setPreviewVoiceBusy] = useState(false);
  const [generateCloneBusy, setGenerateCloneBusy] = useState(false);
  const [beatStudio, setBeatStudio] = useState<BeatStudioDocument | null>(null);
  const dirtyRef = useRef(false);
  const previewRef = useRef<ScriptRemotionPreviewHandle | null>(null);
  const activeIndexRef = useRef(activeIndex);
  const draftsRef = useRef(drafts);
  const beatStudioRef = useRef(beatStudio);
  /** Last Remotion timeline frame (scrub / seek) — restored after preview remount. */
  const lastPreviewFrameRef = useRef<number | null>(null);
  const previewPlayingRef = useRef(false);
  const templateConfigSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  activeIndexRef.current = activeIndex;
  draftsRef.current = drafts;
  beatStudioRef.current = beatStudio;

  const seekPreviewToFrame = useCallback(
    (
      frame: number,
      statusLabel?: string,
      options?: { resumePlayback?: boolean },
    ) => {
      const safeFrame = Math.max(0, Math.round(frame));
      lastPreviewFrameRef.current = safeFrame;
      const seconds = safeFrame / 30;
      setSeekStatus(
        statusLabel ?? `Seek ${seconds.toFixed(1)}s (frame ${safeFrame})`,
      );
      previewRef.current?.seekToFrame(safeFrame, {
        resumePlayback: options?.resumePlayback,
      });
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const iframe = document.querySelector("iframe");
        if (!iframe?.contentWindow || !iframe.src) {
          return;
        }
        try {
          const origin = new URL(iframe.src).origin;
          iframe.contentWindow.postMessage(
            {
              type: "turn-outdoor-align-seek",
              frame: safeFrame,
              compositionId: scriptId,
              resumePlayback: options?.resumePlayback === true,
            },
            origin,
          );
        } catch {
          // Cross-origin edge cases — ref path above is enough when available.
        }
      }
    },
    [scriptId],
  );

  const seekPreviewToBeat = useCallback(
    (index: number, beats: LiveBeat[]) => {
      if (!beats.length) {
        return;
      }
      const frame = beatStartFrame(beats, index);
      seekPreviewToFrame(
        frame,
        `Beat ${index + 1} · seek ${(frame / 30).toFixed(1)}s (frame ${frame})`,
        { resumePlayback: previewPlayingRef.current },
      );
    },
    [seekPreviewToFrame],
  );

  const seekPreviewFromSpoken = useCallback(
    (frame: number, label: string, options?: RemotionSeekOptions) => {
      seekPreviewToFrame(frame, label, {
        resumePlayback: options?.resumePlayback ?? previewPlayingRef.current,
      });
    },
    [seekPreviewToFrame],
  );

  const selectBeat = useCallback(
    (index: number) => {
      setActiveIndex(index);
      if (!live?.beats.length) {
        return;
      }
      seekPreviewToBeat(index, live.beats);
    },
    [live?.beats, seekPreviewToBeat],
  );

  // Track Remotion scrub position so variant/save remounts can restore it.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      const record =
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : null;
      if (!record || record.type !== "turn-outdoor-align-frame") {
        return;
      }
      if (typeof record.compositionId === "string" && record.compositionId !== scriptId) {
        return;
      }
      const frame = Number(record.frame);
      if (!Number.isFinite(frame)) {
        return;
      }
      if (typeof record.playing === "boolean") {
        previewPlayingRef.current = record.playing;
      }
      lastPreviewFrameRef.current = Math.max(0, Math.round(frame));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [scriptId]);

  // Re-seek after Remotion remount (variant switch / save bumps previewRevision).
  // Prefer the scrubbed frame so mid-beat viewing is not reset to beat start.
  useEffect(() => {
    if (!live?.beats.length || previewRevision === 0) {
      return;
    }
    const beats = live.beats;
    const restoreTo = lastPreviewFrameRef.current;
    const timer = setTimeout(() => {
      const index = activeIndexRef.current;
      const start = beatStartFrame(beats, index);
      const frame =
        typeof restoreTo === "number" && restoreTo >= 0 ? restoreTo : start;
      seekPreviewToFrame(
        frame,
        typeof restoreTo === "number" && restoreTo !== start
          ? `Beat ${index + 1} · restore ${(frame / 30).toFixed(1)}s (frame ${frame})`
          : `Beat ${index + 1} · seek ${(frame / 30).toFixed(1)}s (frame ${frame})`,
      );
    }, 900);
    return () => clearTimeout(timer);
  }, [previewRevision, live?.beats, seekPreviewToFrame]);

  const pushSession = useCallback(
    (entry: Omit<AiSessionEntry, "id" | "at">) => {
      setAiSession((prev) => [
        {
          id: nowId(),
          at: new Date().toISOString(),
          ...entry,
        },
        ...prev,
      ]);
    },
    [],
  );

  const loadLive = useCallback(async () => {
    setError(null);
    try {
      const liveScript = await api.getLiveScript(scriptId);
      // Legacy URLs like #/script/sets-v2-04-set-equality → #/script/04-set-equality
      if (liveScript.id && liveScript.id !== scriptId) {
        navigateToScript(liveScript.id);
        return liveScript;
      }
      if (!dirtyRef.current) {
        setLive(liveScript);
        const styleKit = liveScript.styleKit ?? "compare";
        const [storedStudio, mdDoc] = await Promise.all([
          api.getBeatStudio(liveScript.id).catch(() => null),
          api.getAnimationMd(liveScript.id).catch(() => null),
        ]);
        const sessionStudio = readBeatStudioFromSession(liveScript.id);
        const stored = storedStudio ?? sessionStudio;
        const nextStudio = mdDoc?.markdown
          ? mergeBeatStudioWithAnimationMarkdown(
              stored,
              liveScript.id,
              mdDoc.markdown,
              liveScript.beats,
              styleKit,
            )
          : mergeBeatStudioWithLive(
              stored,
              liveScript.id,
              liveScript.beats,
              styleKit,
            );
        writeBeatStudioToSession(nextStudio);
        setBeatStudio(nextStudio);
        if (mdDoc?.markdown) {
          setPreviewFormat(inferFormatFromAnimationMd(mdDoc.markdown));
        }
        setDrafts(draftsFromSelectedCandidates(liveScript.beats, nextStudio));
        setActiveIndex((index) =>
          Math.min(index, Math.max(liveScript.beats.length - 1, 0)),
        );
      }
      setStatus(
        `Live from ${liveScript.source}${liveScript.updatedAt ? ` · ${liveScript.updatedAt}` : ""}`,
      );
      return liveScript;
    } catch (loadError) {
      setError(formatOutdoorApiError(loadError));
      setLive(null);
      return null;
    }
  }, [api, navigateToScript, scriptId]);

  useEffect(() => {
    setLoading(true);
    dirtyRef.current = false;
    setPreviewFormat("landscape");
    void loadLive().finally(() => setLoading(false));
  }, [scriptId, loadLive]);

  const styleKit = resolveStyleKit(live);
  const activeBeatState = beatStudio?.beats[String(activeIndex)];
  const activeCandidate = getSelectedCandidate(activeBeatState ?? undefined);

  const persistBeatStudio = useCallback((next: BeatStudioDocument) => {
    setBeatStudio(next);
    writeBeatStudioToSession(next);
  }, []);

  const displayBeats = useMemo(() => {
    const beats = live?.beats ?? [];
    if (!beats.length) {
      return [];
    }
    if (drafts.length === beats.length) {
      return beats.map((beat, index) => {
        const draft = drafts[index];
        if (!draft) {
          return beat;
        }
        return {
          ...beat,
          title: draft.title || beat.title,
          say: draft.say,
          chinese: draft.chinese,
          leanCode: draft.leanCode,
          turnCode: draft.turnCode,
          visualNotes: draft.visualNotes,
        };
      });
    }
    return liveBeatsWithSelectedCandidates(beats, beatStudio);
  }, [beatStudio, drafts, live?.beats]);

  const syncDraftFromCandidate = useCallback(
    (index: number, candidateId: string) => {
      if (!beatStudio || !live) {
        return;
      }
      const beatState = beatStudio.beats[String(index)];
      if (!beatState) {
        return;
      }
      const candidate = beatState.candidates.find(
        (entry) => entry.id === candidateId,
      );
      if (!candidate) {
        return;
      }
      const nextStudio: BeatStudioDocument = {
        ...beatStudio,
        updatedAt: new Date().toISOString(),
        beats: {
          ...beatStudio.beats,
          [String(index)]: selectCandidate(beatState, candidateId),
        },
      };
      setDrafts((prev) =>
        prev.map((draft, draftIndex) =>
          draftIndex === index ? candidate.content : draft,
        ),
      );
      persistBeatStudio(nextStudio);
      setPreviewRevision((value) => value + 1);
      void api.putBeatStudio(nextStudio).catch(() => undefined);
      void (async () => {
        try {
          const next = await api.putLiveBeat(scriptId, index, {
            title: candidate.content.title,
            say: candidate.content.say,
            leanCode: candidate.content.leanCode,
            turnCode: candidate.content.turnCode,
            visualNotes: encodeVisualNotesForSave(
              candidate.content.visualNotes,
              candidate,
            ),
            selectedVariant: candidate.label,
          });
          setLive(next);
          invalidateAll();
        } catch (switchError) {
          setError(formatOutdoorApiError(switchError));
        }
      })();
    },
    [api, beatStudio, invalidateAll, live, persistBeatStudio, scriptId],
  );

  const handleAddCandidate = useCallback(
    (index: number) => {
      if (!beatStudio || !live) {
        return;
      }
      const beatState = beatStudio.beats[String(index)];
      const beat = live.beats[index];
      if (!beatState || !beat) {
        return;
      }
      const selected = getSelectedCandidate(beatState);
      const label = nextCandidateLabel(beatState.candidates);
      const newCandidate = createCandidate(beat, styleKit, {
        label,
        template: selected?.template,
        templateConfig: selected?.templateConfig,
        content: selected?.content ?? draftFromLiveBeat(beat),
      });
      const nextBeatState = addCandidate(beatState, newCandidate);
      const nextStudio: BeatStudioDocument = {
        ...beatStudio,
        updatedAt: new Date().toISOString(),
        beats: {
          ...beatStudio.beats,
          [String(index)]: nextBeatState,
        },
      };
      dirtyRef.current = true;
      setDrafts((prev) =>
        prev.map((draft, draftIndex) =>
          draftIndex === index ? newCandidate.content : draft,
        ),
      );
      persistBeatStudio(nextStudio);
      setPreviewRevision((value) => value + 1);
      void api.putBeatStudio(nextStudio).catch(() => undefined);
      void (async () => {
        try {
          const visualNotes = encodeVisualNotesForSave(
            newCandidate.content.visualNotes,
            newCandidate,
          );
          const variantContent = {
            title: newCandidate.content.title,
            say: newCandidate.content.say,
            leanCode: newCandidate.content.leanCode,
            turnCode: newCandidate.content.turnCode,
            visualNotes,
          };
          const next = await api.putLiveBeat(scriptId, index, {
            ...variantContent,
            selectedVariant: label,
            addVariant: {
              label,
              template: newCandidate.template,
              templateConfig: newCandidate.templateConfig,
              content: variantContent,
            },
          });
          setLive(next);
          invalidateAll();
        } catch (addError) {
          setError(formatOutdoorApiError(addError));
        }
      })();
    },
    [api, beatStudio, invalidateAll, live, persistBeatStudio, scriptId, styleKit],
  );

  const updateDraft = useCallback(
    (index: number, patch: Partial<DraftBeat>) => {
      dirtyRef.current = true;
      setDrafts((prev) =>
        prev.map((beat, beatIndex) =>
          beatIndex === index ? { ...beat, ...patch } : beat,
        ),
      );
      setBeatStudio((prev) => {
        if (!prev) {
          return prev;
        }
        const beatState = prev.beats[String(index)];
        const candidate = getSelectedCandidate(beatState);
        if (!beatState || !candidate) {
          return prev;
        }
        const next = {
          ...prev,
          updatedAt: new Date().toISOString(),
          beats: {
            ...prev.beats,
            [String(index)]: updateCandidate(beatState, candidate.id, {
              content: { ...candidate.content, ...patch },
            }),
          },
        };
        writeBeatStudioToSession(next);
        return next;
      });
    },
    [],
  );

  const handleTemplateChange = useCallback(
    (kind: BeatTemplateKind) => {
      if (!beatStudio || !live) {
        return;
      }
      const beatState = beatStudio.beats[String(activeIndex)];
      const candidate = getSelectedCandidate(beatState);
      if (!beatState || !candidate) {
        return;
      }
      dirtyRef.current = true;
      const nextConfig = defaultTemplateConfig(kind);
      persistBeatStudio({
        ...beatStudio,
        updatedAt: new Date().toISOString(),
        beats: {
          ...beatStudio.beats,
          [String(activeIndex)]: updateCandidate(beatState, candidate.id, {
            template: kind,
            templateConfig: nextConfig,
          }),
        },
      });
      setPreviewRevision((value) => value + 1);
    },
    [activeIndex, beatStudio, live, persistBeatStudio],
  );

  const syncTemplateConfigPreview = useCallback(
    async (index: number, nextStudio: BeatStudioDocument) => {
      const draft = draftsRef.current[index];
      const beatState = nextStudio.beats[String(index)];
      const candidate = getSelectedCandidate(beatState);
      if (!draft || !beatState || !candidate) {
        return;
      }
      setPreviewRevision((value) => value + 1);
      void api.putBeatStudio(nextStudio).catch(() => undefined);
      try {
        const next = await api.putLiveBeat(scriptId, index, {
          title: draft.title,
          say: draft.say,
          chinese: draft.chinese,
          leanCode: draft.leanCode,
          turnCode: draft.turnCode,
          visualNotes: encodeVisualNotesForSave(draft.visualNotes, candidate),
          selectedVariant: candidate.label,
        });
        setLive(next);
        invalidateAll();
        setStatus(`Saved template config · compiled animation.md`);
      } catch (syncError) {
        setError(formatOutdoorApiError(syncError));
      }
    },
    [api, invalidateAll, scriptId],
  );

  const handleTemplateConfigChange = useCallback(
    (config: BeatTemplateConfig) => {
      if (!beatStudio) {
        return;
      }
      const beatState = beatStudio.beats[String(activeIndex)];
      const candidate = getSelectedCandidate(beatState);
      if (!beatState || !candidate) {
        return;
      }
      const previousConfig = candidate.templateConfig;
      dirtyRef.current = true;
      const nextStudio: BeatStudioDocument = {
        ...beatStudio,
        updatedAt: new Date().toISOString(),
        beats: {
          ...beatStudio.beats,
          [String(activeIndex)]: updateCandidate(beatState, candidate.id, {
            templateConfig: config,
          }),
        },
      };
      // Keep Remotion iframe mounted while tweaking stickers / CPS inputs.
      persistBeatStudio(nextStudio);
      if (!templateConfigNeedsRemotionSync(previousConfig, config)) {
        return;
      }
      if (templateConfigSyncTimerRef.current) {
        clearTimeout(templateConfigSyncTimerRef.current);
      }
      const beatIndex = activeIndex;
      templateConfigSyncTimerRef.current = setTimeout(() => {
        templateConfigSyncTimerRef.current = null;
        const latestStudio = beatStudioRef.current;
        if (!latestStudio) {
          return;
        }
        void syncTemplateConfigPreview(beatIndex, latestStudio);
      }, 400);
    },
    [activeIndex, beatStudio, persistBeatStudio, syncTemplateConfigPreview],
  );

  useEffect(() => {
    return () => {
      if (templateConfigSyncTimerRef.current) {
        clearTimeout(templateConfigSyncTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (templateConfigSyncTimerRef.current) {
      clearTimeout(templateConfigSyncTimerRef.current);
      templateConfigSyncTimerRef.current = null;
    }
  }, [activeIndex]);

  const saveBeat = useCallback(
    async (index: number) => {
      const draft = drafts[index];
      if (!draft) {
        return;
      }
      setSavingIndex(index);
      setError(null);
      const previousLive = live;
      const candidate = getSelectedCandidate(beatStudio?.beats[String(index)] ?? undefined);
      try {
        const next = await api.putLiveBeat(scriptId, index, {
          title: draft.title,
          say: draft.say,
          chinese: draft.chinese,
          leanCode: draft.leanCode,
          turnCode: draft.turnCode,
          visualNotes: candidate
            ? encodeVisualNotesForSave(draft.visualNotes, candidate)
            : draft.visualNotes,
          selectedVariant: candidate?.label,
        });
        setLive(next);
        const syncedDrafts = draftsFromLive(next.beats);
        setDrafts((prev) =>
          syncedDrafts.map((serverDraft, beatIndex) => {
            if (beatIndex === index) {
              // Keep editor fields for the beat we just saved; server visualNotes
              // still carry beat-studio metadata not shown in the title field.
              return draft;
            }
            const priorBeat = previousLive?.beats[beatIndex];
            const priorDraft = prev[beatIndex];
            if (
              priorBeat &&
              priorDraft &&
              draftDiffersFromBeat(priorDraft, priorBeat)
            ) {
              return priorDraft;
            }
            return serverDraft;
          }),
        );
        const stillDirty = previousLive?.beats.some((beat, beatIndex) => {
          if (beatIndex === index) {
            return false;
          }
          const priorDraft = drafts[beatIndex];
          return priorDraft ? draftDiffersFromBeat(priorDraft, beat) : false;
        });
        dirtyRef.current = Boolean(stillDirty);
        setStatus(`Saved beat ${index + 1} · compiled animation.md`);
        setPreviewRevision((value) => value + 1);
        invalidateAll();
      } catch (saveError) {
        setError(formatOutdoorApiError(saveError));
      } finally {
        setSavingIndex(null);
      }
    },
    [api, beatStudio, drafts, invalidateAll, live, scriptId],
  );

  const runAiUpdate = useCallback(
    async (apply: boolean) => {
      const prompt = instruction.trim();
      if (!prompt) {
        setError("Write an instruction for the AI first");
        return;
      }
      setAiBusy(true);
      setError(null);
      const beforeBeats = live?.beats ?? [];

      pushSession({
        kind: "user",
        message: prompt,
      });
      pushSession({
        kind: "status",
        message: apply
          ? "Updating script with local AI…"
          : "Drafting AI revision…",
      });

      try {
        const result = await api.aiEditAnimationMd(scriptId, {
          instruction: prompt,
          apply,
        });

        if (apply) {
          const reloaded = await loadLive();
          const afterBeats = reloaded?.beats ?? [];
          const changes = diffBeats(beforeBeats, afterBeats);

          if (changes.length) {
            pushSession({
              kind: "change",
              message: `Applied ${changes.length} change${changes.length === 1 ? "" : "s"}`,
              changes,
            });
            if (changes[0]) {
              setActiveIndex(changes[0].beatIndex);
            }
          } else {
            pushSession({
              kind: "status",
              message: "AI finished — no beat text changes detected",
            });
          }

          dirtyRef.current = false;
          setStatus(
            `AI update applied${result.document?.updatedAt ? ` · ${result.document.updatedAt}` : ""}`,
          );
          setPreviewRevision((value) => value + 1);
          invalidateAll();
        } else {
          pushSession({
            kind: "status",
            message: `Draft ready (${result.markdown.length} chars) — tap “Update script by AI” to apply`,
          });
          pushSession({
            kind: "change",
            message: truncate(result.markdown, 280),
          });
          setStatus("AI draft ready — review session log, then apply");
        }
      } catch (aiError) {
        const message = formatOutdoorApiError(aiError);
        pushSession({ kind: "error", message });
        setError(message);
      } finally {
        setAiBusy(false);
      }
    },
    [
      api,
      instruction,
      invalidateAll,
      live?.beats,
      loadLive,
      pushSession,
      scriptId,
    ],
  );

  const handlePreviewFormatChange = useCallback(
    async (nextFormat: OutdoorPreviewFormat) => {
      if (nextFormat === previewFormat || formatBusy) {
        return;
      }
      setFormatBusy(true);
      setError(null);
      try {
        const doc = await api.getAnimationMd(scriptId);
        const markdown = doc.markdown;
        if (!markdown.trim()) {
          throw new Error("animation.md not found — cannot set preview format");
        }
        const updated = applyFormatToAnimationMd(markdown, nextFormat);
        await api.putAnimationMd(scriptId, updated, true);
        setPreviewFormat(nextFormat);
        setPreviewRevision((value) => value + 1);
        setStatus(`Saved ${nextFormat} format · compiled animation.md`);
        invalidateAll();
      } catch (formatError) {
        setError(formatOutdoorApiError(formatError));
      } finally {
        setFormatBusy(false);
      }
    },
    [api, formatBusy, invalidateAll, previewFormat, scriptId],
  );

  const handleVoxcpmAll = useCallback(async () => {
    if (voxcpmAllBusy) {
      return;
    }
    setVoxcpmAllBusy(true);
    setError(null);
    try {
      const catalog = await api.getCatalog();
      const script = catalog.scripts.find((entry) => entry.scriptId === scriptId);
      const referenceTakeId =
        script?.takes.find((take) => take.hasSourceVideo)?.takeId ?? "";
      if (!referenceTakeId) {
        setError("Film a take first — voice clone needs a reference take.");
        return;
      }
      const { queued } = await queueVoxcpmPendingSentences(api, scriptId, {
        referenceTakeId,
        voiceEngine,
        scriptLanguage,
      });
      if (queued === 0) {
        setStatus(`Every beat already has latest ${VOICE_ENGINE_LABELS[voiceEngine]} voice`);
      } else {
        setStatus(
          `Queued ${VOICE_ENGINE_LABELS[voiceEngine]} for ${queued} pending sentence${queued === 1 ? "" : "s"}`,
        );
        setPreviewRevision((value) => value + 1);
      }
      invalidateAll();
    } catch (voxcpmError) {
      setError(formatOutdoorApiError(voxcpmError));
    } finally {
      setVoxcpmAllBusy(false);
    }
  }, [api, invalidateAll, scriptId, scriptLanguage, voiceEngine, voxcpmAllBusy]);

  const handleVoxcpmRegenerateAll = useCallback(async () => {
    if (voxcpmRegenerateBusy) {
      return;
    }
    setVoxcpmRegenerateBusy(true);
    setError(null);
    try {
      const catalog = await api.getCatalog();
      const script = catalog.scripts.find((entry) => entry.scriptId === scriptId);
      const referenceTakeId =
        script?.takes.find((take) => take.hasSourceVideo)?.takeId ?? "";
      if (!referenceTakeId) {
        setError("Film a take first — voice clone needs a reference take.");
        return;
      }
      const { queued } = await queueVoxcpmPendingSentences(api, scriptId, {
        referenceTakeId,
        voiceEngine,
        scriptLanguage,
        force: true,
      });
      setStatus(
        queued > 0
          ? `Regenerating ${queued} sentence${queued === 1 ? "" : "s"} with ${VOICE_ENGINE_LABELS[voiceEngine]}`
          : `No sentences to regenerate with ${VOICE_ENGINE_LABELS[voiceEngine]}`,
      );
      setPreviewRevision((value) => value + 1);
      invalidateAll();
    } catch (voxcpmError) {
      setError(formatOutdoorApiError(voxcpmError));
    } finally {
      setVoxcpmRegenerateBusy(false);
    }
  }, [api, invalidateAll, scriptId, scriptLanguage, voiceEngine, voxcpmRegenerateBusy]);

  useEffect(() => {
    if (scriptLanguage === "zh" && voiceEngine !== "voxcpm") {
      setVoiceEngine("voxcpm");
    }
  }, [scriptLanguage, setVoiceEngine, voiceEngine]);

  const refreshPreviewVoiceState = useCallback(async () => {
    try {
      const doc = await api.getVoxcpmEditor(scriptId, undefined, voiceEngine, scriptLanguage);
      setPreviewVoiceEngineState(doc.previewVoiceEngine ?? defaultVoiceEngine());
      setPreviewEnginesReady(
        doc.previewEnginesReady ?? { voxcpm: false, indextts: false },
      );
    } catch {
      // Preview metadata is optional until voice is generated.
    }
  }, [api, scriptId, scriptLanguage, voiceEngine]);

  useEffect(() => {
    if (!live) {
      return;
    }
    void refreshPreviewVoiceState();
  }, [live, previewRevision, refreshPreviewVoiceState]);

  const handlePreviewVoiceEngineChange = useCallback(
    async (engine: VoiceEngineId) => {
      if (previewVoiceBusy || engine === previewVoiceEngine) {
        return;
      }
      setPreviewVoiceBusy(true);
      setError(null);
      try {
        await api.setPreviewVoiceEngine(scriptId, engine);
        setPreviewVoiceEngineState(engine);
        setPreviewRevision((value) => value + 1);
        setStatus(`Remotion preview voice: ${VOICE_ENGINE_LABELS[engine]}`);
      } catch (previewError) {
        setError(formatOutdoorApiError(previewError));
      } finally {
        setPreviewVoiceBusy(false);
        void refreshPreviewVoiceState();
      }
    },
    [
      api,
      previewVoiceBusy,
      previewVoiceEngine,
      refreshPreviewVoiceState,
      scriptId,
    ],
  );

  const previewVoiceDisabledEngines = useMemo(
    () =>
      VOICE_ENGINE_IDS.filter((engine) => !(previewEnginesReady?.[engine] ?? false)),
    [previewEnginesReady],
  );

  const handleGenerateAiCloneTake = useCallback(async () => {
    if (generateCloneBusy) {
      return;
    }
    setGenerateCloneBusy(true);
    setError(null);
    try {
      const catalog = await api.getCatalog();
      const script = catalog.scripts.find((entry) => entry.scriptId === scriptId);
      const referenceTakeId =
        script?.takes.find((take) => take.hasSourceVideo)?.takeId ?? "";
      if (!referenceTakeId) {
        setError("Film a take first — VoxCPM needs a voice reference.");
        return;
      }
      const response = await api.startVoxcpmTrial(scriptId, {
        referenceTakeId,
        renderComposite: true,
      });
      invalidateAll();
      navigateToTake(scriptId, response.takeId);
    } catch (cloneError) {
      setError(formatOutdoorApiError(cloneError));
    } finally {
      setGenerateCloneBusy(false);
    }
  }, [api, generateCloneBusy, invalidateAll, navigateToTake, scriptId]);

  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const splitPreviewLayout = useMemo(
    () =>
      computeScriptRemotionPreviewSize(
        windowHeight,
        windowWidth,
        layout,
        "split",
        previewFormat,
      ),
    [layout, previewFormat, windowHeight, windowWidth],
  );

  return (
    <View style={[sharedStyles.screen, styles.screen]}>
      <Header
        title={live?.title ?? "Edit script"}
        actions={[
          {
            label: "Library",
            onPress: navigateToLibrary,
            variant: "back",
          },
          {
            label: "Film",
            onPress: () => {
              if (Platform.OS === "web") {
                navigateToFilm(scriptId);
                return;
              }
              onOpenFilm(scriptId);
            },
          },
          {
            label: generateCloneBusy ? "Creating…" : "Generate AI clone take",
            onPress: () => {
              void handleGenerateAiCloneTake();
            },
            variant: "primary",
            disabled: generateCloneBusy || loading || !live,
          },
          {
            label: "Post-process",
            onPress: () => navigateToPostProcess(scriptId),
          },
          { label: "AI URL", onPress: navigateToPlatforms },
        ]}
      />

      <View
        style={[
          layoutStyles.main,
          styles.main,
          layout === "browser" ? styles.mainBrowser : null,
        ]}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.orange} />
          </View>
        ) : (
          <View style={styles.workspace}>
            <View style={styles.editorStage}>
              {error ? (
                <View style={styles.errorBlock}>
                  <Text style={styles.error}>{error}</Text>
                  <Text style={styles.errorHint}>
                    Script ids no longer include the series prefix (e.g. use
                    #/script/04-set-equality, not sets-v2-04-set-equality). Open
                    the script from the library if this bookmark is stale.
                  </Text>
                </View>
              ) : null}
              <View style={styles.previewToolbar}>
                {seekStatus ? (
                  <Text style={styles.status} numberOfLines={1}>
                    {seekStatus}
                  </Text>
                ) : !error && status ? (
                  <Text style={styles.status} numberOfLines={1}>
                    {status}
                  </Text>
                ) : (
                  <View style={styles.previewToolbarSpacer} />
                )}
                <View style={styles.previewToolbarActions}>
                  <LanguageToggle
                    value={scriptLanguage}
                    onChange={setScriptLanguage}
                    disabled={loading || !live}
                  />
                  <VoiceEngineToggle
                    value={voiceEngine}
                    onChange={setVoiceEngine}
                    disabled={loading || !live || scriptLanguage === "zh"}
                  />
                  <VoiceEngineToggle
                    label="Remotion"
                    value={previewVoiceEngine}
                    onChange={(engine) => {
                      void handlePreviewVoiceEngineChange(engine);
                    }}
                    disabled={loading || !live || previewVoiceBusy}
                    disabledEngines={previewVoiceDisabledEngines}
                  />
                  <Button
                    label={
                      voxcpmAllBusy
                        ? "Queuing…"
                        : `${VOICE_ENGINE_LABELS[voiceEngine].toLowerCase()} all`
                    }
                    variant="primary"
                    disabled={voxcpmAllBusy || loading || !live}
                    onPress={() => {
                      void handleVoxcpmAll();
                    }}
                  />
                  <Button
                    label={
                      voxcpmRegenerateBusy
                        ? "Regenerating…"
                        : `Regenerate ${VOICE_ENGINE_LABELS[voiceEngine].toLowerCase()} all`
                    }
                    disabled={voxcpmRegenerateBusy || loading || !live}
                    onPress={() => {
                      void handleVoxcpmRegenerateAll();
                    }}
                  />
                  <OrientationToggle
                    value={previewFormat}
                    onChange={(format) => {
                      void handlePreviewFormatChange(format);
                    }}
                    disabled={formatBusy || loading || !live}
                  />
                </View>
              </View>

              {live ? (
                layout === "mobile" ? (
                  <ScrollView
                    style={styles.mobileScroll}
                    contentContainerStyle={styles.mobileScrollBody}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    nestedScrollEnabled
                  >
                    <View style={styles.mobilePreviewBlock}>
                      <ScriptRemotionPreview
                        ref={previewRef}
                        scriptId={scriptId}
                        revision={previewRevision}
                        previewFormat={previewFormat}
                      />
                    </View>
                    <ScriptBeatEditorPanel
                      beats={live.beats}
                      drafts={drafts}
                      activeIndex={activeIndex}
                      onActiveIndexChange={selectBeat}
                      onDraftChange={updateDraft}
                      onSaveBeat={(index) => {
                        void saveBeat(index);
                      }}
                      savingIndex={savingIndex}
                      hideBeatList
                      embedInParentScroll
                      styleKit={styleKit}
                      beatTemplate={activeCandidate?.template}
                      templateConfig={activeCandidate?.templateConfig}
                      onTemplateChange={handleTemplateChange}
                      onTemplateConfigChange={handleTemplateConfigChange}
                      scriptId={scriptId}
                      voiceEngine={voiceEngine}
                      scriptLanguage={scriptLanguage}
                      onPreviewAudioChanged={() => {
                        void refreshPreviewVoiceState();
                      }}
                      onSeekPreviewFrame={seekPreviewFromSpoken}
                    />
                    {activeBeatState ? (
                      <BeatCandidateRail
                        candidates={activeBeatState.candidates}
                        selectedCandidateId={
                          activeBeatState.selectedCandidateId
                        }
                        onSelect={(candidateId) =>
                          syncDraftFromCandidate(activeIndex, candidateId)
                        }
                        onAdd={() => handleAddCandidate(activeIndex)}
                      />
                    ) : null}
                    <View style={styles.storyboardFull}>
                      <BeatOverviewStrip
                        beats={displayBeats}
                        styleKit={styleKit}
                        activeIndex={activeIndex}
                        onSelect={selectBeat}
                        beatStudio={beatStudio}
                      />
                    </View>
                    <ScriptCoversPanel scriptId={scriptId} compact />
                  </ScrollView>
                ) : (
                  <View style={styles.editorWrap}>
                    <View
                      style={[
                        styles.topRow,
                        styles.topRowBrowser,
                        {
                          height: splitPreviewLayout.blockHeight,
                          maxHeight: splitPreviewLayout.blockHeight,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.previewColumn,
                          styles.previewColumnBrowser,
                        ]}
                      >
                        <ScriptRemotionPreview
                          ref={previewRef}
                          scriptId={scriptId}
                          revision={previewRevision}
                          layoutVariant="split"
                          previewFormat={previewFormat}
                        />
                      </View>
                      <View style={styles.editColumn}>
                        <View style={styles.editRow}>
                          {activeBeatState ? (
                            <BeatCandidateRail
                              layout="vertical"
                              candidates={activeBeatState.candidates}
                              selectedCandidateId={
                                activeBeatState.selectedCandidateId
                              }
                              onSelect={(candidateId) =>
                                syncDraftFromCandidate(activeIndex, candidateId)
                              }
                              onAdd={() => handleAddCandidate(activeIndex)}
                            />
                          ) : null}
                          <View style={styles.editPanel}>
                            <ScriptBeatEditorPanel
                              beats={live.beats}
                              drafts={drafts}
                              activeIndex={activeIndex}
                              onActiveIndexChange={selectBeat}
                              onDraftChange={updateDraft}
                              onSaveBeat={(index) => {
                                void saveBeat(index);
                              }}
                              savingIndex={savingIndex}
                              hideBeatList
                              styleKit={styleKit}
                              beatTemplate={activeCandidate?.template}
                              templateConfig={activeCandidate?.templateConfig}
                              onTemplateChange={handleTemplateChange}
                              onTemplateConfigChange={handleTemplateConfigChange}
                              scriptId={scriptId}
                              voiceEngine={voiceEngine}
                              scriptLanguage={scriptLanguage}
                              onPreviewAudioChanged={() => {
                                void refreshPreviewVoiceState();
                              }}
                              onSeekPreviewFrame={seekPreviewFromSpoken}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                    <View style={styles.storyboardFull}>
                      <BeatOverviewStrip
                        beats={displayBeats}
                        styleKit={styleKit}
                        activeIndex={activeIndex}
                        onSelect={selectBeat}
                        beatStudio={beatStudio}
                      />
                    </View>
                    <ScriptCoversPanel scriptId={scriptId} compact />
                  </View>
                )
              ) : null}
            </View>

            <View style={styles.bottomChrome}>
              {sessionOpen ? (
                <ScrollView
                  style={styles.sessionScroll}
                  contentContainerStyle={styles.sessionBody}
                  nestedScrollEnabled
                >
                  {aiSession.length === 0 ? (
                    <Text style={styles.sessionEmpty}>No AI edits yet.</Text>
                  ) : (
                    aiSession.map((entry) => (
                      <View
                        key={entry.id}
                        style={[
                          styles.sessionEntry,
                          entry.kind === "error"
                            ? styles.sessionError
                            : entry.kind === "change"
                              ? styles.sessionChange
                              : entry.kind === "user"
                                ? styles.sessionUser
                                : styles.sessionStatus,
                        ]}
                      >
                        <Text style={styles.sessionMessage} numberOfLines={3}>
                          {entry.kind === "user"
                            ? `› ${entry.message}`
                            : entry.message}
                        </Text>
                        {entry.changes?.slice(0, 3).map((change) => (
                          <Text
                            key={`${entry.id}-${change.beatIndex}-${change.field}`}
                            style={styles.sessionDiff}
                            numberOfLines={1}
                          >
                            {formatChangeLine(change)}
                          </Text>
                        ))}
                      </View>
                    ))
                  )}
                </ScrollView>
              ) : null}

              <View style={styles.aiDock}>
                <TextInput
                  style={styles.aiPrompt}
                  value={instruction}
                  onChangeText={setInstruction}
                  placeholder="AI instruction…"
                  placeholderTextColor={colors.muted}
                  editable={!aiBusy}
                  returnKeyType="done"
                />
                <View style={styles.aiActions}>
                  <Button
                    label={aiBusy ? "…" : "AI"}
                    variant="primary"
                    disabled={aiBusy || loading}
                    onPress={() => {
                      void runAiUpdate(true);
                    }}
                  />
                  <Button
                    label={aiBusy ? "…" : "Preview"}
                    disabled={aiBusy || loading || !instruction.trim()}
                    onPress={() => {
                      void runAiUpdate(false);
                    }}
                  />
                  <Pressable
                    style={styles.sessionToggle}
                    onPress={() => setSessionOpen((open) => !open)}
                  >
                    <Text style={styles.sessionToggleText}>
                      Log{aiSession.length ? ` (${aiSession.length})` : ""}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    height: "100%",
    minHeight: 0,
  },
  main: {
    flex: 1,
    minHeight: 0,
    paddingTop: 4,
    paddingBottom: 0,
  },
  mainBrowser: {
    maxWidth: 1440,
    width: "100%",
    alignSelf: "center",
    flex: 1,
    minHeight: 0,
  },
  workspace: {
    flex: 1,
    minHeight: 0,
    flexDirection: "column",
  },
  editorStage: {
    flex: 1,
    minHeight: 0,
    flexDirection: "column",
    gap: 2,
    overflow: "hidden",
  },
  editorWrap: {
    flex: 1,
    minHeight: 0,
    gap: spacing.sm,
    overflow: "hidden",
  },
  mobileScroll: {
    flex: 1,
    minHeight: 0,
  },
  mobileScrollBody: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  mobilePreviewBlock: {
    width: "100%",
    alignItems: "center",
  },
  topRow: {
    flexGrow: 0,
    flexShrink: 0,
    gap: spacing.sm,
    overflow: "hidden",
  },
  topRowBrowser: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  previewColumn: {
    flexShrink: 0,
  },
  previewColumnBrowser: {
    height: "100%",
  },
  editColumn: {
    flex: 1,
    flexBasis: 420,
    minWidth: 280,
    minHeight: 0,
    overflow: "hidden",
  },
  editRow: {
    flex: 1,
    minHeight: 0,
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.xs,
    overflow: "hidden",
  },
  editPanel: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  },
  storyboardFull: {
    width: "100%",
    flexShrink: 0,
  },
  bottomChrome: {
    flexShrink: 0,
    width: "100%",
    zIndex: 20,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  aiDock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 0,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.headerBg,
  },
  aiPrompt: {
    flex: 1,
    height: 34,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    color: colors.text,
    fontSize: typography.small,
    backgroundColor: colors.card,
  },
  aiActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 0,
  },
  sessionToggle: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(51, 65, 85, 0.9)",
  },
  sessionToggleText: {
    color: colors.muted,
    fontSize: typography.tiny,
    fontWeight: "700",
  },
  sessionScroll: {
    maxHeight: 88,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    backgroundColor: "rgba(2, 6, 23, 0.45)",
  },
  sessionBody: {
    padding: spacing.xs,
    gap: 4,
  },
  sessionEmpty: {
    color: colors.muted,
    fontSize: typography.tiny,
    padding: spacing.xs,
  },
  sessionEntry: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 2,
  },
  sessionUser: {
    backgroundColor: "rgba(30, 41, 59, 0.85)",
  },
  sessionStatus: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
  },
  sessionChange: {
    backgroundColor: "rgba(22, 101, 52, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(134, 239, 172, 0.25)",
  },
  sessionError: {
    backgroundColor: "rgba(127, 29, 29, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(252, 165, 165, 0.35)",
  },
  sessionKind: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sessionMessage: {
    color: colors.text,
    fontSize: typography.tiny,
    lineHeight: 15,
  },
  sessionDiff: {
    color: "#cbd5e1",
    fontSize: 10,
    lineHeight: 14,
  },
  status: {
    color: colors.online,
    fontSize: typography.tiny,
    fontWeight: "600",
    flex: 1,
    minWidth: 0,
  },
  errorBlock: {
    gap: 4,
    marginBottom: spacing.xs,
  },
  previewToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    flexShrink: 0,
    marginBottom: spacing.xs,
  },
  previewToolbarSpacer: {
    flex: 1,
  },
  previewToolbarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 0,
  },
  errorHint: {
    color: colors.muted,
    fontSize: typography.tiny,
    lineHeight: 16,
  },
  error: {
    color: colors.offline,
    fontSize: typography.tiny,
    fontWeight: "600",
    flexShrink: 0,
    marginBottom: 2,
  },
});
