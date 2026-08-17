import {
  reconcileVoxcpmSentences,
  splitVoxcpmSentences,
  voxcpmVoiceMetadataFromSentences,
} from "./voxcpmScript.ts";
import {
  parseBeatVariantsBlock,
  patchBeatSectionVariants,
} from "./beatVariants.ts";

function assertEquals<T>(actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

Deno.test("splits formal-math narration without breaking identifiers or decimals", () => {
  const sentences = splitVoxcpmSentences(
    "Lean unfolds `Nat.add` at 3.14 seconds. `Eq.refl` closes the goal.\n\nBut Turn-Lang names the rule.",
  );
  assertEquals(
    sentences.map((sentence) => sentence.text),
    [
      "Lean unfolds `Nat.add` at 3.14 seconds.",
      "`Eq.refl` closes the goal.",
      "But Turn-Lang names the rule.",
    ],
  );
  assertEquals(sentences[1].pauseAfterMs, 420);
  assertEquals(sentences[2].pauseAfterMs, 0);
});

Deno.test("keeps sentence ids and colors stable while text is edited", () => {
  const initial = reconcileVoxcpmSentences(
    "First definition. Second result.",
    0,
  );
  initial[1].tone = "reveal";
  const metadata = voxcpmVoiceMetadataFromSentences(initial);
  const edited = reconcileVoxcpmSentences(
    "First definition. A stronger second result.",
    0,
    metadata,
  );
  assertEquals(edited[1].id, initial[1].id);
  assertEquals(edited[1].tone, "reveal");
});

Deno.test("stores voice colors in animation markdown without adding spoken words", () => {
  const sentences = reconcileVoxcpmSentences("A definition. A result.", 0);
  sentences[1].tone = "takeaway";
  const section = patchBeatSectionVariants(
    "## Beat 1: Test\n\nA definition. A result.\n\n### Visual notes\n\nKeep it simple.\n",
    0,
    {
      say: "A definition.\nA result.",
      voice: voxcpmVoiceMetadataFromSentences(sentences),
    },
  );
  const block = parseBeatVariantsBlock(section);
  assertEquals(block?.voice?.sentences[1].tone, "takeaway");
  if (!section.includes("\nA definition.\nA result.\n")) {
    throw new Error("Expected canonical sentence lines in rendered animation markdown");
  }
});
