import leanLogoUrl from '../assets/brand/lean.svg?url';
import turnLogoUrl from '../assets/brand/turn-lang-logo.png?url';

export const BEAT_POSTER_LEAN_LOGO_URL = leanLogoUrl;
export const BEAT_POSTER_TURN_LOGO_URL = turnLogoUrl;

export function beatPosterBrandLogoUrl(dialect: 'lean' | 'turn'): string {
  return dialect === 'lean' ? BEAT_POSTER_LEAN_LOGO_URL : BEAT_POSTER_TURN_LOGO_URL;
}
