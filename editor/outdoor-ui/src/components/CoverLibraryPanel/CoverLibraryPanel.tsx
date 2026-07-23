export type { CoverLibraryPanelProps } from './CoverLibraryPanel.types';

import classes from './CoverLibraryPanel.module.scss';
import { layoutStylesFor } from '../../layout';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { CoverLibraryPanelProps } from './CoverLibraryPanel.types';
import { createElement, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { colors, radii, spacing, typography } from '../../theme';
import type { CoversListResponse } from '../../types';
import { Button } from '../Button/Button';

export function CoverLibraryPanel({
  jobId,
  covers,
  englishPlatforms,
  chinaPlatforms,
  onCoversChange,
}: CoverLibraryPanelProps) {
  const { layout,  api, pickImage  } = useOutdoorUi();
  const layoutStyles = layoutStylesFor(layout);
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const coverIdsKey = covers
    ? covers.covers.map((cover) => `${cover.id}|${cover.url}`).join(';')
    : '';

  useEffect(() => {
    if (!covers) {
      return;
    }
    setSelectedCoverId((prev) => prev ?? covers.covers[0]?.id ?? null);
    const nextLabels: Record<string, string> = {};
    for (const cover of covers.covers) {
      nextLabels[cover.id] = cover.label;
    }
    setLabels(nextLabels);
    void (async () => {
      const urls: Record<string, string> = {};
      for (const cover of covers.covers) {
        urls[cover.id] = await api.absoluteUrl(cover.url);
      }
      setThumbUrls((prev) => {
        const same =
          Object.keys(prev).length === Object.keys(urls).length &&
          Object.keys(urls).every((id) => prev[id] === urls[id]);
        return same ? prev : urls;
      });
    })();
  }, [api, coverIdsKey, covers]);

  const run = async (label: string, action: () => Promise<CoversListResponse>) => {
    setBusy(true);
    try {
      const next = await action();
      onCoversChange(next);
    } catch (error) {
      Alert.alert(label, error instanceof Error ? error.message : 'Cover action failed');
    } finally {
      setBusy(false);
    }
  };

  const uploadWebFile = async (file: File) => {
    await run('Upload cover', () => api.uploadCover(jobId, file, file.name, 'browser'));
  };

  const uploadNative = async () => {
    if (!pickImage) {
      Alert.alert('Upload cover', 'Image picker is not configured for this shell.');
      return;
    }
    const picked = await pickImage();
    if (!picked) {
      return;
    }
    const response = await fetch(picked.uri);
    const blob = await response.blob();
    const file = new File([blob], picked.name, { type: picked.type });
    await run('Upload cover', () => api.uploadCover(jobId, file, picked.name, 'iphone'));
  };

  const handleUploadPress = () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    void uploadNative();
  };

  const batchAssign = async (group: 'english' | 'china') => {
    if (!selectedCoverId) {
      Alert.alert('Cover', 'Select a cover in the library first');
      return;
    }
    const platforms = group === 'english' ? englishPlatforms : chinaPlatforms;
    if (!platforms.length) {
      Alert.alert('Cover', `No ${group} platforms to assign`);
      return;
    }
    await run(`Apply ${group}`, () =>
      api.patchCoverPlatformMap(jobId, {
        batch: { group, coverId: selectedCoverId, platforms },
      }),
    );
  };

  const items = covers?.covers ?? [];

  return (
    <View style={webModuleStyle(classes.section)}>
      <Text style={webModuleStyle(classes.groupLabel)}>Cover library</Text>
      <Text style={webModuleStyle(classes.meta)}>Upload stills for this take · assign per platform or batch EN / 中文</Text>

      {Platform.OS === 'web'
        ? createElement('input', {
            ref: fileInputRef,
            type: 'file',
            accept: 'image/png,image/jpeg,image/webp',
            style: { display: 'none' },
            onChange: (event: Event) => {
              const target = event.target as HTMLInputElement;
              const file = target.files?.[0];
              if (file) {
                void uploadWebFile(file);
              }
              target.value = '';
            },
          })
        : null}

      <View style={webModuleStyle(classes.row)}>
        <Button label={busy ? 'Working…' : 'Upload cover'} onPress={handleUploadPress} disabled={busy} />
        <Button
          label="Capture portrait still"
          onPress={() =>
            void run('Capture portrait', () =>
              api.captureCoverFromComposite(jobId, {
                format: 'portrait',
                label: 'portrait still',
              }), )
          }
          disabled={busy}
        />
        <Button
          label="Capture landscape still"
          onPress={() =>
            void run('Capture landscape', () =>
              api.captureCoverFromComposite(jobId, {
                format: 'landscape',
                label: 'landscape still',
              }),
            )
          }
          disabled={busy}
        />
        <Button
          label="Apply selected → all English"
          onPress={() => void batchAssign('english')}
          disabled={busy || !items.length}
        />
        <Button
          label="Apply selected → all 中文"
          onPress={() => void batchAssign('china')}
          disabled={busy || !items.length}
        />
      </View>

      {!covers ? (
        <ActivityIndicator color={colors.orange} />
      ) : (
        <View style={layoutStyles.grid}>
          {items.map((cover) => {
            const active = cover.id === selectedCoverId;
            return (
              <View
                key={cover.id}
                style={[webModuleStyle(active ? classes.tileActive : null), layoutStyles.coverTile]}
              >
                <Pressable onPress={() => setSelectedCoverId(cover.id)}>
                  {thumbUrls[cover.id] ? (
                    <Image source={{ uri: thumbUrls[cover.id] }} style={webModuleStyle(classes.image)} />
                  ) : (
                    <View style={webModuleStyle(classes.imagePlaceholder)} />
                  )}
                </Pressable>
                <TextInput
                  style={webModuleStyle(classes.labelInput)}
                  value={labels[cover.id] ?? cover.label}
                  onChangeText={(text) =>
                    setLabels((prev) => ({ ...prev, [cover.id]: text }))
                  }
                />
                <Text style={webModuleStyle(classes.usedBy)}>
                  {cover.usedBy.length ? cover.usedBy.join(', ') : 'unused'}
                </Text>
                <View style={webModuleStyle(classes.tileActions)}>
                  <Button
                    label="Rename"
                    onPress={() => {
                      const label = (labels[cover.id] ?? cover.label).trim();
                      if (!label) {
                        Alert.alert('Rename', 'Cover label is required');
                        return;
                      }
                      void run('Rename', () => api.renameCover(jobId, cover.id, label));
                    }}
                    disabled={busy}
                  />
                  <Button
                    label="Duplicate"
                    onPress={() => void run('Duplicate', () => api.duplicateCover(jobId, cover.id))}
                    disabled={busy}
                  />
                  <Button
                    label="Delete"
                    onPress={() =>
                      Alert.alert('Delete cover', 'Delete this cover?', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () =>
                            void run('Delete', () => api.deleteCover(jobId, cover.id)),
                        },
                      ])
                    }
                    variant="danger"
                    disabled={busy}
                  />
                </View>
              </View>
            );
          })}
          {!items.length ? <Text style={webModuleStyle(classes.meta)}>No covers yet — upload a PNG/JPG.</Text> : null}
        </View>
      )}
    </View>
  );
}
