import type { BeatPosterCoverDecorations } from '../../../../../src/beatPosterCover';
import type { BeatPosterLang } from '../BeatPosterSlide/BeatPosterSlide.types';

export type BeatPosterCoverSlideProps = {
  lang: BeatPosterLang;
  seriesTitle: string;
  episodeTitle: string;
  coverHeadline: string;
  episodeSubtitle: string;
  titleColor: string;
  titleStroke: string;
  tagline: string;
  beatCountLabel: string;
  swipeHint: string;
  vsLabel: string;
  backgroundLeanCode: string;
  backgroundTurnCode: string;
  decorations: BeatPosterCoverDecorations;
  layout: {
    headlineFontSize: number;
    subtitleFontSize: number;
    taglineFontSize: number;
  };
  compact?: boolean;
};
