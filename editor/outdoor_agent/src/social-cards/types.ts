export type SocialCardFormat = 'portrait' | 'landscape' | 'square';

export type SocialCardLang = 'en' | 'zh';

export type SocialCardSpec = {
  format: SocialCardFormat;
  lang: SocialCardLang;
  width: number;
  height: number;
  title: string;
  hook: string;
  episodeLabel: string;
  seriesLabel: string;
  cta: string;
};

export type SocialCardFile = {
  id: string;
  format: SocialCardFormat;
  lang: SocialCardLang;
  width: number;
  height: number;
  htmlPath: string;
  pngPath: string;
  createdAt: string;
};

export type SocialCardsManifest = {
  schemaVersion: 1;
  updatedAt: string;
  cards: SocialCardFile[];
};

export type SocialCardPlatformInfo = {
  platform: string;
  format: SocialCardFormat;
  lang: SocialCardLang;
  cardId: string | null;
  imageUrl: string | null;
  postizImageSupported: boolean;
};
