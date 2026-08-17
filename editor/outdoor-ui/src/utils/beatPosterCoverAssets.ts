import avatarUrl from '../assets/cover/avatar.png?url';
import seriesHeaderEnUrl from '../assets/cover/series-header-en.png?url';
import seriesHeaderZhUrl from '../assets/cover/series-header-zh.png?url';
import vsBadgeUrl from '../assets/cover/vs-badge.png?url';

import type { BeatPosterCoverLang } from '../../../../src/beatPosterCover';

export function beatPosterCoverSeriesHeaderUrl(lang: BeatPosterCoverLang): string {
  return lang === 'zh' ? seriesHeaderZhUrl : seriesHeaderEnUrl;
}

export const BEAT_POSTER_VS_BADGE_URL = vsBadgeUrl;
export const BEAT_POSTER_COVER_AVATAR_URL = avatarUrl;
