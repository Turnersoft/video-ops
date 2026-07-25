import type { ReactNode } from "react";
import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

import { BeatPlacementsLayer } from "../../components/BeatPlacementsLayer/BeatPlacementsLayer";
import { legacyStickersToPlacements } from "../../lib/placements/beatPlacements";
import { CompareBeatVideoPanel } from "../../components/CompareBeatVideoPanel/CompareBeatVideoPanel";
import { OutdoorFilmedClipMask } from "../../components/OutdoorFilmedClipMask/OutdoorFilmedClipMask";
import {
  BeatTemplateStage,
  CompareDualPortraitLayout,
  beatTemplateStageMeta,
  isCompareShellTemplateKind,
} from "../../beats";
import type { BeatStudioTemplateKind } from "../../beats/beatStudioCompile";
import { useCompositionScale } from "../layout/useCompositionScale";
import type { OutdoorBeatLayout } from "../outdoor/resolveOutdoorBeatLayout";
import {
  PORTRAIT_PRESENTER_BAND_RATIO,
  resolvePortraitBandPipMask,
  resolvePortraitFramePipMask,
} from "../outdoor/portraitLayout";
import type { CompareLayer } from "../layers/types";
import type { RenderScene } from "../types/renderProps";
import { sceneArrayIndex } from "../types/renderProps";

type OutdoorPortraitSceneViewProps = {
  scriptId: string;
  scene: RenderScene;
  outdoorEdit?: RenderScene["outdoorEdit"];
  outdoorBeatIndex: number;
  outdoorBeatLayout: OutdoorBeatLayout;
  compareLayer: CompareLayer | undefined;
  mainContent: ReactNode;
  /** When false, render beat-template mainContent instead of compare portrait layout. */
  useCompareShell?: boolean;
  activeBeatTemplateKind?: BeatStudioTemplateKind | null;
  contentRevision?: number;
  sceneDirector: RenderScene["director"];
  sceneDurationSeconds: number;
};

function wrapPortraitCompareShell(
  content: ReactNode,
  kind: BeatStudioTemplateKind | null | undefined,
): ReactNode {
  if (!isCompareShellTemplateKind(kind)) {
    return content;
  }
  const meta = beatTemplateStageMeta(kind);
  return (
    <BeatTemplateStage compact tone={meta.tone}>
      {content}
    </BeatTemplateStage>
  );
}

export function OutdoorPortraitSceneView({
  scriptId,
  scene,
  outdoorEdit,
  outdoorBeatIndex,
  outdoorBeatLayout,
  compareLayer,
  mainContent,
  useCompareShell = true,
  activeBeatTemplateKind = null,
  contentRevision,
  sceneDirector,
  sceneDurationSeconds,
}: OutdoorPortraitSceneViewProps) {
  const s = useCompositionScale();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scriptFullscreen = outdoorBeatLayout.scriptFullscreen;
  const isAvatarPlaceholder = !outdoorEdit?.videoSrc.trim();
  const activeBeatVideo = compareLayer?.beatVideos?.[outdoorBeatIndex];
  const activePlacements = useMemo(() => {
    const fromLayer = compareLayer?.beatPlacements?.[outdoorBeatIndex];
    if (fromLayer?.length) {
      return fromLayer;
    }
    return legacyStickersToPlacements(
      compareLayer?.beatStickers?.[outdoorBeatIndex],
    );
  }, [
    compareLayer?.beatPlacements,
    compareLayer?.beatStickers,
    outdoorBeatIndex,
  ]);
  const beatDurationSeconds = useMemo(() => {
    if (
      sceneDirector?.sayTimings &&
      sceneDirector.sayTimings[outdoorBeatIndex + 1] !== undefined
    ) {
      return (
        (sceneDirector.sayTimings[outdoorBeatIndex + 1] ??
          sceneDurationSeconds) -
        (sceneDirector.sayTimings[outdoorBeatIndex] ?? 0)
      );
    }
    return sceneDurationSeconds / Math.max(sceneDirector?.say.length ?? 1, 1);
  }, [outdoorBeatIndex, sceneDirector, sceneDurationSeconds]);

  const beatRelativeSeconds = useMemo(() => {
    const sceneSeconds = frame / fps;
    const beatStart =
      sceneDirector?.sayTimings?.[outdoorBeatIndex] ??
      outdoorBeatIndex *
        (sceneDurationSeconds / Math.max(sceneDirector?.say.length ?? 1, 1));
    return sceneSeconds - beatStart;
  }, [frame, fps, outdoorBeatIndex, sceneDirector, sceneDurationSeconds]);

  const portraitShellStyle = {
    position: "absolute" as const,
    inset: outdoorEdit ? 0 : s.px(16),
    display: "flex",
    flexDirection: "column" as const,
    boxSizing: "border-box" as const,
    gap: outdoorEdit ? 0 : s.px(10),
  };

  const scriptPipMask = outdoorBeatLayout.pipMask;
  const beatCount =
    outdoorEdit?.beatDurationsSeconds?.length ??
    sceneDirector?.say?.length ??
    0;
  /** Script-fullscreen only: absolute overlay remapped to portrait top strip. */
  const fullscreenOverlayMask = resolvePortraitFramePipMask(scriptPipMask);
  const bandPipMask = resolvePortraitBandPipMask(scriptPipMask);

  const comparePanel =
    useCompareShell && compareLayer ? (
      <CompareDualPortraitLayout
        scriptId={scriptId}
        scene={scene}
        leanTrack={String(compareLayer.leanTrack)}
        turnTrack={String(compareLayer.turnTrack)}
        editorFontScale={compareLayer.editorFontScale}
        leanEditorFontScale={compareLayer.leanEditorFontScale}
        renderFontScale={compareLayer.renderFontScale}
        director={sceneDirector}
        durationSeconds={sceneDurationSeconds}
        contentRevision={contentRevision}
        compiledTracks={compareLayer.compiledTracks}
        focusBeats={compareLayer.focusBeats}
        portraitBottomTargets={compareLayer.portraitBottomTargets}
        activeBeatIndex={outdoorBeatIndex}
      />
    ) : (
      mainContent
    );

  const beatContent = wrapPortraitCompareShell(
    activeBeatVideo ? (
      <CompareBeatVideoPanel scriptId={scriptId} video={activeBeatVideo} />
    ) : (
      comparePanel
    ),
    activeBeatTemplateKind,
  );

  const beatPanel = (
    <div
      style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {beatContent}
      {activePlacements.length > 0 ? (
        <BeatPlacementsLayer
          scriptId={scriptId}
          sceneIndex={sceneArrayIndex(scene)}
          beatIndex={outdoorBeatIndex}
          placements={activePlacements}
          beatRelativeSeconds={beatRelativeSeconds}
          beatDurationSeconds={beatDurationSeconds}
        />
      ) : null}
    </div>
  );

  if (scriptFullscreen && outdoorEdit) {
    return (
      <div style={portraitShellStyle}>
        <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
          <OutdoorFilmedClipMask
            scriptId={scriptId}
            src={outdoorEdit.videoSrc}
            pipMask={fullscreenOverlayMask}
            beatIndex={outdoorBeatIndex}
            sceneIndex={sceneArrayIndex(scene)}
            beatCount={beatCount}
            persistAcrossBeats={isAvatarPlaceholder}
            enableMaskEditing={false}
            layoutFormat="portrait"
          />
          <div
            style={{
              position: "relative",
              zIndex: 1,
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {beatPanel}
          </div>
        </div>
      </div>
    );
  }

  if (!outdoorEdit) {
    // Studio portrait: CompareDualPortraitLayout owns the top presenter band slot.
    return <div style={portraitShellStyle}>{beatPanel}</div>;
  }

  return (
    <div style={portraitShellStyle}>
      <div
        style={{
          position: "relative",
          flexShrink: 0,
          height: `${PORTRAIT_PRESENTER_BAND_RATIO * 100}%`,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <OutdoorFilmedClipMask
          scriptId={scriptId}
          src={outdoorEdit.videoSrc}
          pipMask={bandPipMask}
          beatIndex={outdoorBeatIndex}
          sceneIndex={sceneArrayIndex(scene)}
          beatCount={beatCount}
          persistAcrossBeats={isAvatarPlaceholder}
          enableMaskEditing={false}
          layoutFormat="portrait"
          boundsMode="parent"
        />
      </div>
      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {beatPanel}
      </div>
    </div>
  );
}
