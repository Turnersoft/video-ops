import type { LiveBeat, StyleKit } from '../types';

export type BeatVisualKind =
  | 'compare'
  | 'hero'
  | 'still'
  | 'meme'
  | 'quote'
  | 'news'
  | 'terminal'
  | 'code'
  | 'chapter'
  | 'reject'
  | 'generic';

export function beatVisualKindLabel(kind: BeatVisualKind): string {
  switch (kind) {
    case 'compare':
      return 'LEAN · TURN';
    case 'hero':
      return 'HERO';
    case 'still':
      return 'STILL';
    case 'meme':
      return 'MEME';
    case 'quote':
      return 'QUOTE';
    case 'news':
      return 'NEWS';
    case 'reject':
      return 'KEEP/REJECT';
    case 'terminal':
      return 'TERMINAL';
    case 'code':
      return 'CODE';
    case 'chapter':
      return 'CHAPTER';
    default:
      return 'BEAT';
  }
}

export function classifyBeatVisual(beat: LiveBeat, styleKit: StyleKit): BeatVisualKind {
  const notes = `${beat.visualNotes} ${beat.title} ${beat.say}`.toLowerCase();
  const hasLean = Boolean(beat.leanCode?.trim());
  const hasTurn = Boolean(beat.turnCode?.trim());

  if (hasLean && hasTurn) {
    return 'compare';
  }
  if (notes.includes('meme')) {
    return 'meme';
  }
  if (notes.includes('quote') || notes.includes('“') || notes.includes('"')) {
    return 'quote';
  }
  if (notes.includes('news') || notes.includes('keep') || notes.includes('reject')) {
    return styleKit === 'ai-review' ? 'news' : 'reject';
  }
  if (notes.includes('terminal') || notes.includes('$ ')) {
    return 'terminal';
  }
  if (hasTurn || hasLean) {
    return 'code';
  }

  switch (styleKit) {
    case 'launch-pv':
      return 'hero';
    case 'life-essay':
      return notes.includes('still') ? 'still' : 'quote';
    case 'motion-essay':
      return 'terminal';
    case 'syntax-spot':
      return 'code';
    case 'pitfall':
      return 'chapter';
    case 'ai-review':
      return 'news';
    case 'compare':
      return hasLean || hasTurn ? 'compare' : 'generic';
    default: {
      const _exhaustive: never = styleKit;
      return _exhaustive;
    }
  }
}

export function beatPreviewLines(beat: LiveBeat): { primary: string; secondary: string } {
  const primary = beat.title?.trim() || `Beat ${beat.index + 1}`;
  const secondary =
    beat.say?.trim() ||
    beat.visualNotes?.trim().split(/\n/)[0] ||
    (beat.leanCode ? 'Lean beat' : beat.turnCode ? 'Turn beat' : 'Outline');
  return { primary, secondary };
}
