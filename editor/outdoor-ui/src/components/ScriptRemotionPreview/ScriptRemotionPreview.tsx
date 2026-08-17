export type {
  ScriptRemotionPreviewHandle,
  ScriptRemotionPreviewProps,
} from "./ScriptRemotionPreview.types";

import classes from "./ScriptRemotionPreview.module.scss";
import { webModuleStyle } from "../../utils/webClassName";
import type {
  ScriptRemotionPreviewHandle,
  ScriptRemotionPreviewProps,
} from "./ScriptRemotionPreview.types";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { useWindowDimensions, View } from "react-native";

import { remotionEmbedFromOrigin } from "../../api/transport";
import { remotionStudioEmbedUrl, remotionStudioOrigin } from "../../api/urls";
import { useOutdoorUi } from "../../context/OutdoorUiContext";
import { computeScriptRemotionPreviewSize } from "../../utils/scriptRemotionPreviewLayout";
import {
  RemotionEmbed,
  type RemotionEmbedHandle,
  type RemotionSeekOptions,
} from "../RemotionEmbed/RemotionEmbed";

/**
 * Live Remotion Studio embed for a script composition (`id` === scriptId).
 * Works on Mac browser (iframe) and iPhone (WebView) via RemotionEmbed.
 */
export const ScriptRemotionPreview = forwardRef<
  ScriptRemotionPreviewHandle,
  ScriptRemotionPreviewProps
>(function ScriptRemotionPreview(
  { scriptId, revision = 0, layoutVariant = "default", previewFormat = "landscape" },
  ref,
) {
  const { transport, layout } = useOutdoorUi();
  const embedRef = useRef<RemotionEmbedHandle | null>(null);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  const previewSize = useMemo(
    () =>
      computeScriptRemotionPreviewSize(
        windowHeight,
        windowWidth,
        layout,
        layoutVariant,
        previewFormat,
      ),
    [layout, layoutVariant, previewFormat, windowHeight, windowWidth],
  );

  const embedUrl = useMemo(() => {
    const base = transport?.remotionOrigin
      ? remotionEmbedFromOrigin(transport.remotionOrigin, scriptId)
      : remotionStudioEmbedUrl(null, scriptId);
    const joiner = base.includes("?") ? "&" : "?";
    return `${base}${joiner}previewRev=${revision}`;
  }, [revision, scriptId, transport?.remotionOrigin]);

  const studioOrigin = useMemo(
    () => remotionStudioOrigin(embedUrl),
    [embedUrl],
  );

  useImperativeHandle(
    ref,
    () => ({
      seekToFrame: (frame: number, options?: RemotionSeekOptions) => {
        embedRef.current?.seekToFrame(frame, scriptId, options);
      },
    }),
    [scriptId],
  );

  const remotionHint = transport?.remotionOrigin
    ? `${transport.remotionSource} · ${transport.remotionOrigin}`
    : "Waiting for Remotion URL (Settings → Mac connection)";

  return (
    <View
      style={[
        webModuleStyle(
          classes.wrap,
          layout === "mobile" ? classes.wrapMobile : null,
          layoutVariant === "split" ? classes.wrapSplit : null,
        ),
        { width: previewSize.width },
      ]}
    >
      <View
        style={[
          webModuleStyle(classes.frame),
          { width: previewSize.width, height: previewSize.height },
        ]}
      >
        <RemotionEmbed
          key={`${scriptId}-${previewFormat}-${revision}-${transport?.remotionOrigin ?? "none"}`}
          ref={embedRef}
          url={embedUrl}
          title={`Remotion · ${scriptId}`}
          studioOrigin={studioOrigin}
          compositionId={scriptId}
          fallbackText={
            transport?.remotionOrigin
              ? "Loading Remotion…"
              : remotionHint
          }
        />
      </View>
    </View>
  );
});
