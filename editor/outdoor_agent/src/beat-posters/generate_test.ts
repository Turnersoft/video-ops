import { scriptBeatPosterPngPath } from '../paths.ts';
import { isRetainedBeatPosterRootFile } from './generate.ts';

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

Deno.test('Generate infographics writes into english/ and chinese/', () => {
  assertEquals(
    scriptBeatPosterPngPath('05-empty-set', 'cover', 'en').endsWith(
      'beat-posters/english/cover.png',
    ),
    true,
  );
  assertEquals(
    scriptBeatPosterPngPath('05-empty-set', 'beat-01', 'zh').endsWith(
      'beat-posters/chinese/beat-01.png',
    ),
    true,
  );
  assertEquals(
    scriptBeatPosterPngPath('05-empty-set', 'cover', 'zh').includes('cover-zh.png'),
    false,
  );
});

Deno.test('Generate keeps publish-state and album videos at the album root', () => {
  assertEquals(isRetainedBeatPosterRootFile('publish-state.json'), true);
  assertEquals(isRetainedBeatPosterRootFile('album-zh.mp4'), true);
  assertEquals(isRetainedBeatPosterRootFile('album-en.mp4'), true);
  assertEquals(isRetainedBeatPosterRootFile('cover-en.png'), false);
  assertEquals(isRetainedBeatPosterRootFile('beat-01-zh.html'), false);
  assertEquals(isRetainedBeatPosterRootFile('manifest.json'), false);
});
