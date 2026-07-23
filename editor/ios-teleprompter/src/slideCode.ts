import type { OutdoorScriptSlide } from './scriptSchema';

export type SlideCodePanels = {
  lean: string;
  turn: string;
};

export type SlideCodeFocus = 'lean' | 'turn';

export type FocusedSlideCode = {
  focus: SlideCodeFocus;
  label: string;
  code: string;
};

const AS_BEFORE = /^as\s+before$/i;

function parseNotesSections(notes: string): SlideCodePanels {
  const leanMatch = notes.match(/Lean:\s*([\s\S]*?)(?:\n\nTurn:|$)/i);
  const turnMatch = notes.match(/Turn:\s*([\s\S]*?)$/i);
  return {
    lean: leanMatch?.[1]?.trim() ?? '',
    turn: turnMatch?.[1]?.trim() ?? '',
  };
}

export function isAsBeforeCode(code: string): boolean {
  return AS_BEFORE.test(code.trim());
}

export function slideCodePanels(slide: OutdoorScriptSlide): SlideCodePanels {
  if (slide.leanCode || slide.turnCode) {
    return {
      lean: slide.leanCode?.trim() ?? '',
      turn: slide.turnCode?.trim() ?? '',
    };
  }
  if (!slide.notes?.trim()) {
    return { lean: '', turn: '' };
  }
  return parseNotesSections(slide.notes);
}

export function inferCodeFocus(slide: OutdoorScriptSlide): SlideCodeFocus {
  if (slide.codeFocus === 'lean' || slide.codeFocus === 'turn') {
    return slide.codeFocus;
  }

  const panels = slideCodePanels(slide);
  const turnAsBefore = isAsBeforeCode(panels.turn);
  const leanAsBefore = isAsBeforeCode(panels.lean);

  if (turnAsBefore && !leanAsBefore) {
    return 'lean';
  }
  if (leanAsBefore && !turnAsBefore) {
    return 'turn';
  }

  const title = slide.title?.trim().toLowerCase() ?? '';
  if (title.startsWith('turn:')) {
    return 'turn';
  }

  return 'lean';
}

function codeForFocus(panels: SlideCodePanels, focus: SlideCodeFocus): string {
  return focus === 'lean' ? panels.lean : panels.turn;
}

export function resolveFocusedSlideCode(
  slides: OutdoorScriptSlide[],
  index: number,
): FocusedSlideCode {
  const slide = slides[index];
  if (!slide) {
    return { focus: 'lean', label: 'Lean', code: '' };
  }

  const focus = inferCodeFocus(slide);
  const label = focus === 'lean' ? 'Lean' : 'Turn-Lang';
  let code = codeForFocus(slideCodePanels(slide), focus);

  let cursor = index;
  while (isAsBeforeCode(code) && cursor > 0) {
    cursor -= 1;
    code = codeForFocus(slideCodePanels(slides[cursor]), focus);
  }

  if (isAsBeforeCode(code)) {
    code = '';
  }

  return { focus, label, code };
}
