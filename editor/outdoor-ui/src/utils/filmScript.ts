import type { LiveBeat, LiveScript, OutdoorScript, OutdoorScriptSlide } from '../types';

export function pickRecorderMime(): string {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return '';
  }
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

function parseNotes(notes: string): { lean: string; turn: string } {
  const leanMatch = notes.match(/Lean:\s*([\s\S]*?)(?:\n\nTurn:|$)/i);
  const turnMatch = notes.match(/Turn:\s*([\s\S]*?)$/i);
  return {
    lean: leanMatch?.[1]?.trim() ?? '',
    turn: turnMatch?.[1]?.trim() ?? '',
  };
}

function inferFocus(
  slide: OutdoorScriptSlide,
  panels: { lean: string; turn: string },
): 'lean' | 'turn' {
  if (/^as\s+before$/i.test(panels.turn) && !/^as\s+before$/i.test(panels.lean)) {
    return 'lean';
  }
  if (/^as\s+before$/i.test(panels.lean) && !/^as\s+before$/i.test(panels.turn)) {
    return 'turn';
  }
  if ((slide.title ?? '').trim().toLowerCase().startsWith('turn:')) {
    return 'turn';
  }
  return 'lean';
}

export function resolveFocusedSlideCode(
  slides: OutdoorScriptSlide[],
  index: number,
): { label: string; code: string } {
  const slide = slides[index];
  if (!slide) {
    return { label: 'Lean', code: '' };
  }
  const panels =
    slide.leanCode || slide.turnCode
      ? { lean: (slide.leanCode ?? '').trim(), turn: (slide.turnCode ?? '').trim() }
      : parseNotes(slide.notes ?? '');
  let focus: 'lean' | 'turn' =
    slide.codeFocus === 'turn' || slide.codeFocus === 'lean' ? slide.codeFocus : inferFocus(slide, panels);
  let code = focus === 'lean' ? panels.lean : panels.turn;
  let cursor = index;
  while (/^as\s+before$/i.test(code.trim()) && cursor > 0) {
    cursor -= 1;
    const prev = slides[cursor];
    const prevPanels =
      prev.leanCode || prev.turnCode
        ? { lean: (prev.leanCode ?? '').trim(), turn: (prev.turnCode ?? '').trim() }
        : parseNotes(prev.notes ?? '');
    code = focus === 'lean' ? prevPanels.lean : prevPanels.turn;
  }
  if (/^as\s+before$/i.test(code.trim())) {
    code = '';
  }
  return { label: focus === 'lean' ? 'Lean' : 'Turn-Lang', code };
}

export function beatsToSlides(beats: LiveBeat[]): OutdoorScriptSlide[] {
  return beats.map((beat) => ({
    id: beat.id,
    title: beat.title,
    body: beat.say,
    leanCode: beat.leanCode,
    turnCode: beat.turnCode,
    notes: beat.visualNotes,
    durationSeconds: beat.durationSeconds,
  }));
}

export function liveToFilmScript(live: LiveScript): OutdoorScript {
  const slides = live.slides?.length ? live.slides : beatsToSlides(live.beats);
  return {
    schemaVersion: 1,
    id: live.id,
    title: live.title,
    language: live.language,
    mode: live.mode === 'timed' ? 'timed' : 'manual',
    countdownSeconds: live.countdownSeconds,
    slides,
    source: live.source,
    updatedAt: live.updatedAt,
    beats: live.beats,
  };
}

export function videoExtensionForMime(mimeType: string): 'webm' | 'mp4' {
  return mimeType.includes('mp4') ? 'mp4' : 'webm';
}
