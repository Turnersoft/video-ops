export type { SpokenSentencesFieldProps } from './SpokenSentencesField.types';

import classes from './SpokenSentencesField.module.scss';
import { webModuleStyle } from '../../utils/webClassName';
import type { SpokenSentencesFieldProps } from './SpokenSentencesField.types';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { colors } from '../../theme';
import type { VoxcpmEditorBeat, VoxcpmEditorSentence } from '../../types';
import {
  VOXCPM_TONE_PRESETS,
  joinVoxcpmSentences,
  reconcileVoxcpmSentences,
  voxcpmSentenceFingerprint,
  voxcpmVoiceMetadataFromSentences,
  type VoxcpmToneId,
} from '../../utils/voxcpmScript';
import { Button } from '../Button/Button';
import { SectionLabel } from '../SectionLabel/SectionLabel';
import {
  queueVoxcpmPendingSentences,
  voxcpmSentenceNeedsRender,
} from '../../utils/queueVoxcpmPending';
import { sentenceStartFrame } from '../../utils/sentenceSeek';
import { VOICE_ENGINE_LABELS } from '../../utils/voiceEngine';

type ToneMenuPosition = {
  top: number;
  left: number;
  width: number;
};

function toEditorSentences(
  say: string,
  beatIndex: number,
  previous?: VoxcpmEditorSentence[],
): VoxcpmEditorSentence[] {
  const stored = previous?.length
    ? voxcpmVoiceMetadataFromSentences(previous)
    : undefined;
  return reconcileVoxcpmSentences(say, beatIndex, stored).map((sentence) => {
    const prior = previous?.find((candidate) => candidate.id === sentence.id);
    if (
      prior &&
      prior.text === sentence.text &&
      prior.tone === sentence.tone &&
      prior.pauseAfterMs === sentence.pauseAfterMs
    ) {
      return prior;
    }
    return {
      ...sentence,
      status: 'idle' as const,
      hasLatestAudio: false,
      progressPercent: 0,
      audioUrl: null,
      durationSeconds: null,
      error: null,
    };
  });
}

function statusClass(sentence: VoxcpmEditorSentence): string {
  if (sentence.status === 'failed') {
    return classes.statusFailed;
  }
  if (sentence.hasLatestAudio || sentence.status === 'ready') {
    return classes.statusReady;
  }
  if (sentence.status === 'queued' || sentence.status === 'rendering') {
    return classes.statusBusy;
  }
  return classes.status;
}

function statusLabel(sentence: VoxcpmEditorSentence): string {
  switch (sentence.status) {
    case 'ready':
      return sentence.durationSeconds
        ? `Ready ${sentence.durationSeconds.toFixed(1)}s`
        : 'Ready';
    case 'rendering':
      return `Rendering ${Math.round(sentence.progressPercent)}%`;
    case 'queued':
      return 'Queued';
    case 'failed':
      return 'Failed';
    case 'idle':
      return sentence.hasLatestAudio ? 'Ready' : 'Pending';
    default: {
      const exhaustive: never = sentence.status;
      return exhaustive;
    }
  }
}

function ToneDropdown({
  tone,
  onChange,
}: {
  tone: VoxcpmToneId;
  onChange: (tone: VoxcpmToneId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<ToneMenuPosition | null>(null);
  const buttonRef = useRef<View | null>(null);
  const menuRef = useRef<View | null>(null);
  const preset =
    VOXCPM_TONE_PRESETS.find((candidate) => candidate.id === tone) ??
    VOXCPM_TONE_PRESETS[0];

  const updateMenuPosition = useCallback(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    const node = buttonRef.current as unknown as HTMLElement | null;
    if (!node?.getBoundingClientRect) {
      return;
    }
    const rect = node.getBoundingClientRect();
    const width = Math.max(118, rect.width);
    const left = Math.min(
      Math.max(8, rect.right - width),
      window.innerWidth - width - 8,
    );
    setMenuPosition({
      top: rect.bottom + 2,
      left,
      width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
    if (Platform.OS !== 'web') {
      return;
    }
    const onReposition = () => updateMenuPosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open || Platform.OS !== 'web') {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const buttonNode = buttonRef.current as unknown as Node | null;
      const menuNode = menuRef.current as unknown as Node | null;
      if (buttonNode?.contains(target) || menuNode?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const menu = open ? (
    <View
      ref={menuRef}
      style={[
        webModuleStyle(classes.toneMenu, classes.toneMenuPortal),
        menuPosition
          ? {
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }
          : null,
      ]}
    >
      {VOXCPM_TONE_PRESETS.map((option) => {
        const active = option.id === tone;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="menuitem"
            accessibilityLabel={option.label}
            onPress={() => {
              onChange(option.id);
              setOpen(false);
            }}
            style={webModuleStyle(
              classes.toneOption,
              active ? classes.toneOptionActive : null,
            )}
          >
            <View
              style={[
                webModuleStyle(classes.toneDot),
                { backgroundColor: option.color },
              ]}
            />
            <Text style={webModuleStyle(classes.toneOptionLabel)}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  ) : null;

  return (
    <View
      ref={buttonRef}
      style={webModuleStyle(classes.toneWrap, open ? classes.toneWrapOpen : null)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Voice color ${preset.label}`}
        onPress={() => setOpen((value) => !value)}
        style={webModuleStyle(classes.toneButton)}
      >
        <View
          style={[webModuleStyle(classes.toneDot), { backgroundColor: preset.color }]}
        />
        <Text style={webModuleStyle(classes.toneLabel)} numberOfLines={1}>
          {preset.label}
        </Text>
        <Text style={webModuleStyle(classes.toneCaret)}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open && Platform.OS === 'web' && typeof document !== 'undefined'
        ? createPortal(menu, document.body)
        : menu}
    </View>
  );
}

export function SpokenSentencesField({
  scriptId,
  beatIndex,
  say,
  beats,
  voiceEngine,
  scriptLanguage,
  onDraftChange,
  onPreviewAudioChanged,
  onSeekPreviewFrame,
}: SpokenSentencesFieldProps) {
  const { api } = useOutdoorUi();
  const voiceEngineRef = useRef(voiceEngine);
  const scriptLanguageRef = useRef(scriptLanguage);
  const [sentences, setSentences] = useState<VoxcpmEditorSentence[]>(() =>
    toEditorSentences(say, beatIndex),
  );
  const [beatDurationSeconds, setBeatDurationSeconds] = useState<number | null>(null);
  const sentencesRef = useRef(sentences);
  const [referenceTakeId, setReferenceTakeId] = useState('');
  const referenceTakeIdRef = useRef('');
  const [error, setError] = useState<string | null>(null);
  const [queueBusy, setQueueBusy] = useState(false);
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const previewRevisionRef = useRef<string | null>(null);
  const suppressSaySyncRef = useRef(false);

  useEffect(() => {
    voiceEngineRef.current = voiceEngine;
  }, [voiceEngine]);

  useEffect(() => {
    scriptLanguageRef.current = scriptLanguage;
  }, [scriptLanguage]);

  useEffect(() => {
    sentencesRef.current = sentences;
  }, [sentences]);

  useEffect(() => {
    referenceTakeIdRef.current = referenceTakeId;
  }, [referenceTakeId]);

  const applyBeat = useCallback((beat: VoxcpmEditorBeat | undefined) => {
    if (!beat) {
      return;
    }
    setBeatDurationSeconds(beat.beatDurationSeconds);
    setSentences((current) => {
      if (pendingIdsRef.current.size === 0) {
        return beat.sentences;
      }
      return beat.sentences.map((server) => {
        if (!pendingIdsRef.current.has(server.id)) {
          return server;
        }
        return current.find((candidate) => candidate.id === server.id) ?? server;
      });
    });
  }, []);

  const refresh = useCallback(async () => {
    const doc = await api.getVoxcpmEditor(
      scriptId,
      referenceTakeIdRef.current || undefined,
      voiceEngineRef.current,
      scriptLanguageRef.current,
    );
    if (!referenceTakeIdRef.current && doc.referenceTakeId) {
      setReferenceTakeId(doc.referenceTakeId);
      referenceTakeIdRef.current = doc.referenceTakeId;
    }
    applyBeat(doc.beats[beatIndex]);
    const previousRevision = previewRevisionRef.current;
    if (previousRevision === null) {
      previewRevisionRef.current = doc.previewRevision;
    } else if (doc.previewRevision !== previousRevision) {
      previewRevisionRef.current = doc.previewRevision;
      onPreviewAudioChanged?.();
    }
    return doc;
  }, [api, applyBeat, beatIndex, onPreviewAudioChanged, scriptId, voiceEngine, scriptLanguage]);

  useEffect(() => {
    let cancelled = false;
    void api
      .getCatalog()
      .then(async (catalog) => {
        const script = catalog.scripts.find((entry) => entry.scriptId === scriptId);
        const takeId =
          script?.takes.find((take) => take.hasSourceVideo)?.takeId ?? '';
        if (cancelled) {
          return;
        }
        setReferenceTakeId(takeId);
        referenceTakeIdRef.current = takeId;
        await refresh();
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, refresh, scriptId, voiceEngine, scriptLanguage]);

  useEffect(() => {
    const busy = sentences.some(
      (sentence) =>
        sentence.status === 'queued' || sentence.status === 'rendering',
    );
    if (!busy) {
      return;
    }
    const timer = setInterval(() => {
      void refresh().catch(() => {
        // Keep polling; next tick may recover.
      });
    }, 1200);
    return () => clearInterval(timer);
  }, [refresh, sentences]);

  useEffect(() => {
    if (suppressSaySyncRef.current) {
      suppressSaySyncRef.current = false;
      return;
    }
    const joined = joinVoxcpmSentences(sentencesRef.current);
    if (joined === say.trim()) {
      return;
    }
    setSentences(toEditorSentences(say, beatIndex, sentencesRef.current));
  }, [beatIndex, say]);

  const flush = useCallback(
    (renderChanges = true) => {
      if (pendingIdsRef.current.size === 0 && !dirtyRef.current) {
        return saveChainRef.current;
      }
      const sentenceIds = [...pendingIdsRef.current];
      const payload = sentencesRef.current.map((sentence) => ({
        id: sentence.id,
        text: sentence.text,
        tone: sentence.tone,
        pauseAfterMs: sentence.pauseAfterMs,
      }));
      pendingIdsRef.current = new Set();
      dirtyRef.current = false;
      saveChainRef.current = saveChainRef.current
        .then(async () => {
          setError(null);
          await api.putVoxcpmEditorBeat(
            scriptId,
            beatIndex,
            payload,
            referenceTakeIdRef.current || undefined,
            voiceEngineRef.current,
            scriptLanguageRef.current,
          );
          if (renderChanges && referenceTakeIdRef.current) {
            await Promise.all(
              sentenceIds.map((sentenceId) =>
                api.renderVoxcpmEditorSentence(
                  scriptId,
                  beatIndex,
                  sentenceId,
                  referenceTakeIdRef.current,
                  {
                    voiceEngine: voiceEngineRef.current,
                    scriptLanguage: scriptLanguageRef.current,
                  },
                ),
              ),
            );
          }
          await refresh();
        })
        .catch((saveError) => {
          dirtyRef.current = true;
          sentenceIds.forEach((id) => pendingIdsRef.current.add(id));
          setError(saveError instanceof Error ? saveError.message : String(saveError));
        });
      return saveChainRef.current;
    },
    [api, beatIndex, refresh, scriptId],
  );

  const scheduleSave = useCallback(
    (sentenceIds: string[]) => {
      sentenceIds.forEach((id) => pendingIdsRef.current.add(id));
      dirtyRef.current = true;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        void flush(true);
      }, 900);
    },
    [flush],
  );

  const commitLocal = useCallback(
    (next: VoxcpmEditorSentence[], changedIds: string[]) => {
      sentencesRef.current = next;
      setSentences(next);
      const joined = joinVoxcpmSentences(next);
      suppressSaySyncRef.current = true;
      onDraftChange(
        scriptLanguageRef.current === 'zh' ? { chinese: joined } : { say: joined },
      );
      scheduleSave(changedIds);
    },
    [onDraftChange, scheduleSave],
  );

  const updateSentence = useCallback(
    (
      sentenceId: string,
      patch: Partial<Pick<VoxcpmEditorSentence, 'text' | 'tone'>>,
    ) => {
      const next = sentencesRef.current.map((sentence) => {
        if (sentence.id !== sentenceId) {
          return sentence;
        }
        const text = patch.text ?? sentence.text;
        return {
          ...sentence,
          ...patch,
          text,
          fingerprint: voxcpmSentenceFingerprint(text),
          status: 'idle' as const,
          hasLatestAudio: false,
          progressPercent: 0,
          audioUrl: null,
          durationSeconds: null,
          error: null,
        };
      });
      commitLocal(next, [sentenceId]);
    },
    [commitLocal],
  );

  const markSentencesQueued = useCallback((sentenceIds: Set<string>) => {
    if (sentenceIds.size === 0) {
      return;
    }
    setSentences((current) => {
      const next = current.map((sentence) =>
        sentenceIds.has(sentence.id)
          ? {
              ...sentence,
              status: 'queued' as const,
              hasLatestAudio: false,
              progressPercent: Math.max(8, sentence.progressPercent),
              error: null,
            }
          : sentence,
      );
      sentencesRef.current = next;
      return next;
    });
  }, []);

  const queueBeatVoice = useCallback(
    async (force = false) => {
      if (!referenceTakeIdRef.current) {
        setError('Film a take first — voice clone needs a reference take.');
        return;
      }
      setQueueBusy(true);
      setError(null);
      try {
        await flush(false);
        const pendingIds = new Set(
          force
            ? sentencesRef.current.map((sentence) => sentence.id)
            : sentencesRef.current
                .filter(voxcpmSentenceNeedsRender)
                .map((sentence) => sentence.id),
        );
        markSentencesQueued(pendingIds);
        const { queued } = await queueVoxcpmPendingSentences(api, scriptId, {
          referenceTakeId: referenceTakeIdRef.current,
          beatIndex,
          voiceEngine: voiceEngineRef.current,
          scriptLanguage: scriptLanguageRef.current,
          force,
        });
        if (queued === 0) {
          setError(
            force
              ? 'Nothing to regenerate for this beat.'
              : 'This beat already has latest voice for every sentence.',
          );
        }
        await refresh();
      } catch (queueError) {
        setError(queueError instanceof Error ? queueError.message : String(queueError));
      } finally {
        setQueueBusy(false);
      }
    },
    [api, beatIndex, flush, markSentencesQueued, refresh, scriptId],
  );

  const regenerateSentence = useCallback(
    async (sentenceId: string) => {
      if (!referenceTakeIdRef.current) {
        setError('Film a take first — voice clone needs a reference take.');
        return;
      }
      setError(null);
      try {
        await flush(false);
        markSentencesQueued(new Set([sentenceId]));
        await api.renderVoxcpmEditorSentence(
          scriptId,
          beatIndex,
          sentenceId,
          referenceTakeIdRef.current,
          {
            force: true,
            voiceEngine: voiceEngineRef.current,
            scriptLanguage: scriptLanguageRef.current,
          },
        );
        await refresh();
      } catch (renderError) {
        setError(renderError instanceof Error ? renderError.message : String(renderError));
      }
    },
    [api, beatIndex, flush, markSentencesQueued, refresh, scriptId],
  );

  const readyCount = sentences.filter((sentence) => sentence.hasLatestAudio).length;
  const pendingCount = sentences.filter(voxcpmSentenceNeedsRender).length;
  const busyCount = sentences.filter(
    (sentence) =>
      sentence.status === 'queued' || sentence.status === 'rendering',
  ).length;
  const voiceDisabled = !referenceTakeId || queueBusy;

  const seekSentence = useCallback(
    (sentenceIndex: number) => {
      if (!onSeekPreviewFrame || !beats.length) {
        return;
      }
      const frame = sentenceStartFrame(beats, beatIndex, sentencesRef.current, sentenceIndex);
      const seconds = (frame / 30).toFixed(1);
      const text = sentencesRef.current[sentenceIndex]?.text ?? '';
      onSeekPreviewFrame(
        frame,
        `${text.slice(0, 48)} · ${seconds}s (frame ${frame})`,
        { resumePlayback: true },
      );
    },
    [beatIndex, beats, onSeekPreviewFrame],
  );

  return (
    <View style={webModuleStyle(classes.root)}>
      <View style={webModuleStyle(classes.header)}>
        <SectionLabel className={classes.boxLabel}>Spoken</SectionLabel>
        <View style={webModuleStyle(classes.headerMeta)}>
          <Text style={webModuleStyle(classes.meta)}>
            {readyCount}/{sentences.length} rendered
            {pendingCount ? ` · ${pendingCount} pending` : ''}
            {beatDurationSeconds != null ? ` · ${beatDurationSeconds.toFixed(1)}s beat` : ''}
            {busyCount ? ` · ${busyCount} generating` : ''}
            {!referenceTakeId ? ' · film a take for voice' : ''}
          </Text>
          <View style={webModuleStyle(classes.headerActions)}>
            <Button
              label={
                queueBusy
                  ? 'Queuing…'
                  : `${VOICE_ENGINE_LABELS[voiceEngine].toLowerCase()} beat`
              }
              disabled={voiceDisabled || pendingCount === 0}
              onPress={() => {
                void queueBeatVoice(false);
              }}
            />
            <Button
              label={
                queueBusy
                  ? 'Regenerating…'
                  : `Regenerate ${VOICE_ENGINE_LABELS[voiceEngine].toLowerCase()}`
              }
              disabled={voiceDisabled}
              onPress={() => {
                void queueBeatVoice(true);
              }}
            />
          </View>
        </View>
      </View>
      <View style={webModuleStyle(classes.list)}>
        {sentences.map((sentence, sentenceIndex) => {
          const tone =
            VOXCPM_TONE_PRESETS.find((candidate) => candidate.id === sentence.tone) ??
            VOXCPM_TONE_PRESETS[0];
          const canSeek = Boolean(onSeekPreviewFrame && beats.length > 0);
          return (
            <View
              key={sentence.id}
              style={[
                webModuleStyle(classes.row, canSeek ? classes.rowSeekable : null),
                { borderLeftColor: tone.color },
              ]}
            >
              <TextInput
                style={webModuleStyle(classes.sentenceInput)}
                value={sentence.text}
                multiline
                onChangeText={(text) => updateSentence(sentence.id, { text })}
                placeholder="Sentence…"
                placeholderTextColor={colors.muted}
              />
              <View style={webModuleStyle(classes.rightCol)}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Seek Remotion to sentence ${sentenceIndex + 1}`}
                  disabled={!canSeek}
                  onPress={() => seekSentence(sentenceIndex)}
                  style={webModuleStyle(
                    classes.statusPressable,
                    canSeek ? classes.statusPressableSeekable : null,
                  )}
                >
                  <Text
                    style={webModuleStyle(classes.status, statusClass(sentence))}
                  >
                    {statusLabel(sentence)}
                  </Text>
                </Pressable>
                <ToneDropdown
                  tone={sentence.tone}
                  onChange={(nextTone) =>
                    updateSentence(sentence.id, { tone: nextTone })
                  }
                />
                <Button
                  label="Redo"
                  disabled={voiceDisabled}
                  onPress={() => {
                    void regenerateSentence(sentence.id);
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
      {error ? <Text style={webModuleStyle(classes.error)}>{error}</Text> : null}
    </View>
  );
}
