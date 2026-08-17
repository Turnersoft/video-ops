const SENTENCE_SPLIT = /(?<=[.!?。！？])\s+/;

const EN_ZH_HINTS: Array<{ en: RegExp; zh: RegExp; weight: number }> = [
  { en: /welcome back/i, zh: /欢迎回来/, weight: 4 },
  { en: /formalize set equality|set equality/i, zh: /集合.*相同|集合相等|两个集合/, weight: 4 },
  { en: /textbook|mutual subset/i, zh: /课本|互相包含/, weight: 4 },
  { en: /typeclass|kernel|mathlib|prelude/i, zh: /typeclass|kernel|mathlib|prelude|命题/, weight: 3 },
  { en: /inductive|refl/i, zh: /inductive|refl|构造子/, weight: 3 },
  { en: /notation|init\/notation/i, zh: /notation|init/, weight: 3 },
  { en: /turn-lang|seteq|opposite path/i, zh: /turn-lang|seteq|相反|取名/, weight: 3 },
  { en: /funext|function rule/i, zh: /函数|funext/, weight: 3 },
  { en: /isomorph|group structure/i, zh: /同构|群/, weight: 3 },
  { en: /empty set|next episode/i, zh: /空集|下一期/, weight: 3 },
  { en: /nat\.add|zero_add|zero add/i, zh: /nat\.add|zero_add|加法/, weight: 3 },
  { en: /lean.*1 = 1|example.*rfl/i, zh: /1 = 1|example|rfl|命题/, weight: 2 },
  { en: /digest mathematics|formalize it/i, zh: /形式化|消化/, weight: 1 },
];

export function splitSayZh(sayZh: string | undefined): string[] {
  if (!sayZh?.trim()) {
    return [];
  }
  return sayZh
    .split(/(?<=[。！？.!?])\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Split teleprompter / beat say text into guide sentences (newlines + punctuation). */
export function guideSentencesFromText(text: string): string[] {
  const lines = String(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sentences: string[] = [];
  for (const line of lines) {
    const parts = line
      .split(SENTENCE_SPLIT)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length) {
      sentences.push(...parts);
    } else {
      sentences.push(line);
    }
  }
  return sentences.filter((sentence) => sentence.length > 0);
}

function normalizeCaptionText(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .trim();
}

function scoreEnZhPair(enGuide: string, zhPart: string): number {
  let score = 0;
  for (const hint of EN_ZH_HINTS) {
    if (hint.en.test(enGuide) && hint.zh.test(zhPart)) {
      score = Math.max(score, hint.weight);
    }
  }
  return score;
}

function matchSegmentToGuideIndex(segmentText: string, guides: string[]): number {
  const norm = normalizeCaptionText(segmentText);
  if (!norm || !guides.length) {
    return -1;
  }

  for (let index = 0; index < guides.length; index += 1) {
    const guideNorm = normalizeCaptionText(guides[index] ?? '');
    if (!guideNorm) {
      continue;
    }
    if (norm === guideNorm || guideNorm.includes(norm) || norm.includes(guideNorm)) {
      return index;
    }
  }

  let bestIndex = -1;
  let bestScore = 0;
  const words = norm.split(' ').filter((word) => word.length > 2);
  for (let index = 0; index < guides.length; index += 1) {
    const guideNorm = normalizeCaptionText(guides[index] ?? '');
    const matched = words.filter((word) => guideNorm.includes(word)).length;
    const score = matched / Math.max(1, words.length);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return bestScore >= 0.4 ? bestIndex : -1;
}

/** Map each English guide sentence index to the best matching Chinese part index. */
function buildEnToZhIndex(enGuides: string[], zhParts: string[]): Map<number, number> {
  const enToZh = new Map<number, number>();
  if (!enGuides.length || !zhParts.length) {
    return enToZh;
  }
  if (enGuides.length === zhParts.length) {
    enGuides.forEach((_guide, index) => enToZh.set(index, index));
    return enToZh;
  }

  let lastEn = 0;
  for (let zhIndex = 0; zhIndex < zhParts.length; zhIndex += 1) {
    const zhPart = zhParts[zhIndex] ?? '';
    let bestEn = lastEn;
    let bestScore = -1;
    const searchSpan = Math.max(4, Math.ceil(enGuides.length / zhParts.length) + 2);
    const searchEnd = Math.min(enGuides.length, lastEn + searchSpan);
    for (let enIndex = lastEn; enIndex < searchEnd; enIndex += 1) {
      const score = scoreEnZhPair(enGuides[enIndex] ?? '', zhPart);
      if (score > bestScore) {
        bestScore = score;
        bestEn = enIndex;
      }
    }
    if (bestScore <= 0) {
      bestEn = Math.min(
        enGuides.length - 1,
        Math.round((zhIndex / Math.max(1, zhParts.length - 1)) * (enGuides.length - 1)),
      );
      bestEn = Math.max(lastEn, bestEn);
    }
    enToZh.set(bestEn, zhIndex);
    lastEn = bestEn + 1;
  }
  return enToZh;
}

/** Pick Chinese caption text aligned to the English caption segment via beat script guides. */
export function zhForCaptionSegment(
  beatSay: string | undefined,
  sayZh: string | undefined,
  segmentText: string,
): string {
  if (!sayZh?.trim()) {
    return '';
  }
  const enGuides = guideSentencesFromText(beatSay ?? '');
  const zhParts = splitSayZh(sayZh);
  if (!zhParts.length) {
    return '';
  }
  if (!enGuides.length) {
    return sayZh;
  }

  const enIndex = matchSegmentToGuideIndex(segmentText, enGuides);
  if (enIndex < 0) {
    return '';
  }

  if (enGuides.length === zhParts.length) {
    return zhParts[enIndex] ?? '';
  }

  const enToZh = buildEnToZhIndex(enGuides, zhParts);
  const direct = enToZh.get(enIndex);
  if (direct !== undefined) {
    return zhParts[direct] ?? '';
  }
  return '';
}

/** @deprecated Prefer zhForCaptionSegment — index-based mapping misaligns when ASR splits beats. */
export function zhForSegment(
  sayZh: string,
  segmentIndexInBeat: number,
  segmentsInBeat: number,
): string {
  const parts = splitSayZh(sayZh);
  if (parts.length === segmentsInBeat) {
    return parts[segmentIndexInBeat] ?? '';
  }
  if (parts.length === 1) {
    return segmentIndexInBeat === 0 ? parts[0] : '';
  }
  if (segmentsInBeat <= 1) {
    return sayZh;
  }
  const chunk = Math.ceil(sayZh.length / segmentsInBeat);
  return sayZh.slice(segmentIndexInBeat * chunk, (segmentIndexInBeat + 1) * chunk).trim();
}
