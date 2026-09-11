import type { BeatPosterProofDeclaration, BeatPosterProofStep } from '../../../../../src/beatPosterProof';

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
  proofDeclaration: BeatPosterProofDeclaration | null;
  /** When non-empty, the poster shows a proof panel instead of the code editor. */
  proofSteps: BeatPosterProofStep[];
  proofPartIndex: number;
  proofPartCount: number;
  /** File stem for capture / generate; equals the beat id unless split. */
  posterId: string;
  narrativeFooter: string;
  turnLangHint: string;
  nextLead: string;
  pageLabel: string;
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
