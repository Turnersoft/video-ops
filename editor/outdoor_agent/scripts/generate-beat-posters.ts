import { generateAllBeatPosters } from "../src/beat-posters/generate.ts";

const scriptId = Deno.args[0] ?? "04-set-equality";
const manifest = await generateAllBeatPosters(scriptId);
console.log(
  `Generated ${manifest.posters.length} posters for ${manifest.beatCount} beats (${scriptId})`,
);
