import type { BeatPosterLang } from '../BeatPosterSlide/BeatPosterSlide.types';
import type { BeatPosterPlatformPreview } from '../../types';
import type { PlatformPublishUi } from '../../utils/beatPosterPublishLifecycle';

export type BeatPosterSocialFeedPreviewProps = {
  lang: BeatPosterLang;
  platforms: BeatPosterPlatformPreview[];
  absoluteUrl: (path: string) => string;
  slideIndex: number;
  onSlideIndexChange: (index: number) => void;
  platformLifecycle?: (platform: string, publishMode: 'auto' | 'manual') => PlatformPublishUi;
};
