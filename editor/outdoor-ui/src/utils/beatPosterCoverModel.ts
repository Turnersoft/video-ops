import type { BeatPosterLang } from '../components/BeatPosterSlide/BeatPosterSlide.types';
import type { BeatPosterCoverSlideProps } from '../components/BeatPosterCoverSlide/BeatPosterCoverSlide.types';
import {
  buildBeatPosterCoverContent,
  coverDecorations,
  fitCoverHeadlineSize,
  fitCoverSubtitleSize,
  fitCoverTaglineSize,
} from '../../../../src/beatPosterCover';

export function buildBeatPosterCoverSlideProps(params: {
  scriptId: string;
  lang: BeatPosterLang;
  seriesTitle: string;
  episodeTitleEn: string;
  episodeTitleZh: string;
  promotionalDescriptionEn?: string;
  promotionalDescriptionZh?: string;
  beatCount: number;
  seed: string;
}): BeatPosterCoverSlideProps {
  const {
    scriptId,
    lang,
    seriesTitle,
    episodeTitleEn,
    episodeTitleZh,
    promotionalDescriptionEn,
    promotionalDescriptionZh,
    beatCount,
    seed,
  } = params;
  const episodeTitle = lang === 'zh'
    ? (episodeTitleZh || episodeTitleEn)
    : episodeTitleEn;
  const promotionalDescription = lang === 'zh'
    ? (promotionalDescriptionZh || promotionalDescriptionEn)
    : promotionalDescriptionEn;
  const content = buildBeatPosterCoverContent({
    scriptId,
    lang,
    seriesTitle,
    episodeTitle,
    promotionalDescription,
    beatCount,
  });

  return {
    ...content,
    decorations: coverDecorations(seed),
    layout: {
      headlineFontSize: fitCoverHeadlineSize(content.coverHeadline, lang),
      subtitleFontSize: fitCoverSubtitleSize(content.episodeSubtitle, lang),
      taglineFontSize: fitCoverTaglineSize(content.tagline, lang),
    },
  };
}
