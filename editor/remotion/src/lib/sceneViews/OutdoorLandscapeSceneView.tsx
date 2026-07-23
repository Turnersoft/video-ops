import type { ReactNode } from 'react';

import { OutdoorFilmedClipMask } from '../../components/OutdoorFilmedClipMask/OutdoorFilmedClipMask';
import { OutdoorPresenterVideo } from '../../components/OutdoorPresenterVideo/OutdoorPresenterVideo';
import { useCompositionScale } from '../layout/useCompositionScale';
import type { OutdoorBeatLayout } from '../outdoor/resolveOutdoorBeatLayout';

type OutdoorLandscapeSceneViewProps = {
  scriptId: string;
  outdoorEdit: NonNullable<import('../types/renderProps').RenderScene['outdoorEdit']>;
  outdoorBeatIndex: number;
  outdoorBeatLayout: OutdoorBeatLayout;
  mainContent: ReactNode;
};

export function OutdoorLandscapeSceneView({
  scriptId,
  outdoorEdit,
  outdoorBeatIndex,
  outdoorBeatLayout,
  mainContent,
}: OutdoorLandscapeSceneViewProps) {
  const s = useCompositionScale();
  const scriptFullscreen = outdoorBeatLayout.scriptFullscreen;
  const presenterMode = outdoorBeatLayout.presenterMode;
  const isFullClipPresenter = !scriptFullscreen && presenterMode === 'full-clip';
  const isAvatarPlaceholder = !outdoorEdit.videoSrc.trim();

  return (
    <div
      style={{
        position: 'absolute',
        top: s.px(40),
        left: s.px(40),
        right: s.px(40),
        bottom: s.px(48),
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {scriptFullscreen || !isFullClipPresenter ? mainContent : null}
        {isFullClipPresenter ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              aspectRatio: '16 / 9',
              borderRadius: s.px(16),
              overflow: 'hidden',
              border: '1px solid rgba(148, 163, 184, 0.22)',
              background: '#020617',
              zIndex: 2,
            }}
          >
            <OutdoorPresenterVideo
              scriptId={scriptId}
              src={outdoorEdit.videoSrc}
              muted
              objectFit="contain"
            />
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
