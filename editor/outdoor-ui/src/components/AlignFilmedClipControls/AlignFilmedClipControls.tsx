export type { AlignFilmedClipControlsProps } from './AlignFilmedClipControls.types';

import classes from './AlignFilmedClipControls.module.scss';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { AlignFilmedClipControlsProps } from './AlignFilmedClipControls.types';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import type { AlignBeatLayout, AlignBoxLayout, AlignLayout, MaskShape } from '../../types';
import { Button } from '../Button/Button';
import { SectionLabel } from '../SectionLabel/SectionLabel';

const LANDSCAPE = { width: 1920, height: 1080 };

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
    <View style={webModuleStyle(classes.sliderRow)}>
      <Text style={webModuleStyle(classes.sliderLabel)}>{label}</Text>
      <View style={webModuleStyle(classes.sliderTrack)}>
        {Array.from({ length: stops + 1 }, (_, index) => {
          const stopValue = min + index * step;
          const active = Math.abs(stopValue - value) < step * 0.5;
          return (
            <Pressable
              key={`${label}-${stopValue}`}
              disabled={disabled}
              onPress={() => onChange(stopValue)}
                      style={webModuleStyle(classes.sliderStop, active ? classes.sliderStopActive : null)}
            />
          );
        })}
      </View>
      <Text style={webModuleStyle(classes.sliderValue)}>
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
    <View style={webModuleStyle(classes.wrap)}>
      <SectionLabel>Filmed clip mask · {beatTitle}</SectionLabel>
      <Text style={webModuleStyle(classes.meta)}>
        Mask box {pixelW}×{pixelH}px on 1920×1080 · drag/resize in Remotion Studio too
      </Text>

      <View style={webModuleStyle(classes.shapeRow)}>
        <Pressable
          disabled={busy}
          onPress={() => setShape('rectangle')}
                      style={webModuleStyle(classes.shapeChip, pip.shape === 'rectangle' ? classes.shapeChipActive : null)}
        >
          <Text style={webModuleStyle(classes.shapeChipText)}>Rectangle</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => setShape('circle')}
                      style={webModuleStyle(classes.shapeChip, pip.shape === 'circle' ? classes.shapeChipActive : null)}
        >
          <Text style={webModuleStyle(classes.shapeChipText)}>Circle</Text>
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

      <View style={webModuleStyle(classes.toggleRow)}>
        <Pressable
          disabled={busy}
          onPress={() =>
            setDraft((prev) =>
              updateBeatLayout(prev, beatIndex, {
                scriptFullscreen: !beatLayout.scriptFullscreen,
              }),
            )
          }
          style={webModuleStyle(classes.toggleChip, beatLayout.scriptFullscreen ? classes.toggleChipActive : null)}
        >
          <Text style={webModuleStyle(classes.toggleChipText)}>
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
          style={webModuleStyle(classes.toggleChip, beatLayout.presenterMode === 'full-clip' ? classes.toggleChipActive : null)}
        >
          <Text style={webModuleStyle(classes.toggleChipText)}>
            Filmed full-clip {beatLayout.presenterMode === 'full-clip' ? 'on' : 'off'}
          </Text>
        </Pressable>
      </View>

      <View style={webModuleStyle(classes.actions)}>
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
