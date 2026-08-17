import type { ScriptCoverSlot, ScriptCoversResponse } from '../types';

const SLOT_ORDER: ScriptCoverSlot[] = [
  'portrait-en',
  'portrait-zh',
  'landscape-en',
  'landscape-zh',
];

const SLOT_LABELS: Record<ScriptCoverSlot, string> = {
  'portrait-en': 'Portrait · English',
  'portrait-zh': 'Portrait · 中文',
  'landscape-en': 'Landscape · English',
  'landscape-zh': 'Landscape · 中文',
};

export function emptyScriptCoversResponse(scriptId: string): ScriptCoversResponse {
  return {
    scriptId,
    folder: `${scriptId}/covers`,
    slots: SLOT_ORDER.map((slot) => ({
      slot,
      fileName: `${slot}.jpg`,
      label: SLOT_LABELS[slot],
      exists: false,
      updatedAt: null,
      url: `/api/scripts/${encodeURIComponent(scriptId)}/covers/${encodeURIComponent(slot)}/file`,
    })),
  };
}
