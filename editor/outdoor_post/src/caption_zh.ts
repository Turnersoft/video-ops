export function splitSayZh(sayZh: string | undefined): string[] {
  if (!sayZh?.trim()) {
    return [];
  }
  return sayZh
    .split(/(?<=[。！？.!?])\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function zhForSegment(sayZh: string, segmentIndexInBeat: number, segmentsInBeat: number): string {
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
