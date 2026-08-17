import type { SocialPosts } from '../types';

export type SocialDraftCard = {
  group: 'headline' | 'english' | 'china';
  platform: string;
  title: string;
  body: string;
  titleOnly: boolean;
};

export function cardsFromSocial(social: SocialPosts): SocialDraftCard[] {
  const cards: SocialDraftCard[] = [
    {
      group: 'headline',
      platform: 'EN',
      title: social.titleEnglish ?? social.title ?? '',
      body: '',
      titleOnly: true,
    },
  ];
  for (const [platform, fields] of Object.entries(social.english ?? {})) {
    cards.push({
      group: 'english',
      platform,
      title: fields?.title ?? '',
      body: fields?.body ?? '',
      titleOnly: false,
    });
  }
  cards.push({
    group: 'headline',
    platform: 'ZH',
    title: social.titleChina ?? '',
    body: '',
    titleOnly: true,
  });
  for (const [platform, fields] of Object.entries(social.china ?? {})) {
    cards.push({
      group: 'china',
      platform,
      title: fields?.title ?? '',
      body: fields?.body ?? '',
      titleOnly: false,
    });
  }
  return cards;
}

export function patchFromCards(cards: SocialDraftCard[]) {
  const patch: {
    titleEnglish?: string;
    titleChina?: string;
    title?: string;
    english: Record<string, { title?: string; body?: string }>;
    china: Record<string, { title?: string; body?: string }>;
  } = {
    english: {},
    china: {},
  };
  for (const card of cards) {
    if (card.group === 'headline') {
      if (card.platform === 'EN') {
        patch.titleEnglish = card.title;
        patch.title = card.title;
      }
      if (card.platform === 'ZH') {
        patch.titleChina = card.title;
      }
      continue;
    }
    patch[card.group][card.platform] = {
      title: card.title,
      body: card.body,
    };
  }
  return patch;
}
