import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';
import type { AlignBeatLayout, AlignBoxLayout, AlignLayout, MaskShape } from '../types';
import { Button } from './ui/Button';
import { SectionLabel } from './ui/SectionLabel';

const LANDSCAPE = { width: 1920, height: 1080 };

export type AlignFilmedClipControlsProps = {
  beatIndex: number;
  beatTitle: string;
  layout: AlignLayout;
  busy: boolean;
  onSave: (next: AlignLayout) => Promise<void>;
};

function clamp01(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

function updateBeatLayout(
  layout: AlignLayout,
  beatIndex: number,
  patch: Partial<AlignBeatLayout> & { pip?: Partial<AlignBoxLayout> },
): AlignLayout {
  const key = String(beatIndex);
  const current = layout.beats?.[key];
  const base: AlignBeatLayout = current ?? {
    pip: { ...layout.pip },
    hintPanel: { ...layout.hintPanel },
  };
  const nextBeat: AlignBeatLayout = {
    ...base,
    ...(patch.presenterMode ? { presenterMode: patch.presenterMode } : {}),
    ...(patch.scriptFullscreen !== undefined
      ? { scriptFullscreen: patch.scriptFullscreen }
      : {}),
    pip: {
      ...base.pip,
      ...(patch.pip ?? {}),
    },
    hintPanel: base.hintPanel,
  };
  return {
    ...layout,
    beats: {
      ...(layout.beats ?? {}),
      [key]: nextBeat,
    },
  };
}

function MaskSlider({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  const stops = Math.round((max - min) / step);
  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <View style={styles.sliderTrack}>
        {Array.from({ length: stops + 1 }, (_, index) => {
          const stopValue = min + index * step;
          const active = Math.abs(stopValue - value) < step * 0.5;
          return (
            <Pressable
              key={`${label}-${stopValue}`}
              disabled={disabled}
              onPress={() => onChange(stopValue)}
              style={[styles.sliderStop, active ? styles.sliderStopActive : null]}
            />
          );
        })}
      </View>
      <Text style={styles.sliderValue}>
        {value.toFixed(2)}
        {suffix ?? ''}
      </Text>
    </View>
  );
}

export function AlignFilmedClipControls({
  beatIndex,
  beatTitle,
  layout,
  busy,
  onSave,
}: AlignFilmedClipControlsProps) {
  const [draft, setDraft] = useState<AlignLayout>(layout);

  useEffect(() => {
    setDraft(layout);
  }, [layout]);

  const beatLayout = useMemo(() => {
    const key = String(beatIndex);
    const override = draft.beats?.[key];
    if (override) {
      return override;
    }
    return {
      pip: { ...draft.pip },
      hintPanel: { ...draft.hintPanel },
    };
  }, [beatIndex, draft]);

  const pip = beatLayout.pip;
  const pixelW = Math.round(pip.w * LANDSCAPE.width);
  const pixelH = Math.round(pip.h * LANDSCAPE.height);

  const patchPip = (patch: Partial<AlignBoxLayout>) => {
    setDraft((prev) =>
      updateBeatLayout(prev, beatIndex, {
        pip: {
          ...pip,
          ...patch,
        },
      }),
    );
  };

  const setShape = (shape: MaskShape) => patchPip({ shape });

  const saveBeat = async () => {
    await onSave(draft);
  };

  const saveAsDefault = async () => {
    const key = String(beatIndex);
    const beat = draft.beats?.[key];
    if (!beat) {
      return;
    }
    await onSave({
      ...draft,
      pip: { ...beat.pip },
      hintPanel: { ...beat.hintPanel },
      beats: draft.beats,
    });
  };

  return (
    <View style={styles.wrap}>
      <SectionLabel>Filmed clip mask · {beatTitle}</SectionLabel>
      <Text style={styles.meta}>
        Mask box {pixelW}×{pixelH}px on 1920×1080 · drag/resize in Remotion Studio too
      </Text>

      <View style={styles.shapeRow}>
        <Pressable
          disabled={busy}
          onPress={() => setShape('rectangle')}
          style={[styles.shapeChip, pip.shape === 'rectangle' ? styles.shapeChipActive : null]}
        >
          <Text style={styles.shapeChipText}>Rectangle</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => setShape('circle')}
          style={[styles.shapeChip, pip.shape === 'circle' ? styles.shapeChipActive : null]}
        >
          <Text style={styles.shapeChipText}>Circle</Text>
        </Pressable>
      </View>

      <MaskSlider
        label="Width"
        value={pip.w}
        min={0.08}
        max={0.6}
        step={0.02}
        disabled={busy}
        onChange={(value) => patchPip({ w: value })}
      />
      <MaskSlider
        label="Height"
        value={pip.h}
        min={0.08}
        max={0.6}
        step={0.02}
        disabled={busy}
        onChange={(value) => patchPip({ h: value })}
      />
      <MaskSlider
        label="Zoom inside mask"
        value={pip.scale}
        min={0.5}
        max={3}
        step={0.1}
        disabled={busy}
        onChange={(value) => patchPip({ scale: value })}
      />
      <MaskSlider
        label="X position"
        value={pip.x}
        min={0}
        max={0.8}
        step={0.02}
        disabled={busy}
        onChange={(value) => patchPip({ x: clamp01(value, pip.x) })}
      />
      <MaskSlider
        label="Y position"
        value={pip.y}
        min={0}
        max={0.8}
        step={0.02}
        disabled={busy}
        onChange={(value) => patchPip({ y: clamp01(value, pip.y) })}
      />

      <View style={styles.toggleRow}>
        <Pressable
          disabled={busy}
          onPress={() =>
            setDraft((prev) =>
              updateBeatLayout(prev, beatIndex, {
                scriptFullscreen: !beatLayout.scriptFullscreen,
              }),
            )
          }
          style={[
            styles.toggleChip,
            beatLayout.scriptFullscreen ? styles.toggleChipActive : null,
          ]}
        >
          <Text style={styles.toggleChipText}>
            Script fullscreen {beatLayout.scriptFullscreen ? 'on' : 'off'}
          </Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() =>
            setDraft((prev) =>
              updateBeatLayout(prev, beatIndex, {
                presenterMode:
                  beatLayout.presenterMode === 'full-clip' ? 'split-crop' : 'full-clip',
              }),
            )
          }
          style={[
            styles.toggleChip,
            beatLayout.presenterMode === 'full-clip' ? styles.toggleChipActive : null,
          ]}
        >
          <Text style={styles.toggleChipText}>
            Filmed full-clip {beatLayout.presenterMode === 'full-clip' ? 'on' : 'off'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Button
          label={busy ? 'Saving…' : `Save beat ${beatIndex + 1} mask`}
          variant="primary"
          disabled={busy}
          onPress={() => void saveBeat()}
        />
        <Button
          label="Set as default for all beats"
          disabled={busy}
          onPress={() => void saveAsDefault()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  meta: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 18,
  },
  shapeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  shapeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  shapeChipActive: {
    borderColor: colors.orange,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
  },
  shapeChipText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '700',
  },
  sliderRow: {
    gap: spacing.xs,
  },
  sliderLabel: {
    color: colors.muted,
    fontSize: typography.tiny,
    fontWeight: '700',
  },
  sliderTrack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  sliderStop: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.25)',
  },
  sliderStopActive: {
    backgroundColor: colors.orange,
  },
  sliderValue: {
    color: colors.text,
    fontSize: typography.tiny,
    fontFamily: 'Menlo',
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  toggleChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  toggleChipActive: {
    borderColor: colors.orange,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
  },
  toggleChipText: {
    color: colors.text,
    fontSize: typography.tiny,
    fontWeight: '700',
  },
  actions: {
    gap: spacing.xs,
  },
});
