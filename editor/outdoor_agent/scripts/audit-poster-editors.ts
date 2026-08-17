import { beatPosterMdEntryFor, parseBeatPosterMd } from '../../../src/beatPosterMd.ts';
import { buildLiveScript } from '../src/live-script.ts';
import { buildBeatPosterSpec } from '../src/beat-posters/content.ts';
import { readBeatPosterMd } from '../src/beat-posters/poster-md.ts';

const scriptId = '04-set-equality';
const live = await buildLiveScript(scriptId)!;
const doc = parseBeatPosterMd(readBeatPosterMd(scriptId).markdown);

for (const beat of live!.beats) {
  const poster = beatPosterMdEntryFor(doc, beat.index);
  const en = buildBeatPosterSpec({
    scriptId,
    beat,
    nextBeat: live!.beats[beat.index + 1] ?? null,
    lang: 'en',
    seriesTitle: 'T',
    episodeTitleEn: '',
    episodeTitleZh: '',
    poster,
  });
  const bodyPreview = en.paragraphs.join(' | ').slice(0, 80);
  const codePreview = (en.turnCode || en.leanCode).split('\n').slice(0, 2).join(' / ');
  console.log(
    `beat ${String(beat.index + 1).padStart(2)} ${en.layout.primaryEditor.padEnd(4)} | ${bodyPreview}`,
  );
  console.log(`     code: ${codePreview}`);
}
