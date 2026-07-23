export type { ScriptLibrarySidebarProps } from './ScriptLibrarySidebar.types';

import classes from './ScriptLibrarySidebar.module.scss';
import { webModuleStyle, webClassName } from '../../utils/webClassName';
import type { ScriptLibrarySidebarProps } from './ScriptLibrarySidebar.types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { formatOutdoorApiError } from '../../api/client';
import { CollapsibleSection } from '../CollapsibleSection/CollapsibleSection';
import { useOutdoorUi } from '../../context/OutdoorUiContext';
import { useOutdoorRoute } from '../../hooks/useOutdoorRoute';
import { colors, radii, spacing, typography } from '../../theme';
import type { VideoOpsCatalog } from '../../types';
import { catalogEpisodesBySeries } from '../../utils/catalogEpisodesBySeries';

const DEFAULT_HEADER_OFFSET = 53;

export function ScriptLibrarySidebar({
  headerOffset = DEFAULT_HEADER_OFFSET,
}: ScriptLibrarySidebarProps) {
  const { api, layout, refreshKey, scriptSidebarOpen, setScriptSidebarOpen } = useOutdoorUi();
  const { route, navigateToScript } = useOutdoorRoute();
  const [catalog, setCatalog] = useState<VideoOpsCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeScriptId =
    route.name === 'script' || route.name === 'animation'
      ? route.scriptId
      : route.name === 'take'
        ? route.scriptId
        : null;

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await api.getCatalog();
      setCatalog(next);
    } catch (loadError) {
      setError(formatOutdoorApiError(loadError));
      setCatalog(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!scriptSidebarOpen) {
      return;
    }
    void loadCatalog();
  }, [loadCatalog, refreshKey, scriptSidebarOpen]);

  const episodesBySeries = useMemo(() => catalogEpisodesBySeries(catalog), [catalog]);

  const openScript = useCallback(
    (scriptId: string) => {
      navigateToScript(scriptId);
      if (layout === 'mobile') {
        setScriptSidebarOpen(false);
      }
    },
    [layout, navigateToScript, setScriptSidebarOpen],
  );

  if (!scriptSidebarOpen) {
    return null;
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close scripts sidebar"
        style={[webModuleStyle(classes.backdrop,
          layout === 'mobile' ? classes.backdropVisible : classes.backdropHidden,), { top: headerOffset }]}
        onPress={() => setScriptSidebarOpen(false)}
      />
      <View
        style={[webModuleStyle(classes.panel,
          layout === 'mobile' ? classes.panelMobile : classes.panelBrowser,), { top: headerOffset }]}
      >
        <View style={webModuleStyle(classes.panelHeader)}>
          <Text style={webModuleStyle(classes.panelTitle)}>Scripts</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setScriptSidebarOpen(false)}
            style={webModuleStyle(classes.closeButton)}
          >
            <Text style={webModuleStyle(classes.closeButtonText)}>Close</Text>
          </Pressable>
        </View>
        <ScrollView
          style={webModuleStyle(classes.scroll)}
          contentContainerStyle={webModuleStyle(classes.scrollBody)}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={webModuleStyle(classes.centered)}>
              <ActivityIndicator color={colors.orange} size="small" />
            </View>
          ) : null}
          {error ? <Text style={webModuleStyle(classes.error)}>{error}</Text> : null}
          {!loading && !error && episodesBySeries.length === 0 ? (
            <Text style={webModuleStyle(classes.empty)}>No outdoor scripts found.</Text>
          ) : null}
          {episodesBySeries.map(({ index, series, episodes }) => {
            const containsActive = activeScriptId
              ? episodes.some((episode) => episode.scriptId === activeScriptId)
              : false;
            return (
              <CollapsibleSection
                key={series.id}
                title={`${index}. ${series.title}`}
                summary={`${episodes.length} script${episodes.length === 1 ? '' : 's'}`}
                defaultOpen={containsActive || index === 1}
              >
                {episodes.map((episode) => {
                  const active = episode.scriptId === activeScriptId;
                  return (
                    <Pressable
                      key={episode.scriptId}
                      accessibilityRole="button"
                      onPress={() => openScript(episode.scriptId)}
                      style={webModuleStyle(classes.scriptRow,
                        active ? classes.scriptRowActive : null,)}
                    >
                      <Text
                        style={webModuleStyle(classes.scriptTitle, active ? classes.scriptTitleActive : null)}
                        numberOfLines={2}
                      >
                        {episode.title}
                      </Text>
                      <Text style={webModuleStyle(classes.scriptMeta)} numberOfLines={1}>
                        {episode.slideCount || 0} slides
                        {episode.takeCount
                          ? ` · ${episode.takeCount} take${episode.takeCount === 1 ? '' : 's'}`
                          : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </CollapsibleSection>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}
