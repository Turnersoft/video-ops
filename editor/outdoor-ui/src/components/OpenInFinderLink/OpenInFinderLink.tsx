export type { OpenInFinderLinkProps } from './OpenInFinderLink.types';

import classes from './OpenInFinderLink.module.scss';
import { webModuleStyle } from '../../utils/webClassName';
import type { OpenInFinderLinkProps } from './OpenInFinderLink.types';
import { useCallback, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { formatOutdoorApiError } from '../../api/client';
import { useOutdoorUi } from '../../context/OutdoorUiContext';

export function OpenInFinderLink({ target }: OpenInFinderLinkProps) {
  const { api } = useOutdoorUi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePress = useCallback(async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.revealTakeVideoInFinder(target);
    } catch (pressError) {
      setError(formatOutdoorApiError(pressError));
    } finally {
      setBusy(false);
    }
  }, [api, busy, target]);

  return (
    <>
      <Pressable onPress={() => void handlePress()} disabled={busy} accessibilityRole="link">
        <Text style={webModuleStyle(classes.link, busy ? classes.linkDisabled : null)}>
          {busy ? 'Opening…' : 'Show in Finder'}
        </Text>
      </Pressable>
      {error ? <Text style={webModuleStyle(classes.linkDisabled)}>{error}</Text> : null}
    </>
  );
}
