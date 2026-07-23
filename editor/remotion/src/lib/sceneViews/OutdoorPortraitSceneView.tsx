import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

import { BeatPlacementsLayer } from '../../components/BeatPlacementsLayer/BeatPlacementsLayer';
import { legacyStickersToPlacements } from '../../lib/placements/beatPlacements';
import { CompareBeatVideoPanel } from '../../components/CompareBeatVideoPanel/CompareBeatVideoPanel';
import { OutdoorFilmedClipMask } from '../../components/OutdoorFilmedClipMask/OutdoorFilmedClipMask';
import { OutdoorPresenterVideo } from '../../components/OutdoorPresenterVideo/OutdoorPresenterVideo';
import {
    BeatTemplateStage,
    CompareDualPortraitLayout,
    beatTemplateStageMeta,
    isCompareShellTemplateKind,
} from '../../beats';
import type { BeatStudioTemplateKind } from '../../beats/beatStudioCompile';
import { useCompositionScale } from '../layout/useCompositionScale';
import type { OutdoorBeatLayout } from '../outdoor/resolveOutdoorBeatLayout';
import type { CompareLayer } from '../layers/types';
import type { RenderScene } from '../types/renderProps';

type OutdoorPortraitSceneViewProps = {
  scriptId: string;
  scene: RenderScene;
  outdoorEdit?: RenderScene['outdoorEdit'];
  outdoorBeatIndex: number;
  outdoorBeatLayout: OutdoorBeatLayout;
  compareLayer: CompareLayer | undefined;
  mainContent: ReactNode;
  /** When false, render beat-template mainContent instead of compare portrait layout. */
  useCompareShell?: boolean;
  activeBeatTemplateKind?: BeatStudioTemplateKind | null;
  contentRevision?: number;
  sceneDirector: RenderScene['director'];
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
  const presenterMode = outdoorBeatLayout.presenterMode;
  const isFullClipPresenter = !scriptFullscreen && presenterMode === 'full-clip';
  const isAvatarPlaceholder = !outdoorEdit?.videoSrc.trim();
  const activeBeatVideo = compareLayer?.beatVideos?.[outdoorBeatIndex];
  const activePlacements = useMemo(() => {
    const fromLayer = compareLayer?.beatPlacements?.[outdoorBeatIndex];
    if (fromLayer?.length) {
      return fromLayer;
    }
    return legacyStickersToPlacements(compareLayer?.beatStickers?.[outdoorBeatIndex]);
  }, [compareLayer?.beatPlacements, compareLayer?.beatStickers, outdoorBeatIndex]);
  const beatDurationSeconds = useMemo(() => {
    if (
      sceneDirector?.sayTimings &&
      sceneDirector.sayTimings[outdoorBeatIndex + 1] !== undefined
    ) {
      return (
        (sceneDirector.sayTimings[outdoorBeatIndex + 1] ?? sceneDurationSeconds) -
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
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {beatContent}
      {activePlacements.length > 0 ? (
        <BeatPlacementsLayer
          scriptId={scriptId}
          sceneIndex={scene.index}
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
      <div
        style={{
          position: 'absolute',
          inset: s.px(16),
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          {beatPanel}
          <OutdoorFilmedClipMask
            scriptId={scriptId}
            src={outdoorEdit.videoSrc}
            pipMask={
              isAvatarPlaceholder
                ? outdoorEdit.pipMask ?? outdoorBeatLayout.pipMask
                : outdoorBeatLayout.pipMask
            }
            beatIndex={outdoorBeatIndex}
            persistAcrossBeats={isAvatarPlaceholder}
          />
        </div>
      </div>
    );
  }

  if (!outdoorEdit) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: s.px(16),
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {beatPanel}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: s.px(16),
        display: 'flex',
        flexDirection: 'column',
        gap: s.px(10),
        boxSizing: 'border-box',
      }}
    >
      <div
        style={
          isFullClipPresenter
            ? {
                width: '100%',
                aspectRatio: '16 / 9',
                borderRadius: s.px(18),
                overflow: 'hidden',
                border: '1px solid rgba(148, 163, 184, 0.22)',
                flexShrink: 0,
                background: '#020617',
              }
            : {
                height: '33.33%',
                borderRadius: s.px(18),
                overflow: 'hidden',
                border: '1px solid rgba(148, 163, 184, 0.22)',
                flexShrink: 0,
              }
        }
      >
        <OutdoorPresenterVideo
          scriptId={scriptId}
          src={outdoorEdit.videoSrc}
          muted
          objectFit={isFullClipPresenter ? 'contain' : 'cover'}
        />
      </div>
      {beatPanel}
    </div>
  );
}
