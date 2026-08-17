import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AutoGrowTextInput } from '../../components/AutoGrowTextInput/AutoGrowTextInput';
import { Button } from '../../components/Button/Button';
import { Header } from '../../components/Header/Header';
import { SectionLabel } from '../../components/SectionLabel/SectionLabel';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { useOutdoorRoute } from '../../hooks/useOutdoorRoute';
import { colors, radii, sharedStyles, spacing, typography } from '../../theme';
import type {
  VideoOpsCatalogTake,
  VoxcpmEditorBeat,
  VoxcpmEditorDocument,
  VoxcpmEditorSentence,
} from '../../types';
import {
  VOXCPM_TONE_PRESETS,
  voxcpmSentenceFingerprint,
  type VoxcpmToneId,
} from '../../utils/voxcpmScript';

export type AiCloneScriptEditorScreenProps = {
  scriptId: string;
};

type PendingBeat = {
  beatIndex: number;
  sentenceIds: string[];
  sentences: VoxcpmEditorSentence[];
};

function AudioPreview({ src }: { src: string }) {
  if (Platform.OS !== 'web') {
    return <Text style={styles.meta}>Audio preview is available in the Mac web editor.</Text>;
  }
  return <audio controls preload="metadata" src={src} />;
}

function sentenceStatusLabel(sentence: VoxcpmEditorSentence): string {
  switch (sentence.status) {
    case 'queued':
      return 'Queued';
    case 'rendering':
      return 'Generating';
    case 'ready':
      return sentence.durationSeconds ? `${sentence.durationSeconds.toFixed(1)}s ready` : 'Ready';
    case 'failed':
      return 'Failed';
    case 'idle':
      return 'Needs voice';
    default: {
      const exhaustive: never = sentence.status;
      return exhaustive;
    }
  }
}

function mergeServerDocument(
  current: VoxcpmEditorDocument | null,
  next: VoxcpmEditorDocument,
  dirty: Map<number, Set<string>>,
): VoxcpmEditorDocument {
  if (!current) {
    return next;
  }
  return {
    ...next,
    beats: next.beats.map((serverBeat) => {
      const localBeat = current.beats[serverBeat.beatIndex];
      if (!localBeat) {
        return serverBeat;
      }
      const dirtyIds = dirty.get(serverBeat.beatIndex);
      if (dirtyIds?.has('*')) {
        return localBeat;
      }
      return {
        ...serverBeat,
        sentences: serverBeat.sentences.map((serverSentence) => {
          if (!dirtyIds?.has(serverSentence.id)) {
            return serverSentence;
          }
          const local = localBeat.sentences.find(
            (candidate) => candidate.id === serverSentence.id,
          );
          return local ?? serverSentence;
        }),
      };
    }),
  };
}

function mergeDirtyMaps(
  first: Map<number, Set<string>>,
  second: Map<number, Set<string>>,
): Map<number, Set<string>> {
  const merged = new Map<number, Set<string>>();
  for (const source of [first, second]) {
    for (const [beatIndex, sentenceIds] of source) {
      const ids = merged.get(beatIndex) ?? new Set<string>();
      sentenceIds.forEach((id) => ids.add(id));
      merged.set(beatIndex, ids);
    }
  }
  return merged;
}

export function AiCloneScriptEditorScreen({
  scriptId,
}: AiCloneScriptEditorScreenProps) {
  const { api, invalidateAll, mobile, onOpenFilm } = useOutdoorUi();
  const {
    navigateToAnimation,
    navigateToFilm,
    navigateToPostProcess,
    navigateToTake,
  } = useOutdoorRoute();
  const [document, setDocument] = useState<VoxcpmEditorDocument | null>(null);
  const documentRef = useRef<VoxcpmEditorDocument | null>(null);
  const [referenceTakes, setReferenceTakes] = useState<VideoOpsCatalogTake[]>([]);
  const [referenceTakeId, setReferenceTakeId] = useState('');
  const referenceTakeIdRef = useRef('');
  const [activeBeatIndex, setActiveBeatIndex] = useState(0);
  const [selectedSentenceIds, setSelectedSentenceIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingPreview, setCreatingPreview] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<Map<number, Set<string>>>(new Map());
  const inFlightRef = useRef<Map<number, Set<string>>>(new Map());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    referenceTakeIdRef.current = referenceTakeId;
  }, [referenceTakeId]);

  const refreshDocument = useCallback(
    async (preserveDrafts = true, requestedReferenceTakeId?: string) => {
      const referenceId = requestedReferenceTakeId ?? referenceTakeIdRef.current;
      const next = await api.getVoxcpmEditor(scriptId, referenceId || undefined);
      setDocument((current) => {
        const merged = preserveDrafts
          ? mergeServerDocument(
              current,
              next,
              mergeDirtyMaps(pendingRef.current, inFlightRef.current),
            )
          : next;
        documentRef.current = merged;
        return merged;
      });
      return next;
    },
    [api, scriptId],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api
      .getCatalog()
      .then(async (catalog) => {
        const script = catalog.scripts.find((entry) => entry.scriptId === scriptId);
        const takes = (script?.takes ?? []).filter((take) => take.hasSourceVideo);
        const initialReference = takes[0]?.takeId ?? '';
        if (cancelled) {
          return;
        }
        setReferenceTakes(takes);
        setReferenceTakeId(initialReference);
        referenceTakeIdRef.current = initialReference;
        await refreshDocument(false, initialReference);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, refreshDocument, scriptId]);

  useEffect(() => {
    if (!document) {
      return;
    }
    const timer = setInterval(() => {
      void refreshDocument(true).catch(() => {
        // Ignore transient polling errors while VoxCPM is busy.
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [document, refreshDocument]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const activeBeat = document?.beats[activeBeatIndex] ?? null;
  const anyRendering = useMemo(
    () =>
      Boolean(
        document?.beats.some((beat) =>
          beat.sentences.some(
            (sentence) => sentence.status === 'queued' || sentence.status === 'rendering',
          ),
        ),
      ),
    [document],
  );

  const flushPending = useCallback(async (renderChanges = true) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const current = documentRef.current;
    if (!current || pendingRef.current.size === 0) {
      return saveChainRef.current;
    }
    const jobs: PendingBeat[] = [];
    for (const [beatIndex, sentenceIds] of pendingRef.current) {
      const beat = current.beats[beatIndex];
      if (beat) {
        jobs.push({
          beatIndex,
          sentenceIds: [...sentenceIds].filter((id) => id !== '*'),
          sentences: beat.sentences.map((sentence) => ({ ...sentence })),
        });
      }
    }
    pendingRef.current = new Map();
    const inFlightSets = new Map<number, Set<string>>();
    for (const job of jobs) {
      const ids = new Set(['*', ...job.sentenceIds]);
      inFlightSets.set(job.beatIndex, ids);
      inFlightRef.current.set(job.beatIndex, ids);
    }
    setSaving(true);
    setError(null);
    setStatus('Saving animation.md…');
    saveChainRef.current = saveChainRef.current
      .then(async () => {
        for (const job of jobs) {
          await api.putVoxcpmEditorBeat(
            scriptId,
            job.beatIndex,
            job.sentences,
            referenceTakeIdRef.current || undefined,
          );
          if (renderChanges) {
            for (const sentenceId of job.sentenceIds) {
              await api.renderVoxcpmEditorSentence(
                scriptId,
                job.beatIndex,
                sentenceId,
                referenceTakeIdRef.current || undefined,
              );
            }
          }
        }
        jobs.forEach((job) => {
          if (inFlightRef.current.get(job.beatIndex) === inFlightSets.get(job.beatIndex)) {
            inFlightRef.current.delete(job.beatIndex);
          }
        });
        setStatus(
          renderChanges && jobs.some((job) => job.sentenceIds.length > 0)
            ? 'Saved to animation.md · changed sentence voice queued'
            : 'Saved to animation.md',
        );
        invalidateAll();
        await refreshDocument(true);
      })
      .catch((saveError) => {
        for (const job of jobs) {
          const pending = pendingRef.current.get(job.beatIndex) ?? new Set<string>();
          pending.add('*');
          job.sentenceIds.forEach((id) => pending.add(id));
          pendingRef.current.set(job.beatIndex, pending);
          if (inFlightRef.current.get(job.beatIndex) === inFlightSets.get(job.beatIndex)) {
            inFlightRef.current.delete(job.beatIndex);
          }
        }
        setError(saveError instanceof Error ? saveError.message : String(saveError));
        setStatus('Save failed · local edits kept');
      })
      .finally(() => {
        setSaving(false);
      });
    return saveChainRef.current;
  }, [api, invalidateAll, refreshDocument, scriptId]);

  const scheduleSave = useCallback(
    (beatIndex: number, sentenceIds: string[]) => {
      const pending = pendingRef.current;
      const ids = pending.get(beatIndex) ?? new Set<string>();
      ids.add('*');
      sentenceIds.forEach((id) => ids.add(id));
      pending.set(beatIndex, ids);
      setStatus('Editing · autosaves after you pause');
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        void flushPending();
      }, 1100);
    },
    [flushPending],
  );

  const replaceBeat = useCallback((beatIndex: number, beat: VoxcpmEditorBeat) => {
    setDocument((current) => {
      if (!current) {
        return current;
      }
      const beats = [...current.beats];
      beats[beatIndex] = beat;
      const next = { ...current, beats };
      documentRef.current = next;
      return next;
    });
  }, []);

  const updateSentence = useCallback(
    (
      beatIndex: number,
      sentenceId: string,
      patch: Partial<Pick<VoxcpmEditorSentence, 'text' | 'tone' | 'pauseAfterMs'>>,
    ) => {
      const current = documentRef.current;
      const beat = current?.beats[beatIndex];
      if (!beat) {
        return;
      }
      replaceBeat(beatIndex, {
        ...beat,
        beatAudioUrl: null,
        beatDurationSeconds: null,
        previewVoiceSrc: null,
        readySentenceCount: 0,
        sentences: beat.sentences.map((sentence) =>
          sentence.id === sentenceId
            ? {
                ...sentence,
                ...patch,
                fingerprint: voxcpmSentenceFingerprint(patch.text ?? sentence.text),
                status: 'idle',
                hasLatestAudio: false,
                progressPercent: 0,
                audioUrl: null,
                durationSeconds: null,
                error: null,
              }
            : sentence,
        ),
      });
      scheduleSave(beatIndex, [sentenceId]);
    },
    [replaceBeat, scheduleSave],
  );

  const applyTone = useCallback(
    (tone: VoxcpmToneId) => {
      const beat = documentRef.current?.beats[activeBeatIndex];
      if (!beat || selectedSentenceIds.size === 0) {
        return;
      }
      replaceBeat(activeBeatIndex, {
        ...beat,
        beatAudioUrl: null,
        beatDurationSeconds: null,
        previewVoiceSrc: null,
        readySentenceCount: 0,
        sentences: beat.sentences.map((sentence) =>
          selectedSentenceIds.has(sentence.id)
            ? {
                ...sentence,
                tone,
                status: 'idle',
                hasLatestAudio: false,
                progressPercent: 0,
                audioUrl: null,
                durationSeconds: null,
                error: null,
              }
            : sentence,
        ),
      });
      scheduleSave(activeBeatIndex, [...selectedSentenceIds]);
    },
    [activeBeatIndex, replaceBeat, scheduleSave, selectedSentenceIds],
  );

  const addSentence = useCallback(() => {
    const beat = documentRef.current?.beats[activeBeatIndex];
    if (!beat) {
      return;
    }
    const id = `${beat.beatId}-sentence-${Date.now().toString(36)}`;
    const previous = beat.sentences.map((sentence, index) =>
      index === beat.sentences.length - 1 && sentence.pauseAfterMs === 0
        ? { ...sentence, pauseAfterMs: 180 }
        : sentence,
    );
    const sentence: VoxcpmEditorSentence = {
      id,
      text: 'New sentence.',
      tone: 'grounding',
      pauseAfterMs: 0,
      fingerprint: voxcpmSentenceFingerprint('New sentence.'),
      status: 'idle',
      hasLatestAudio: false,
      progressPercent: 0,
      audioUrl: null,
      durationSeconds: null,
      error: null,
    };
    replaceBeat(activeBeatIndex, {
      ...beat,
      beatAudioUrl: null,
      beatDurationSeconds: null,
      previewVoiceSrc: null,
      readySentenceCount: 0,
      sentences: [...previous, sentence],
    });
    setSelectedSentenceIds(new Set([id]));
    scheduleSave(activeBeatIndex, [id]);
  }, [activeBeatIndex, replaceBeat, scheduleSave]);

  const deleteSentence = useCallback(
    (sentenceId: string) => {
      const beat = documentRef.current?.beats[activeBeatIndex];
      if (!beat || beat.sentences.length <= 1) {
        return;
      }
      const remaining = beat.sentences
        .filter((sentence) => sentence.id !== sentenceId)
        .map((sentence, index, all) =>
          index === all.length - 1 ? { ...sentence, pauseAfterMs: 0 } : sentence,
        );
      replaceBeat(activeBeatIndex, {
        ...beat,
        beatAudioUrl: null,
        beatDurationSeconds: null,
        previewVoiceSrc: null,
        readySentenceCount: 0,
        sentences: remaining,
      });
      setSelectedSentenceIds((selected) => {
        const next = new Set(selected);
        next.delete(sentenceId);
        return next;
      });
      scheduleSave(activeBeatIndex, []);
    },
    [activeBeatIndex, replaceBeat, scheduleSave],
  );

  const regenerateSentence = useCallback(
    async (sentenceId: string) => {
      await flushPending(false);
      setError(null);
      setStatus('Sentence queued · no beat or Remotion render');
      await api.renderVoxcpmEditorSentence(
        scriptId,
        activeBeatIndex,
        sentenceId,
        referenceTakeIdRef.current || undefined,
        { force: true },
      );
      await refreshDocument(true);
    },
    [activeBeatIndex, api, flushPending, refreshDocument, scriptId],
  );

  const regenerateBeat = useCallback(async () => {
    await flushPending(false);
    setError(null);
    setStatus('Regenerating every sentence in this beat · Remotion stays untouched');
    await api.renderVoxcpmEditorBeat(
      scriptId,
      activeBeatIndex,
      referenceTakeIdRef.current || undefined,
      { force: true },
    );
    await refreshDocument(true);
  }, [activeBeatIndex, api, flushPending, refreshDocument, scriptId]);

  const createFinalPreview = useCallback(async () => {
    await flushPending(false);
    setCreatingPreview(true);
    setError(null);
    setStatus('Assembling cached sentence audio, then rendering Remotion…');
    try {
      const response = await api.startVoxcpmTrial(scriptId, {
        referenceTakeId: referenceTakeIdRef.current || undefined,
        renderComposite: true,
      });
      invalidateAll();
      navigateToTake(scriptId, response.takeId);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : String(previewError));
      setCreatingPreview(false);
    }
  }, [api, flushPending, invalidateAll, navigateToTake, scriptId]);

  const openFilm = useCallback(() => {
    void flushPending(false).then(() => {
      if (Platform.OS === 'web') {
        navigateToFilm(scriptId);
        return;
      }
      onOpenFilm(scriptId);
    });
  }, [flushPending, navigateToFilm, onOpenFilm, scriptId]);

  return (
    <View style={sharedStyles.screen}>
      <Header
        title={document?.title ? `AI clone script · ${document.title}` : 'AI clone script'}
        actions={[
          {
            label: 'Beat editor',
            variant: 'back',
            onPress: () => {
              void flushPending(false).then(() => navigateToAnimation(scriptId));
            },
          },
          {
            label: 'Post-process',
            onPress: () => {
              void flushPending(false).then(() => navigateToPostProcess(scriptId));
            },
          },
          {
            label: 'Film original',
            onPress: openFilm,
          },
          {
            label: creatingPreview ? 'Creating…' : 'Create final preview',
            variant: 'primary',
            disabled: creatingPreview || !referenceTakeId,
            onPress: () => {
              void createFinalPreview();
            },
          },
        ]}
      />
      <ScrollView contentContainerStyle={styles.main}>
        <Text style={styles.intro}>
          animation.md remains the source of truth. Each sentence is a reusable VoxCPM unit;
          editing one sentence updates only that voice clip. Remotion runs only when you create
          the final preview.
        </Text>

        {loading ? <ActivityIndicator color={colors.orange} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {status ? (
          <Text style={anyRendering ? styles.runningStatus : styles.status}>{status}</Text>
        ) : null}

        <View style={styles.referenceCard}>
          <SectionLabel>Voice reference</SectionLabel>
          {referenceTakes.length ? (
            <ScrollView horizontal contentContainerStyle={styles.chipRow}>
              {referenceTakes.map((take) => (
                <Pressable
                  key={take.takeId}
                  accessibilityRole="button"
                  accessibilityLabel={`Use ${take.takeId} as voice reference`}
                  style={[
                    styles.referenceChip,
                    take.takeId === referenceTakeId ? styles.referenceChipActive : null,
                  ]}
                  onPress={() => {
                    setReferenceTakeId(take.takeId);
                    referenceTakeIdRef.current = take.takeId;
                    void refreshDocument(false, take.takeId);
                  }}
                >
                  <Text style={styles.chipText}>
                    {take.takeId === referenceTakeId ? '✓ ' : ''}
                    {take.takeId}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.error}>
              Film one source take first. It remains available for the original camera pipeline
              and supplies your cloned voice here.
            </Text>
          )}
        </View>

        {document ? (
          <View style={[styles.workspace, mobile ? styles.workspaceMobile : null]}>
            <View style={[styles.beatRail, mobile ? styles.beatRailMobile : null]}>
              <SectionLabel>Beats</SectionLabel>
              <ScrollView
                horizontal={mobile}
                contentContainerStyle={mobile ? styles.beatRailMobileContent : undefined}
              >
                {document.beats.map((beat) => {
                  const ready = beat.sentences.filter(
                    (sentence) => sentence.status === 'ready',
                  ).length;
                  return (
                    <Pressable
                      key={beat.beatId}
                      accessibilityRole="button"
                      accessibilityLabel={`Open beat ${beat.beatIndex + 1}: ${beat.title}`}
                      style={[
                        styles.beatChip,
                        beat.beatIndex === activeBeatIndex ? styles.beatChipActive : null,
                      ]}
                      onPress={() => {
                        void flushPending();
                        setActiveBeatIndex(beat.beatIndex);
                        setSelectedSentenceIds(new Set());
                      }}
                    >
                      <Text style={styles.beatChipIndex}>Beat {beat.beatIndex + 1}</Text>
                      <Text style={styles.beatChipTitle} numberOfLines={2}>
                        {beat.title}
                      </Text>
                      <Text style={styles.meta}>
                        {ready}/{beat.sentences.length} voiced
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.editorPane}>
              {activeBeat ? (
                <>
                  <View style={styles.beatHeader}>
                    <View style={styles.flex}>
                      <SectionLabel>
                        Beat {activeBeat.beatIndex + 1} · {activeBeat.title}
                      </SectionLabel>
                      <Text style={styles.meta}>
                        Select one or several sentences, then apply one delivery color.
                      </Text>
                    </View>
                    <Button
                      label="Regenerate whole beat"
                      disabled={!referenceTakeId || anyRendering}
                      onPress={() => {
                        void regenerateBeat().catch((renderError) => {
                          setError(
                            renderError instanceof Error
                              ? renderError.message
                              : String(renderError),
                          );
                        });
                      }}
                    />
                  </View>

                  <View style={styles.toneTray}>
                    {VOXCPM_TONE_PRESETS.map((tone) => (
                      <Pressable
                        key={tone.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Apply ${tone.label} voice color`}
                        disabled={selectedSentenceIds.size === 0}
                        style={[
                          styles.toneChip,
                          {
                            borderColor: tone.color,
                            opacity: selectedSentenceIds.size === 0 ? 0.42 : 1,
                          },
                        ]}
                        onPress={() => applyTone(tone.id)}
                      >
                        <View style={[styles.toneDot, { backgroundColor: tone.color }]} />
                        <View style={styles.flex}>
                          <Text style={styles.toneLabel}>{tone.label}</Text>
                          <Text style={styles.toneDescription}>{tone.description}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.sentenceList}>
                    {activeBeat.sentences.map((sentence, sentenceIndex) => {
                      const tone = VOXCPM_TONE_PRESETS.find(
                        (candidate) => candidate.id === sentence.tone,
                      ) ?? VOXCPM_TONE_PRESETS[0];
                      const selected = selectedSentenceIds.has(sentence.id);
                      return (
                        <View
                          key={sentence.id}
                          style={[
                            styles.sentenceCard,
                            { borderLeftColor: tone.color },
                            selected ? styles.sentenceCardSelected : null,
                          ]}
                        >
                          <View style={styles.sentenceHeader}>
                            <Pressable
                              accessibilityRole="checkbox"
                              accessibilityLabel={`Select sentence ${sentenceIndex + 1}`}
                              accessibilityState={{ checked: selected }}
                              style={[
                                styles.selectBox,
                                selected
                                  ? { backgroundColor: tone.color, borderColor: tone.color }
                                  : null,
                              ]}
                              onPress={() =>
                                setSelectedSentenceIds((current) => {
                                  const next = new Set(current);
                                  if (next.has(sentence.id)) {
                                    next.delete(sentence.id);
                                  } else {
                                    next.add(sentence.id);
                                  }
                                  return next;
                                })
                              }
                            >
                              <Text style={styles.selectText}>{selected ? '✓' : sentenceIndex + 1}</Text>
                            </Pressable>
                            <View style={styles.flex}>
                              <Text style={[styles.toneLabel, { color: tone.color }]}>
                                {tone.label}
                              </Text>
                              <Text
                                style={
                                  sentence.status === 'failed'
                                    ? styles.error
                                    : sentence.status === 'ready'
                                      ? styles.ready
                                      : styles.meta
                                }
                              >
                                {sentenceStatusLabel(sentence)}
                              </Text>
                            </View>
                            <Button
                              label="Regenerate sentence"
                              disabled={!referenceTakeId || sentence.status === 'rendering'}
                              onPress={() => {
                                void regenerateSentence(sentence.id).catch((renderError) => {
                                  setError(
                                    renderError instanceof Error
                                      ? renderError.message
                                      : String(renderError),
                                  );
                                });
                              }}
                            />
                            <Button
                              label="Delete"
                              variant="danger"
                              disabled={activeBeat.sentences.length <= 1}
                              onPress={() => deleteSentence(sentence.id)}
                            />
                          </View>
                          <AutoGrowTextInput
                            value={sentence.text}
                            minLines={2}
                            maxLines={8}
                            inputStyle={styles.sentenceInput}
                            placeholderTextColor={colors.muted}
                            selectionColor={tone.color}
                            onFocus={() => setSelectedSentenceIds(new Set([sentence.id]))}
                            onBlur={() => {
                              void flushPending();
                            }}
                            onChangeText={(text) =>
                              updateSentence(activeBeatIndex, sentence.id, { text })
                            }
                          />
                          {sentence.audioUrl ? <AudioPreview src={sentence.audioUrl} /> : null}
                          {sentence.error ? (
                            <Text style={styles.error}>{sentence.error}</Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>

                  <Button label="+ Add sentence" onPress={addSentence} />

                  {activeBeat.beatAudioUrl ? (
                    <View style={styles.beatPreview}>
                      <SectionLabel>
                        Stitched beat preview
                        {activeBeat.beatDurationSeconds
                          ? ` · ${activeBeat.beatDurationSeconds.toFixed(1)}s`
                          : ''}
                      </SectionLabel>
                      <Text style={styles.meta}>
                        This is a fast concat of sentence clips; it does not render Remotion.
                      </Text>
                      <AudioPreview src={activeBeat.beatAudioUrl} />
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.footerCard}>
          <SectionLabel>Finish or switch production mode</SectionLabel>
          <Text style={styles.meta}>
            Create final preview assembles cached clips and renders the finished AI-clone video.
            Film original keeps this production-ready animation.md and enters the camera pipeline.
          </Text>
          <View style={styles.chipRow}>
            <Button
              label={creatingPreview ? 'Creating final preview…' : 'Create final AI-clone preview'}
              variant="primary"
              disabled={creatingPreview || !referenceTakeId}
              onPress={() => {
                void createFinalPreview();
              }}
            />
            <Button label="Film original version" onPress={openFilm} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    width: '100%',
    maxWidth: 1440,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  intro: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.bodyLineHeight,
  },
  workspace: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  workspaceMobile: {
    flexDirection: 'column',
  },
  beatRail: {
    width: 220,
    gap: spacing.xs,
  },
  beatRailMobile: {
    width: '100%',
  },
  beatRailMobileContent: {
    gap: spacing.xs,
  },
  beatChip: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: 2,
    minWidth: 150,
  },
  beatChipActive: {
    borderColor: colors.orange,
    backgroundColor: colors.runChipActiveBg,
  },
  beatChipIndex: {
    color: colors.orange,
    fontWeight: '800',
    fontSize: typography.tiny,
  },
  beatChipTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: typography.small,
  },
  editorPane: {
    flex: 1,
    minWidth: 0,
    gap: spacing.md,
  },
  beatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  toneTray: {
    gap: spacing.xs,
  },
  toneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.card,
  },
  toneDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  toneLabel: {
    color: colors.text,
    fontWeight: '800',
    fontSize: typography.small,
  },
  toneDescription: {
    color: colors.muted,
    fontSize: typography.tiny,
  },
  sentenceList: {
    gap: spacing.sm,
  },
  sentenceCard: {
    borderWidth: 1,
    borderLeftWidth: 5,
    borderColor: colors.cardBorder,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sentenceCardSelected: {
    borderTopColor: colors.orange,
    borderRightColor: colors.orange,
    borderBottomColor: colors.orange,
  },
  sentenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sentenceInput: {
    color: colors.text,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    lineHeight: typography.bodyLineHeight,
  },
  selectBox: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
  },
  selectText: {
    color: colors.text,
    fontWeight: '900',
    fontSize: typography.tiny,
  },
  beatPreview: {
    ...sharedStyles.slideCard,
    gap: spacing.sm,
  },
  referenceCard: {
    ...sharedStyles.slideCard,
    gap: spacing.sm,
  },
  footerCard: {
    ...sharedStyles.slideCard,
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  referenceChip: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.pill,
  },
  referenceChipActive: {
    borderColor: colors.orange,
    backgroundColor: colors.runChipActiveBg,
  },
  chipText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: typography.small,
  },
  meta: {
    color: colors.muted,
    fontSize: typography.tiny,
  },
  status: {
    color: colors.online,
    fontSize: typography.small,
    fontWeight: '700',
  },
  runningStatus: {
    color: colors.orange,
    fontSize: typography.small,
    fontWeight: '700',
  },
  ready: {
    color: colors.online,
    fontSize: typography.tiny,
    fontWeight: '700',
  },
  error: {
    color: colors.offline,
    fontSize: typography.small,
  },
  flex: {
    flex: 1,
  },
});
