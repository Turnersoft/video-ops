import type { BeatPosterProofDeclaration, BeatPosterProofStep } from '../../../../src/beatPosterProof.ts';

export type BeatPosterLang = 'en' | 'zh';

/** Cover slide id — sorts before beat posters in albums. */
export const BEAT_POSTER_COVER_ID = 'cover';

/** 4:3 portrait — tuned for phone feed preview. */
export const BEAT_POSTER_WIDTH = 1080;
export const BEAT_POSTER_HEIGHT = 1440;

export type BeatPosterSpec = {
  scriptId: string;
  beatIndex: number;
  beatId: string;
  /** File stem; equals beatId unless a proof split this beat. */
  posterId: string;
  lang: BeatPosterLang;
  width: number;
  height: number;
  seriesTitle: string;
  episodeTitle: string;
  beatTitle: string;
  /** Short narrative cards (2–3 sentences each). */
  paragraphs: string[];
  leanCode: string;
  turnCode: string;
  /** When non-empty, the poster shows a proof panel instead of the code editor. */
  proofSteps: BeatPosterProofStep[];
  proofDeclaration: BeatPosterProofDeclaration | null;
  proofPartIndex: number;
  proofPartCount: number;
  narrativeFooter: string;
  turnLangHint: string;
  /** Lead-in to the next beat (e.g. "Next: what = asks you to prove →"). */
  nextLead: string;
  pageLabel: string;
  decorations: {
    titleTilt: number;
    cardTilt: number;
    leanTilt: number;
    turnTilt: number;
    sparkle: boolean;
  };
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
};

export type BeatPosterCoverSpec = {
  scriptId: string;
  lang: BeatPosterLang;
  width: number;
  height: number;
  seriesTitle: string;
  episodeTitle: string;
  coverHeadline: string;
  episodeSubtitle: string;
  titleColor: string;
  titleStroke: string;
  tagline: string;
  beatCountLabel: string;
  pageLabel: string;
  swipeHint: string;
  vsLabel: string;
  backgroundLeanCode: string;
  backgroundTurnCode: string;
  decorations: {
    titleTilt: number;
    cardTilt: number;
    sparkle: boolean;
  };
  layout: {
    headlineFontSize: number;
    subtitleFontSize: number;
    taglineFontSize: number;
  };
};

export type BeatPosterFile = {
  beatId: string;
  beatIndex: number;
  lang: BeatPosterLang;
  width: number;
  height: number;
  htmlPath: string;
  pngPath: string;
  createdAt: string;
};

export type BeatPostersManifest = {
  schemaVersion: 1;
  scriptId: string;
  updatedAt: string;
  beatCount: number;
  posters: BeatPosterFile[];
};

/** Live progress while POST /beat-posters clears + regenerates PNGs. */
export type BeatPosterGenerateProgress = {
  scriptId: string;
  status: 'idle' | 'clearing' | 'running' | 'done' | 'error';
  current: number;
  total: number;
  percent: number;
  label: string;
  error?: string;
  updatedAt: string;
};

export type BeatPosterPublishRecord = {
  platform: string;
  /** `album` when all beat posters ship in one post. */
  beatId: string;
  lang: BeatPosterLang;
  postId: string;
  url: string;
  status: 'pending' | 'live' | 'failed' | 'deleted';
  publishedAt: string;
  imageCount?: number;
  stub?: boolean;
  error?: string;
};

export type BeatPosterPublishState = {
  schemaVersion: 1;
  scriptId: string;
  posts: BeatPosterPublishRecord[];
};

export type BeatPosterListItem = BeatPosterFile & {
  beatTitle: string;
  pngUrl: string;
  htmlUrl: string;
};

export type BeatPosterPlatformPreview = {
  platform: string;
  lang: BeatPosterLang;
  title: string;
  body: string;
  imageUrls: string[];
  imageCount: number;
  postizImageSupported: boolean;
  /** Who ships the album: Postiz (auto), SAU (future), or manual upload. */
  provider: 'postiz' | 'sau' | 'manual';
  publishMode: 'auto' | 'manual';
  characterCount: number;
  reviewNotes: string[];
};

export type BeatPosterPublishPreview = {
  scriptId: string;
  lang: BeatPosterLang;
  beatCount: number;
  platforms: BeatPosterPlatformPreview[];
};
