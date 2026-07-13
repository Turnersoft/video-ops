import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useOutdoorUi } from '../context/OutdoorUiContext';
import { colors, radii, sharedStyles, spacing, typography } from '../theme';
import type { LiveBeat } from '../types';
import { Button } from './ui/Button';
import { SectionLabel } from './ui/SectionLabel';

const DOUBLE_TAP_MS = 320;

export type DraftBeat = {
  title: string;
  say: string;
  leanCode: string;
  turnCode: string;
};

export function draftsFromLive(beats: LiveBeat[]): DraftBeat[] {
  return beats.map((beat) => ({
    title: beat.title,
    say: beat.say,
    leanCode: beat.leanCode,
    turnCode: beat.turnCode,
  }));
}

export type ScriptBeatEditorPanelProps = {
  beats: LiveBeat[];
  drafts: DraftBeat[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onDraftChange: (index: number, patch: Partial<DraftBeat>) => void;
  onSaveBeat?: (index: number) => void;
  savingIndex?: number | null;
  readOnlyMeta?: boolean;
  footer?: ReactNode;
};

export function ScriptBeatEditorPanel({
  beats,
  drafts,
  activeIndex,
  onActiveIndexChange,
  onDraftChange,
  onSaveBeat,
  savingIndex = null,
  readOnlyMeta = true,
  footer,
}: ScriptBeatEditorPanelProps) {
  const { layoutStyles } = useOutdoorUi();
  const [showLean, setShowLean] = useState(true);
  const [showTurn, setShowTurn] = useState(true);
  const [editing, setEditing] = useState(false);
  const lastTapAtRef = useRef(0);

  const clampedIndex = Math.min(Math.max(activeIndex, 0), Math.max(beats.length - 1, 0));
  const activeBeat = beats[clampedIndex] ?? null;
  const activeDraft = drafts[clampedIndex] ?? null;

  useEffect(() => {
    setEditing(false);
    lastTapAtRef.current = 0;
  }, [clampedIndex]);

  const selectBeat = useCallback(
    (index: number) => {
      setEditing(false);
      onActiveIndexChange(index);
    },
    [onActiveIndexChange],
  );

  const goPrev = useCallback(() => {
    selectBeat(Math.max(0, clampedIndex - 1));
  }, [clampedIndex, selectBeat]);

  const goNext = useCallback(() => {
    selectBeat(Math.min(beats.length - 1, clampedIndex + 1));
  }, [beats.length, clampedIndex, selectBeat]);

  const handleContentPress = useCallback(() => {
    if (editing) {
      return;
    }
    const now = Date.now();
    if (now - lastTapAtRef.current <= DOUBLE_TAP_MS) {
      lastTapAtRef.current = 0;
      setEditing(true);
      return;
    }
    lastTapAtRef.current = now;
  }, [editing]);

  const progressLabel = !beats.length ? '0 / 0' : `${clampedIndex + 1} / ${beats.length}`;

  if (!activeBeat || !activeDraft) {
    return (
      <View style={styles.empty}>
        <Text style={sharedStyles.mutedText}>No beats in this script yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Text style={styles.progress}>{progressLabel}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.beatScroll}
          contentContainerStyle={layoutStyles.beatRow}
          keyboardShouldPersistTaps="handled"
        >
          {beats.map((beat, index) => {
            const active = index === clampedIndex;
            return (
              <Pressable
                key={beat.id}
                style={[layoutStyles.beatChip, active ? styles.beatChipActive : null]}
                onPress={() => selectBeat(index)}
              >
                <Text style={styles.beatIndex}>{index + 1}</Text>
                <Text style={styles.beatLabel} numberOfLines={2}>
                  {drafts[index]?.title || beat.title || `Beat ${index + 1}`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.editorScroll}
        contentContainerStyle={styles.editorBody}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        keyboardDismissMode="on-drag"
      >
        <View style={styles.beatHeader}>
          <Text style={styles.beatNumber}>{clampedIndex + 1}</Text>
          {editing ? (
            <TextInput
              style={styles.titleInput}
              value={activeDraft.title}
              onChangeText={(title) => onDraftChange(clampedIndex, { title })}
              placeholder="Beat title"
              placeholderTextColor={colors.muted}
              autoFocus
            />
          ) : (
            <Pressable style={styles.titlePress} onPress={handleContentPress}>
              <Text style={styles.titleRead}>
                {activeDraft.title.trim() || 'Untitled beat'}
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.editHint}>
          {editing ? 'Editing — save when done' : 'Double-tap to edit'}
        </Text>

        <SectionLabel>Spoken</SectionLabel>
        {editing ? (
          <TextInput
            style={styles.sayInput}
            value={activeDraft.say}
            onChangeText={(say) => onDraftChange(clampedIndex, { say })}
            multiline
            textAlignVertical="top"
            placeholder="What you say on camera for this beat"
            placeholderTextColor={colors.muted}
          />
        ) : (
          <Pressable onPress={handleContentPress}>
            <Text style={styles.sayRead}>
              {activeDraft.say.trim() || 'No spoken text yet.'}
            </Text>
          </Pressable>
        )}

        <View style={styles.codeToggleRow}>
          <Pressable
            style={[styles.codeToggle, showLean ? styles.codeToggleActive : null]}
            onPress={() => setShowLean((value) => !value)}
          >
            <Text style={styles.codeToggleText}>Lean</Text>
          </Pressable>
          <Pressable
            style={[styles.codeToggle, showTurn ? styles.codeToggleActive : null]}
            onPress={() => setShowTurn((value) => !value)}
          >
            <Text style={styles.codeToggleText}>Turn</Text>
          </Pressable>
        </View>

        {showLean ? (
          <>
            <Text style={styles.fieldLabel}>Lean</Text>
            {editing ? (
              <TextInput
                style={styles.codeInput}
                value={activeDraft.leanCode}
                onChangeText={(leanCode) => onDraftChange(clampedIndex, { leanCode })}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                textAlignVertical="top"
                placeholder="Lean code for this beat"
                placeholderTextColor={colors.muted}
              />
            ) : (
              <Pressable onPress={handleContentPress}>
                <Text style={styles.codeRead}>
                  {activeDraft.leanCode.trim() || '—'}
                </Text>
              </Pressable>
            )}
          </>
        ) : null}

        {showTurn ? (
          <>
            <Text style={styles.fieldLabel}>Turn</Text>
            {editing ? (
              <TextInput
                style={styles.codeInput}
                value={activeDraft.turnCode}
                onChangeText={(turnCode) => onDraftChange(clampedIndex, { turnCode })}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                textAlignVertical="top"
                placeholder="Turn-lang code for this beat"
                placeholderTextColor={colors.muted}
              />
            ) : (
              <Pressable onPress={handleContentPress}>
                <Text style={styles.codeRead}>
                  {activeDraft.turnCode.trim() || '—'}
                </Text>
              </Pressable>
            )}
          </>
        ) : null}

        {readOnlyMeta && (activeBeat.hint || activeBeat.chinese || activeBeat.visualNotes) ? (
          <View style={styles.metaBlock}>
            <Text style={styles.fieldLabel}>Notes</Text>
            <Text style={styles.metaText}>
              {[activeBeat.hint, activeBeat.chinese, activeBeat.visualNotes]
                .filter(Boolean)
                .join('\n\n')}
            </Text>
          </View>
        ) : null}

        {editing ? (
          <View style={styles.editActions}>
            {onSaveBeat ? (
              <Button
                label={savingIndex === clampedIndex ? 'Saving…' : `Save beat ${clampedIndex + 1}`}
                variant="primary"
                disabled={savingIndex !== null}
                onPress={() => onSaveBeat(clampedIndex)}
              />
            ) : null}
            <Button label="Done" onPress={() => setEditing(false)} />
          </View>
        ) : null}

        {footer}
      </ScrollView>

      <View style={styles.navRow}>
        <Button label="Previous" onPress={goPrev} disabled={clampedIndex <= 0} />
        <Text style={styles.navLabel}>{progressLabel}</Text>
        <Button
          label="Next"
          onPress={goNext}
          disabled={clampedIndex >= beats.length - 1}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    gap: spacing.sm,
  },
  empty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  toolbar: {
    gap: spacing.xs,
    flexShrink: 0,
  },
  progress: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  beatScroll: {
    flexGrow: 0,
    maxHeight: 92,
  },
  beatChipActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.35)',
  },
  beatIndex: {
    color: colors.orange,
    fontWeight: '800',
    fontSize: typography.tiny,
  },
  beatLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: typography.tiny,
    maxWidth: 120,
  },
  editorScroll: {
    flex: 1,
    minHeight: 0,
  },
  editorBody: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  beatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...sharedStyles.slideCard,
    marginBottom: 0,
  },
  beatNumber: {
    ...sharedStyles.slideIndex,
    marginBottom: 0,
    minWidth: 28,
  },
  titleInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.cardTitle,
    fontWeight: '700',
    paddingVertical: 4,
  },
  titlePress: {
    flex: 1,
  },
  titleRead: {
    flex: 1,
    color: colors.text,
    fontSize: typography.cardTitle,
    fontWeight: '700',
    paddingVertical: 4,
  },
  editHint: {
    color: colors.muted,
    fontSize: typography.tiny,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    color: colors.section,
    fontSize: typography.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sayInput: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    padding: spacing.md,
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.bodyLineHeight,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
  },
  sayRead: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    padding: spacing.md,
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.bodyLineHeight,
    backgroundColor: 'rgba(2, 6, 23, 0.35)',
  },
  codeRead: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    padding: spacing.md,
    color: colors.code,
    fontFamily: 'Menlo',
    fontSize: 12,
    lineHeight: 17,
    backgroundColor: 'rgba(2, 6, 23, 0.25)',
  },
  editActions: {
    gap: spacing.sm,
  },
  codeToggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  codeToggle: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(51, 65, 85, 0.9)',
  },
  codeToggleActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.35)',
  },
  codeToggleText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: typography.tiny,
  },
  codeInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    padding: spacing.md,
    color: colors.code,
    fontFamily: 'Menlo',
    fontSize: 12,
    lineHeight: 17,
    backgroundColor: 'rgba(2, 6, 23, 0.35)',
  },
  metaBlock: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: 'rgba(2, 6, 23, 0.35)',
  },
  metaText: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 18,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexShrink: 0,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  navLabel: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '700',
  },
});
