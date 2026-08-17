export type { ScriptCoversPanelProps } from './ScriptCoversPanel.types';

import classes from './ScriptCoversPanel.module.scss';
import { webClassName, webModuleStyle } from '../../utils/webClassName';
import type { ScriptCoversPanelProps } from './ScriptCoversPanel.types';
import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Text,
  View,
} from 'react-native';

import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { colors } from '../../theme';
import type { ScriptCoverSlot, ScriptCoversResponse } from '../../types';
import { emptyScriptCoversResponse } from '../../utils/scriptCoversFallback';
import { scriptCoverPreviewUrl } from '../../utils/scriptCoverPreviewUrl';
import { Button } from '../Button/Button';

const SLOT_ORDER: ScriptCoverSlot[] = [
  'portrait-en',
  'portrait-zh',
  'landscape-en',
  'landscape-zh',
];

export function ScriptCoversPanel({
  scriptId,
  covers: coversProp,
  onCoversChange,
  compact = false,
}: ScriptCoversPanelProps) {
  const { api } = useOutdoorUi();
  const [covers, setCovers] = useState<ScriptCoversResponse | null>(coversProp ?? null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const batchInputRef = useRef<HTMLInputElement | null>(null);
  const slotInputRefs = useRef<Partial<Record<ScriptCoverSlot, HTMLInputElement | null>>>({});

  const coversKey = covers
    ? covers.slots.map((slot) => `${slot.slot}|${slot.exists}|${slot.updatedAt ?? ''}`).join(';')
    : '';

  useEffect(() => {
    if (coversProp) {
      setCovers(coversProp);
    }
  }, [coversProp, coversKey]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (coversProp) {
        return;
      }
      setLoadError(null);
      try {
        const next = await api.getScriptCovers(scriptId);
        if (!cancelled) {
          setCovers(next);
          onCoversChange?.(next);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : 'Could not load script covers',
          );
          setCovers(emptyScriptCoversResponse(scriptId));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, coversProp, onCoversChange, scriptId]);

  const thumbUrls = useMemo(() => {
    if (!covers) {
      return {} as Partial<Record<ScriptCoverSlot, string>>;
    }
    const urls: Partial<Record<ScriptCoverSlot, string>> = {};
    for (const slot of covers.slots) {
      if (slot.exists) {
        urls[slot.slot] = scriptCoverPreviewUrl(api, slot);
      }
    }
    return urls;
  }, [api, covers, coversKey]);

  const adopt = (next: ScriptCoversResponse) => {
    setLoadError(null);
    setCovers(next);
    onCoversChange?.(next);
  };

  const run = async (label: string, action: () => Promise<ScriptCoversResponse>) => {
    setBusy(true);
    try {
      const next = await action();
      adopt(next);
    } catch (error) {
      Alert.alert(label, error instanceof Error ? error.message : 'Cover action failed');
    } finally {
      setBusy(false);
    }
  };

  const uploadSlot = async (slot: ScriptCoverSlot, file: File) => {
    await run(`Upload ${slot}`, () => api.uploadScriptCoverSlot(scriptId, slot, file));
  };

  const uploadBatch = async (files: FileList | File[]) => {
    const list = [...files];
    if (!list.length) {
      return;
    }
    await run('Upload covers', () => api.uploadScriptCoversBatch(scriptId, list));
  };

  const slotById = new Map((covers?.slots ?? []).map((slot) => [slot.slot, slot]));

  return (
    <View style={webModuleStyle(classes.section)}>
      <Text style={webModuleStyle(classes.groupLabel)}>Publish covers</Text>
      <Text style={webModuleStyle(classes.meta)}>
        {compact
          ? 'Four JPG slots in this script’s covers/ folder.'
          : `Prepare four JPG thumbnails in projects/…/${scriptId}/covers/ — portrait + landscape × English + 中文.`}
      </Text>
      {loadError ? (
        <Text style={webModuleStyle(classes.error)}>
          {loadError}
          {' '}
          Restart the outdoor agent if you just updated code (npm run outdoor:all).
        </Text>
      ) : null}

      {Platform.OS === 'web'
        ? createElement('input', {
            ref: batchInputRef,
            type: 'file',
            accept: 'image/jpeg,image/jpg',
            multiple: true,
            style: { display: 'none' },
            onChange: (event: Event) => {
              const target = event.target as HTMLInputElement;
              const files = target.files;
              if (files?.length) {
                void uploadBatch(files);
              }
              target.value = '';
            },
          })
        : null}

      <View style={webModuleStyle(classes.row)}>
        <Button
          label={busy ? 'Working…' : 'Upload 4 JPGs'}
          onPress={() => batchInputRef.current?.click()}
          disabled={busy || Platform.OS !== 'web'}
        />
      </View>

      {!covers ? (
        <ActivityIndicator color={colors.orange} />
      ) : (
        <View style={webModuleStyle(classes.grid)}>
          {SLOT_ORDER.map((slotId) => {
            const slot = slotById.get(slotId);
            const portrait = slotId.startsWith('portrait-');
            const url = thumbUrls[slotId];
            return (
              <View
                key={slotId}
                style={webModuleStyle(classes.tile, !slot?.exists ? classes.tileMissing : null)}
              >
                <Text style={webModuleStyle(classes.tileLabel)}>{slot?.label ?? slotId}</Text>
                <Text style={webModuleStyle(classes.tileStatus)}>
                  {slot?.exists ? slot.fileName : 'Missing JPG'}
                </Text>
                {url ? (
                  Platform.OS === 'web' ? (
                    createElement('img', {
                      src: url,
                      alt: slot?.label ?? slotId,
                      className: webClassName(
                        portrait ? classes.portraitImage : classes.landscapeImage,
                      ),
                    })
                  ) : (
                    <Image
                      source={{ uri: url }}
                      resizeMode="contain"
                      style={webModuleStyle(
                        portrait ? classes.portraitImage : classes.landscapeImage,
                      )}
                    />
                  )
                ) : (
                  <View
                    style={webModuleStyle(
                      portrait ? classes.portraitImage : classes.landscapeImage,
                      portrait ? classes.portraitPlaceholder : classes.imagePlaceholder,
                    )}
                  />
                )}
                {Platform.OS === 'web'
                  ? createElement('input', {
                      ref: (element: HTMLInputElement | null) => {
                        slotInputRefs.current[slotId] = element;
                      },
                      type: 'file',
                      accept: 'image/jpeg,image/jpg',
                      style: { display: 'none' },
                      onChange: (event: Event) => {
                        const target = event.target as HTMLInputElement;
                        const file = target.files?.[0];
                        if (file) {
                          void uploadSlot(slotId, file);
                        }
                        target.value = '';
                      },
                    })
                  : null}
                <View style={webModuleStyle(classes.tileActions)}>
                  <Button
                    label="Replace"
                    onPress={() => slotInputRefs.current[slotId]?.click()}
                    disabled={busy || Platform.OS !== 'web'}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
