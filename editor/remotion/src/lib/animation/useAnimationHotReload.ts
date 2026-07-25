// /Users/johndoe/Documents/company/video_ops/remotion/src/lib/useAnimationHotReload.ts
import { videoOpsScriptFolder } from '../videoOpsPaths';
import { getRemotionEnvironment, staticFile } from 'remotion';
import { useEffect, useRef, useState } from 'react';

import {
  animationDocumentFingerprint,
  parseRenderPropsRaw,
} from './loadAnimationDocument';
import { fetchLiveRenderPropsJson } from './fetchLiveRenderProps';
import { stripOutdoorEditFromRenderProps } from './scriptEditingRenderProps';
import { fetchVideoOpsStaticText } from '../studio/fetchVideoOpsStatic';
import { canonicalVideoOpsScriptId } from '../videoOpsPaths';
import type { VideoFromScriptRenderProps } from '../types/renderProps';

const POLL_MS = 1500;
const RENDER_PROPS_CACHE_PATH = '.cache/render-props.json';

function renderPropsCacheRelativePath(scriptId: string): string {
  return `${videoOpsScriptFolder(scriptId)}/${RENDER_PROPS_CACHE_PATH}`;
}

/** Dev: live compile from animation.md. Render: bundled .cache from prep/sync. */
export function useAnimationHotReload(
  scriptId: string,
  showDirector: boolean,
  projectInput: VideoFromScriptRenderProps | null | undefined,
  options: { stripOutdoorEdit?: boolean; includeOutdoorEdit?: boolean; takeId?: string } = {},
): {
  project: VideoFromScriptRenderProps | null;
  error: string;
  loading: boolean;
} {
  const [project, setProject] = useState<VideoFromScriptRenderProps | null>(projectInput ?? null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!projectInput);
  const fingerprintRef = useRef('');
  const revisionRef = useRef(0);
  const stripOutdoorEdit = options.stripOutdoorEdit ?? false;
  const includeOutdoorEdit = options.includeOutdoorEdit ?? false;
  const takeId = options.takeId?.trim() || undefined;

  useEffect(() => {
    if (projectInput) {
      setProject(projectInput);
      setError('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const env = getRemotionEnvironment();
    const useLiveCompile =
      !env.isRendering &&
      (env.isStudio || env.isPlayer || stripOutdoorEdit);
    const shouldPoll = useLiveCompile;

    const applyProject = (next: VideoFromScriptRenderProps) => {
      if (cancelled) {
        return;
      }
      setProject(stripOutdoorEdit ? stripOutdoorEditFromRenderProps(next) : next);
      setError('');
      setLoading(false);
    };

    const loadRenderPropsRaw = async (cacheBust: number): Promise<string | null> => {
      if (useLiveCompile) {
        return fetchLiveRenderPropsJson(scriptId, cacheBust, { includeOutdoorEdit, takeId });
      }
      return fetchVideoOpsStaticText(
        renderPropsCacheRelativePath(scriptId),
        staticFile,
        { cacheBust },
      );
    };

    const loadOnce = async () => {
      try {
        const raw = await loadRenderPropsRaw(revisionRef.current);
        if (!raw) {
          throw new Error(
            useLiveCompile
              ? `Could not compile animation.md for ${scriptId}. Is the Remotion dev API running?`
              : `Could not load ${RENDER_PROPS_CACHE_PATH} for ${scriptId}. Run npm run sync before render.`,
          );
        }
        fingerprintRef.current = animationDocumentFingerprint(raw);
        applyProject(
          parseRenderPropsRaw(raw, scriptId, {
            showDirector,
            contentRevision: revisionRef.current,
          }),
        );
      } catch (caught) {
        if (cancelled) {
          return;
        }
        setError(caught instanceof Error ? caught.message : 'Could not load animation.');
        setLoading(false);
      }
    };

    void loadOnce();

    if (!shouldPoll) {
      return () => {
        cancelled = true;
      };
    }

    const onAnimationChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ scriptId?: string }>).detail;
      if (
        detail?.scriptId &&
        canonicalVideoOpsScriptId(detail.scriptId) !== scriptId
      ) {
        return;
      }
      revisionRef.current += 1;
      void loadOnce();
    };
    window.addEventListener('video-ops-animation-changed', onAnimationChanged);

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const raw = await loadRenderPropsRaw(Date.now());
          if (!raw || cancelled) {
            return;
          }
          const fingerprint = animationDocumentFingerprint(raw);
          if (fingerprint === fingerprintRef.current) {
            return;
          }
          fingerprintRef.current = fingerprint;
          revisionRef.current += 1;
          applyProject(
            parseRenderPropsRaw(raw, scriptId, {
              showDirector,
              contentRevision: revisionRef.current,
            }),
          );
        } catch {
          // Keep last good project on transient poll failures.
        }
      })();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener('video-ops-animation-changed', onAnimationChanged);
      window.clearInterval(interval);
    };
  }, [projectInput, scriptId, showDirector, stripOutdoorEdit, includeOutdoorEdit, takeId]);

  return { project, error, loading };
}
