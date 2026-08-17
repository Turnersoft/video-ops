import type { SocialPosts } from '../types';

export type SocialPreviewCard = {
  group: 'headline' | 'english' | 'china';
  platform: string;
  title: string;
  body: string;
  titleOnly: boolean;
};

export function cardsFromSocialPosts(social: SocialPosts): SocialPreviewCard[] {
  const cards: SocialPreviewCard[] = [
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
