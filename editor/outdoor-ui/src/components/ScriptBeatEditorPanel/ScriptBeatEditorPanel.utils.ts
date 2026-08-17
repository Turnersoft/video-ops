import type { LiveBeat } from "../../types";
import type { DraftBeat } from "./ScriptBeatEditorPanel.types";

export function draftsFromLive(beats: LiveBeat[]): DraftBeat[] {
  return beats.map((beat) => ({
    title: beat.title,
    say: beat.say,
    chinese: beat.chinese,
    leanCode: beat.leanCode,
    turnCode: beat.turnCode,
    visualNotes: beat.visualNotes,
  }));
}

export function draftDiffersFromBeat(
  draft: DraftBeat,
  beat: LiveBeat,
): boolean {
  return (
    draft.title !== beat.title ||
    draft.say !== beat.say ||
    draft.chinese !== beat.chinese ||
    draft.leanCode !== beat.leanCode ||
    draft.turnCode !== beat.turnCode ||
    draft.visualNotes !== beat.visualNotes
  );
}
