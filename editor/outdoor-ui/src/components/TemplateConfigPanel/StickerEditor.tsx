import classes from './StickerEditor.module.scss';
import { webModuleStyle } from '../../utils/webClassName';
import type { StickerSpec } from '../../types/beatStudio';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { colors } from '../../theme';
import { useCallback, useRef, useState } from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';

import { AutoGrowTextInput } from '../AutoGrowTextInput/AutoGrowTextInput';

const POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] as const;

const PRESET: Record<StickerSpec['position'], { x: number; y: number }> = {
  'top-left': { x: 0.08, y: 0.1 },
  'top-right': { x: 0.72, y: 0.1 },
  'bottom-left': { x: 0.08, y: 0.72 },
  'bottom-right': { x: 0.72, y: 0.72 },
  center: { x: 0.38, y: 0.4 },
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

type StickerEditorProps = {
  scriptId: string;
  sticker: StickerSpec;
  index: number;
  onChange: (next: StickerSpec) => void;
  onDelete: () => void;
};

function ConfigToggle({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={webModuleStyle(classes.toggle, active ? classes.toggleActive : null)}
    >
      <Text style={webModuleStyle(classes.toggleText, active ? classes.toggleTextActive : null)}>
        {label}
      </Text>
    </Pressable>
  );
}

function DeleteButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={webModuleStyle(classes.deleteBtn)}>
      <Text style={webModuleStyle(classes.deleteBtnText)}>×</Text>
    </Pressable>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'numeric' | 'default';
}) {
  return (
    <View style={webModuleStyle(classes.inputWrap, classes.inputWrapCompact)}>
      <Text style={webModuleStyle(classes.inputLabel)}>{label}</Text>
      <AutoGrowTextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        lineHeight={16}
        minLines={1}
        maxLines={1}
        inputClassName={classes.input}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

function StickerPlacementPreview({
  sticker,
  assetUrl,
  onChange,
}: {
  sticker: StickerSpec;
  assetUrl: string | null;
  onChange: (patch: Partial<StickerSpec>) => void;
}) {
  const dragging = useRef(false);
  const x = sticker.x ?? PRESET[sticker.position].x;
  const y = sticker.y ?? PRESET[sticker.position].y;

  const updateFromEvent = useCallback(
    (target: HTMLElement, clientX: number, clientY: number) => {
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      onChange({
        x: clamp01((clientX - rect.left) / rect.width),
        y: clamp01((clientY - rect.top) / rect.height),
      });
    },
    [onChange],
  );

  return (
    <View style={webModuleStyle(classes.previewWrap)}>
      <Text style={webModuleStyle(classes.previewHint)}>Drag sticker to position (also in Remotion)</Text>
      <View
        style={webModuleStyle(classes.previewStage)}
        // @ts-expect-error web pointer handlers on RN View
        onMouseDown={(event: MouseEvent) => {
          dragging.current = true;
          updateFromEvent(event.currentTarget as HTMLElement, event.clientX, event.clientY);
        }}
        onMouseMove={(event: MouseEvent) => {
          if (!dragging.current) {
            return;
          }
          updateFromEvent(event.currentTarget as HTMLElement, event.clientX, event.clientY);
        }}
        onMouseUp={() => {
          dragging.current = false;
        }}
        onMouseLeave={() => {
          dragging.current = false;
        }}
      >
        <View
          style={[
            webModuleStyle(classes.previewSticker),
            {
              left: `${Math.round(x * 100)}%`,
              top: `${Math.round(y * 100)}%`,
            } as const,
          ]}
        >
          {assetUrl ? (
            <Image source={{ uri: assetUrl }} style={webModuleStyle(classes.previewImage)} resizeMode="contain" />
          ) : null}
          {sticker.emoji ? <Text style={webModuleStyle(classes.previewEmoji)}>{sticker.emoji}</Text> : null}
          {sticker.text ? (
            <Text style={webModuleStyle(classes.previewText)} numberOfLines={2}>
              {sticker.text}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function StickerEditor({ scriptId, sticker, index, onChange, onDelete }: StickerEditorProps) {
  const { api } = useOutdoorUi();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const assetUrl = sticker.assetPath
    ? `/api/scripts/${encodeURIComponent(scriptId)}/assets/${sticker.assetPath
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')}`
    : null;

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError(null);
      try {
        const result = await api.uploadStickerAsset(scriptId, sticker.id, file);
        onChange({ ...sticker, assetPath: result.assetPath });
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : String(error));
      } finally {
        setUploading(false);
      }
    },
    [api, onChange, scriptId, sticker],
  );

  const clearAsset = useCallback(async () => {
    if (!sticker.assetPath) {
      return;
    }
    try {
      await api.deleteStickerAsset(scriptId, sticker.assetPath);
      onChange({ ...sticker, assetPath: undefined });
    } catch {
      onChange({ ...sticker, assetPath: undefined });
    }
  }, [api, onChange, scriptId, sticker]);

  return (
    <View style={webModuleStyle(classes.editRow)}>
      <View style={webModuleStyle(classes.editRowHeader)}>
        <Text style={webModuleStyle(classes.editRowTitle)}>Sticker {index + 1}</Text>
        <DeleteButton onPress={onDelete} />
      </View>
      <LabeledInput label="Text" value={sticker.text} onChangeText={(text) => onChange({ ...sticker, text })} />
      <LabeledInput
        label="Emoji"
        value={sticker.emoji ?? ''}
        onChangeText={(emoji) => onChange({ ...sticker, emoji: emoji || undefined })}
      />
      <View style={webModuleStyle(classes.row)}>
        <Pressable
          accessibilityRole="button"
          disabled={uploading}
          onPress={() => fileInputRef.current?.click()}
          style={webModuleStyle(classes.uploadBtn)}
        >
          <Text style={webModuleStyle(classes.uploadBtnText)}>
            {uploading ? 'Uploading…' : sticker.assetPath ? 'Replace image' : 'Upload image'}
          </Text>
        </Pressable>
        {sticker.assetPath ? (
          <Pressable accessibilityRole="button" onPress={() => void clearAsset()} style={webModuleStyle(classes.uploadBtn)}>
            <Text style={webModuleStyle(classes.uploadBtnText)}>Remove image</Text>
          </Pressable>
        ) : null}
      </View>
      {uploadError ? <Text style={webModuleStyle(classes.errorText)}>{uploadError}</Text> : null}
      {assetUrl ? (
        <Image source={{ uri: assetUrl }} style={webModuleStyle(classes.assetPreview)} resizeMode="contain" />
      ) : null}
      {Platform.OS === 'web' ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleUpload(file);
            }
            event.target.value = '';
          }}
        />
      ) : null}
      <StickerPlacementPreview
        sticker={sticker}
        assetUrl={assetUrl}
        onChange={(patch) => onChange({ ...sticker, ...patch })}
      />
      <View style={webModuleStyle(classes.row)}>
        <LabeledInput
          label="@s"
          value={String(sticker.atSeconds)}
          keyboardType="numeric"
          onChangeText={(raw) => {
            const n = Number(raw);
            if (!Number.isNaN(n) && n >= 0) {
              onChange({ ...sticker, atSeconds: n });
            }
          }}
        />
        <LabeledInput
          label="Dur (s)"
          value={String(sticker.durationSeconds)}
          keyboardType="numeric"
          onChangeText={(raw) => {
            const n = Number(raw);
            if (!Number.isNaN(n) && n > 0) {
              onChange({ ...sticker, durationSeconds: n });
            }
          }}
        />
      </View>
      <View style={webModuleStyle(classes.row)}>
        {POSITIONS.map((position) => (
          <ConfigToggle
            key={position}
            label={position}
            active={sticker.position === position}
            onPress={() =>
              onChange({
                ...sticker,
                position,
                x: PRESET[position].x,
                y: PRESET[position].y,
              })
            }
          />
        ))}
      </View>
    </View>
  );
}
