import { syncBeatPosterPreviewJpegs } from '../src/beat-posters/preview-jpeg.ts';

const scriptId = Deno.args[0] ?? '04-set-equality';
const result = await syncBeatPosterPreviewJpegs(scriptId);
console.log(JSON.stringify(result, null, 2));
