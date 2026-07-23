// /Users/johndoe/Documents/company/video_ops/remotion/src/lib/loadAnimationDocument.ts
import { animationDocumentFingerprint } from '../compile/video-ops/animationDocumentFingerprint.ts';

import type { VideoFromScriptRenderProps } from '../types/renderProps';

export { animationDocumentFingerprint };

export function parseRenderPropsRaw(
  raw: string,
  scriptId: string,
  options?: { contentRevision?: number; showDirector?: boolean },
): VideoFromScriptRenderProps {
  const parsed = JSON.parse(raw) as VideoFromScriptRenderProps;
  return {
    ...parsed,
    scriptId: parsed.scriptId ?? scriptId,
    showDirector: options?.showDirector ?? parsed.showDirector ?? false,
    contentRevision: options?.contentRevision ?? parsed.contentRevision,
  };
}

/** @deprecated Use parseRenderPropsRaw — loads compiled .cache/render-props.json */
export function parseAnimationDocumentRaw(
  raw: string,
  scriptId: string,
  options?: { contentRevision?: number; showDirector?: boolean },
): VideoFromScriptRenderProps {
  return parseRenderPropsRaw(raw, scriptId, options);
}
