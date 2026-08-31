import { existingBeatPosterAlbumPngs } from './publish.ts';

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

Deno.test('existingBeatPosterAlbumPngs uses previewed 01-set zh PNGs', () => {
  const paths = existingBeatPosterAlbumPngs('01-set', 'zh');
  assertEquals(paths[0]?.endsWith('cover-zh.png') || paths[0]?.endsWith('chinese/cover.png'), true);
  assertEquals(
    paths[1]?.endsWith('beat-01-zh.png') || paths[1]?.endsWith('chinese/beat-01.png'),
    true,
  );
  assertEquals(paths.some((entry) => entry.endsWith('.html')), false);
  if (paths.length < 2) {
    throw new Error(`expected cover + beats, got ${paths.length}`);
  }
});

Deno.test('existingBeatPosterAlbumPngs reads 05-empty-set from chinese/', () => {
  const paths = existingBeatPosterAlbumPngs('05-empty-set', 'zh');
  assertEquals(paths[0]?.endsWith('chinese/cover.png'), true);
  assertEquals(paths[1]?.endsWith('chinese/beat-01.png'), true);
  assertEquals(paths.some((entry) => entry.endsWith('.html')), false);
});
