import type { ReactNode } from 'react';

import { OutdoorFilmedClipMask } from '../../components/OutdoorFilmedClipMask/OutdoorFilmedClipMask';
import { isVoiceOnlyOutdoorTake } from '../../components/FilmedPlaceholders/FilmedPlaceholders';
import type { OutdoorBeatLayout } from '../outdoor/resolveOutdoorBeatLayout';

type OutdoorLandscapeSceneViewProps = {
  scriptId: string;
  outdoorEdit: NonNullable<import('../types/renderProps').RenderScene['outdoorEdit']>;
  outdoorBeatIndex: number;
  outdoorBeatLayout: OutdoorBeatLayout;
  sceneIndex?: number;
  beatCount?: number;
  mainContent: ReactNode;
};

export function OutdoorLandscapeSceneView({
  scriptId,
  outdoorEdit,
  outdoorBeatIndex,
  outdoorBeatLayout,
  sceneIndex = 0,
  beatCount = 0,
  mainContent,
}: OutdoorLandscapeSceneViewProps) {
  const scriptFullscreen = outdoorBeatLayout.scriptFullscreen;
  const presenterMode = outdoorBeatLayout.presenterMode;
  const isFullClipPresenter = !scriptFullscreen && presenterMode === 'full-clip';
  const isAvatarPlaceholder = !outdoorEdit.videoSrc.trim();
  const voiceOnlyTake = isVoiceOnlyOutdoorTake(outdoorEdit);
  const resolvedBeatCount =
    beatCount ||
    outdoorEdit.beatDurationsSeconds?.length ||
    0;
  const scriptPipMask = outdoorBeatLayout.pipMask;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
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
        {!voiceOnlyTake ? (
          <OutdoorFilmedClipMask
            scriptId={scriptId}
            src={outdoorEdit.videoSrc}
            pipMask={scriptPipMask}
            beatIndex={outdoorBeatIndex}
            sceneIndex={sceneIndex}
            beatCount={resolvedBeatCount}
            persistAcrossBeats={isAvatarPlaceholder}
            enableMaskEditing
            layoutFormat="landscape"
          />
        ) : null}
      </div>
    </div>
  );
}
