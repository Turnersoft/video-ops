import type { StyleKit } from '../../types';
import { colors } from '../../theme';

export type KitChrome = {
  label: string;
  accent: string;
  accentSoft: string;
  overviewTitle: string;
  overviewHint: string;
  stripLayout: 'filmstrip' | 'board' | 'dual-rail' | 'stack';
};

export const KIT_CHROME: Record<StyleKit, KitChrome> = {
  compare: {
    label: 'Compare',
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.14)',
    overviewTitle: 'Lean ↔ Turn storyboard',
    overviewHint: 'Each card is a dual-panel beat — scan both sides before Remotion.',
    stripLayout: 'dual-rail',
  },
  'motion-essay': {
    label: 'Motion essay',
    accent: '#a78bfa',
    accentSoft: 'rgba(167, 139, 250, 0.16)',
    overviewTitle: 'Motion essay board',
    overviewHint: 'Beat flow for discovery essays — terminal / board / receipt beats.',
    stripLayout: 'filmstrip',
  },
  pitfall: {
    label: 'Pitfall',
    accent: '#f87171',
    accentSoft: 'rgba(248, 113, 113, 0.14)',
    overviewTitle: 'Pitfall stamps',
    overviewHint: 'Anti-pattern beats — stamp the mistake, then the fix.',
    stripLayout: 'stack',
  },
  'ai-review': {
    label: 'AI review',
    accent: '#fb923c',
    accentSoft: 'rgba(251, 146, 60, 0.16)',
    overviewTitle: 'Keep / Reject reel',
    overviewHint: 'Editorial beats — news card → claim → verdict.',
    stripLayout: 'filmstrip',
  },
  'syntax-spot': {
    label: 'Syntax spot',
    accent: '#34d399',
    accentSoft: 'rgba(52, 211, 153, 0.14)',
    overviewTitle: 'Syntax spotlight',
    overviewHint: 'Short feature beats — one syntax idea per card.',
    stripLayout: 'filmstrip',
  },
  'launch-pv': {
    label: 'Launch PV',
    accent: '#fbbf24',
    accentSoft: 'rgba(251, 191, 36, 0.16)',
    overviewTitle: 'Trailer storyboard',
    overviewHint: 'Hero stills and UI reveals — read the cut before render.',
    stripLayout: 'filmstrip',
  },
  'life-essay': {
    label: 'Logic for life',
    accent: '#e879f9',
    accentSoft: 'rgba(232, 121, 249, 0.14)',
    overviewTitle: 'Still & meme board',
    overviewHint: 'Life essays — stills, quotes, and arrow claims.',
    stripLayout: 'board',
  },
};

export function kindAccent(kind: string, kitAccent: string): string {
  switch (kind) {
    case 'compare':
      return '#38bdf8';
    case 'meme':
      return '#f472b6';
    case 'quote':
      return '#c084fc';
    case 'hero':
      return '#fbbf24';
    case 'news':
      return '#fb923c';
    case 'reject':
      return '#f87171';
    case 'terminal':
      return '#a78bfa';
    case 'code':
      return '#34d399';
    case 'chapter':
      return '#f87171';
    case 'still':
      return '#e879f9';
    default:
      return kitAccent || colors.orange;
  }
}
