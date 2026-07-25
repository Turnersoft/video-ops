import type { CSSProperties, ReactNode } from 'react';

import { OutdoorSceneVideo } from '../OutdoorSceneVideo/OutdoorSceneVideo';
import { GreenAvatarFill } from '../FilmedPlaceholders/FilmedPlaceholders';
import { PORTRAIT_PRESENTER_BAND_RATIO } from '../../lib/outdoor/portraitLayout';
import { scaleCss } from '../../lib/layout/scaleCss';
import { useCompositionScale } from '../../lib/layout/useCompositionScale';
import classes from './PortraitPresenterBand.module.scss';

export type PortraitPresenterBandProps = {
  scriptId?: string;
  /** Filmed take src — empty shows the studio green placeholder. */
  src?: string;
  heightRatio?: number;
  style?: CSSProperties;
  label?: string;
};

/** Top presenter strip for outdoor/studio portrait — fills the band, no PiP mask. */
export function PortraitPresenterBand({
  scriptId = '',
  src = '',
  heightRatio = PORTRAIT_PRESENTER_BAND_RATIO,
  style,
  label = 'Filmed take · portrait',
}: PortraitPresenterBandProps): ReactNode {
  const s = useCompositionScale();
  return (
    <div
      className={classes.band}
      style={{
        ...scaleCss(s.scale),
        height: `${heightRatio * 100}%`,
        ...style,
      }}
    >
      {src.trim() && scriptId ? (
        <OutdoorSceneVideo
          scriptId={scriptId}
          src={src}
          muted
          objectFit="cover"
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <GreenAvatarFill label={label} />
      )}
    </div>
  );
}
