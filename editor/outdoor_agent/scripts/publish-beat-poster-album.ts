import { publishBeatPosterAlbum } from '../src/beat-posters/publish.ts';
import { applyPublishCredentials } from '../src/publish-credentials.ts';

const scriptId = Deno.args[0] ?? '04-set-equality';
const platform = Deno.args[1] ?? 'xiaohongshu';
const lang = Deno.args[2] === 'en' ? 'en' : 'zh';

applyPublishCredentials();
const outcome = await publishBeatPosterAlbum({ scriptId, platform, lang });
console.log(JSON.stringify(outcome, null, 2));
