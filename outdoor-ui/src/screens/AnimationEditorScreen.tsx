import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { formatOutdoorApiError } from '../api/client';
import {
  draftsFromLive,
  ScriptBeatEditorPanel,
  type DraftBeat,
} from '../components/ScriptBeatEditorPanel';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { useOutdoorUi } from '../context/OutdoorUiContext';
import { useOutdoorRoute } from '../hooks/useOutdoorRoute';
import { colors, radii, sharedStyles, spacing, typography } from '../theme';
import type { LiveBeat, LiveScript } from '../types';

export type AnimationEditorScreenProps = {
  scriptId: string;
};

type AiBeatChange = {
  beatIndex: number;
  field: 'title' | 'say' | 'leanCode' | 'turnCode' | 'beat';
  before: string;
  after: string;
};

type AiSessionEntry = {
  id: string;
  at: string;
  kind: 'user' | 'status' | 'change' | 'error';
  message: string;
  changes?: AiBeatChange[];
};

function nowId(): string {
  return `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function truncate(text: string, max = 120): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
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
        field: 'beat',
        before: '',
        after: next.title || `Beat ${index + 1}`,
      });
      continue;
    }
    if (!next) {
      continue;
    }
    const fields: Array<'title' | 'say' | 'leanCode' | 'turnCode'> = [
      'title',
      'say',
      'leanCode',
      'turnCode',
    ];
    for (const field of fields) {
      const beforeValue = prev?.[field] ?? '';
      const afterValue = next[field] ?? '';
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
  if (change.field === 'beat') {
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

export function AnimationEditorScreen({ scriptId }: AnimationEditorScreenProps) {
  const { api, layoutStyles, invalidateAll } = useOutdoorUi();
  const { navigateToScript, navigateToPlatforms } = useOutdoorRoute();

  const [live, setLive] = useState<LiveScript | null>(null);
  const [drafts, setDrafts] = useState<DraftBeat[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [sessionOpen, setSessionOpen] = useState(false);
  const [aiSession, setAiSession] = useState<AiSessionEntry[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dirtyRef = useRef(false);

  const pushSession = useCallback((entry: Omit<AiSessionEntry, 'id' | 'at'>) => {
    setAiSession((prev) => [
      {
        id: nowId(),
        at: new Date().toISOString(),
        ...entry,
      },
      ...prev,
    ]);
  }, []);

  const loadLive = useCallback(async () => {
    setError(null);
    try {
      const liveScript = await api.getLiveScript(scriptId);
      if (!dirtyRef.current) {
        setLive(liveScript);
        setDrafts(draftsFromLive(liveScript.beats));
        setActiveIndex((index) =>
          Math.min(index, Math.max(liveScript.beats.length - 1, 0)),
        );
      }
      setStatus(
        `Live from ${liveScript.source}${liveScript.updatedAt ? ` · ${liveScript.updatedAt}` : ''}`,
      );
      return liveScript;
    } catch (loadError) {
      setError(formatOutdoorApiError(loadError));
      setLive(null);
      return null;
    }
  }, [api, scriptId]);

  useEffect(() => {
    setLoading(true);
    dirtyRef.current = false;
    void loadLive().finally(() => setLoading(false));
  }, [loadLive]);

  const updateDraft = useCallback((index: number, patch: Partial<DraftBeat>) => {
    dirtyRef.current = true;
    setDrafts((prev) =>
      prev.map((beat, beatIndex) => (beatIndex === index ? { ...beat, ...patch } : beat)),
    );
  }, []);

  const saveBeat = useCallback(
    async (index: number) => {
      const draft = drafts[index];
      if (!draft) {
        return;
      }
      setSavingIndex(index);
      setError(null);
      try {
        const next = await api.putLiveBeat(scriptId, index, {
          title: draft.title,
          say: draft.say,
          leanCode: draft.leanCode,
          turnCode: draft.turnCode,
        });
        setLive(next);
        setDrafts(draftsFromLive(next.beats));
        dirtyRef.current = false;
        setStatus(`Saved beat ${index + 1} · compiled animation.md`);
        invalidateAll();
      } catch (saveError) {
        setError(formatOutdoorApiError(saveError));
      } finally {
        setSavingIndex(null);
      }
    },
    [api, drafts, invalidateAll, scriptId],
  );

  const runAiUpdate = useCallback(
    async (apply: boolean) => {
      const prompt = instruction.trim();
      if (!prompt) {
        setError('Write an instruction for the AI first');
        return;
      }
      setAiBusy(true);
      setError(null);
      const beforeBeats = live?.beats ?? [];

      pushSession({
        kind: 'user',
        message: prompt,
      });
      pushSession({
        kind: 'status',
        message: apply ? 'Updating script with local AI…' : 'Drafting AI revision…',
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
              kind: 'change',
              message: `Applied ${changes.length} change${changes.length === 1 ? '' : 's'}`,
              changes,
            });
            if (changes[0]) {
              setActiveIndex(changes[0].beatIndex);
            }
          } else {
            pushSession({
              kind: 'status',
              message: 'AI finished — no beat text changes detected',
            });
          }

          dirtyRef.current = false;
          setStatus(
            `AI update applied${result.document?.updatedAt ? ` · ${result.document.updatedAt}` : ''}`,
          );
          invalidateAll();
        } else {
          pushSession({
            kind: 'status',
            message: `Draft ready (${result.markdown.length} chars) — tap “Update script by AI” to apply`,
          });
          pushSession({
            kind: 'change',
            message: truncate(result.markdown, 280),
          });
          setStatus('AI draft ready — review session log, then apply');
        }
      } catch (aiError) {
        const message = formatOutdoorApiError(aiError);
        pushSession({ kind: 'error', message });
        setError(message);
      } finally {
        setAiBusy(false);
      }
    },
    [api, instruction, invalidateAll, live?.beats, loadLive, pushSession, scriptId],
  );

  return (
    <View style={sharedStyles.screen}>
      <Header
        title={live?.title ?? 'Edit script'}
        actions={[
          {
            label: 'Back',
            onPress: () => navigateToScript(scriptId),
            variant: 'back',
          },
          { label: 'AI URL', onPress: navigateToPlatforms },
        ]}
      />

      <View style={[layoutStyles.main, styles.main]}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.orange} />
          </View>
        ) : (
          <>
            <View style={styles.aiStrip}>
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
                  label={aiBusy ? '…' : 'AI'}
                  variant="primary"
                  disabled={aiBusy || loading}
                  onPress={() => {
                    void runAiUpdate(true);
                  }}
                />
                <Pressable
                  style={styles.sessionToggle}
                  onPress={() => setSessionOpen((open) => !open)}
                >
                  <Text style={styles.sessionToggleText}>
                    Log{aiSession.length ? ` (${aiSession.length})` : ''}
                  </Text>
                </Pressable>
              </View>
            </View>

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
                        entry.kind === 'error'
                          ? styles.sessionError
                          : entry.kind === 'change'
                            ? styles.sessionChange
                            : entry.kind === 'user'
                              ? styles.sessionUser
                              : styles.sessionStatus,
                      ]}
                    >
                      <Text style={styles.sessionMessage} numberOfLines={3}>
                        {entry.kind === 'user' ? `› ${entry.message}` : entry.message}
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

            {error ? (
              <Text style={styles.error} numberOfLines={1}>
                {error}
              </Text>
            ) : status ? (
              <Text style={styles.status} numberOfLines={1}>
                {status}
              </Text>
            ) : null}

            {live ? (
              <View style={styles.editorWrap}>
                <ScriptBeatEditorPanel
                  beats={live.beats}
                  drafts={drafts}
                  activeIndex={activeIndex}
                  onActiveIndexChange={setActiveIndex}
                  onDraftChange={updateDraft}
                  onSaveBeat={(index) => {
                    void saveBeat(index);
                  }}
                  savingIndex={savingIndex}
                  footer={
                    <Button
                      label={aiBusy ? '…' : 'Preview AI draft'}
                      disabled={aiBusy || loading || !instruction.trim()}
                      onPress={() => {
                        void runAiUpdate(false);
                      }}
                    />
                  }
                />
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    minHeight: 0,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
    paddingVertical: spacing.xs,
  },
  aiPrompt: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.small,
    backgroundColor: colors.card,
  },
  aiActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  sessionToggle: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(51, 65, 85, 0.9)',
  },
  sessionToggleText: {
    color: colors.muted,
    fontSize: typography.tiny,
    fontWeight: '700',
  },
  sessionScroll: {
    maxHeight: 88,
    flexShrink: 0,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
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
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
  },
  sessionStatus: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  sessionChange: {
    backgroundColor: 'rgba(22, 101, 52, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.25)',
  },
  sessionError: {
    backgroundColor: 'rgba(127, 29, 29, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(252, 165, 165, 0.35)',
  },
  sessionKind: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionMessage: {
    color: colors.text,
    fontSize: typography.tiny,
    lineHeight: 15,
  },
  sessionDiff: {
    color: '#cbd5e1',
    fontSize: 10,
    lineHeight: 14,
  },
  editorWrap: {
    flex: 1,
    minHeight: 0,
  },
  status: {
    color: colors.online,
    fontSize: typography.tiny,
    fontWeight: '600',
    flexShrink: 0,
    marginBottom: 2,
  },
  error: {
    color: colors.offline,
    fontSize: typography.tiny,
    fontWeight: '600',
    flexShrink: 0,
    marginBottom: 2,
  },
});
