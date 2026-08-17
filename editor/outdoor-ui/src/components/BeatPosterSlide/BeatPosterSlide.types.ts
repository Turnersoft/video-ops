export type BeatPosterLang = 'en' | 'zh';

export type BeatPosterDecorations = {
  titleTilt: number;
  cardTilt: number;
  leanTilt: number;
  turnTilt: number;
  sparkle: boolean;
};

export type BeatPosterSlideProps = {
  lang: BeatPosterLang;
  seriesTitle: string;
  episodeTitle: string;
  beatTitle: string;
  paragraphs: string[];
  leanCode: string;
  turnCode: string;
  narrativeFooter: string;
  turnLangHint: string;
  nextLead: string;
  decorations: BeatPosterDecorations;
  layout: {
    titleFontSize: number;
    paragraphFontSize: number;
    textCardFlex: number;
    codeCardFlex: number;
    codeCardAutoHeight: boolean;
    leanFlex: number;
    turnFlex: number;
    leanLines: number;
    turnLines: number;
    editorMode: 'dual' | 'stacked' | 'single';
    primaryEditor: 'lean' | 'turn';
    editorFontSize: number;
  };
  compact?: boolean;
};

export const BEAT_POSTER_ASPECT = 3 / 4;
