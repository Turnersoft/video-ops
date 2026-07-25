import type { VideoFromScriptRenderProps } from '../types/renderProps';

/** Script-editing preview: studio mask placeholders only — no linked take footage/audio. */
export function stripOutdoorEditFromRenderProps(
  props: VideoFromScriptRenderProps,
): VideoFromScriptRenderProps {
  return {
    ...props,
    scenes: props.scenes.map((scene) => {
      const next = { ...scene };
      delete next.outdoorEdit;
      return next;
    }),
  };
}
