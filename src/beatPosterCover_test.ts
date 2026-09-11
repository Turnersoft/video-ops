import {
  beatPosterAlbumPageCount,
  beatPosterAlbumPageNumber,
  beatPosterPageLabel,
  formatBeatPosterPageLabel,
} from './beatPosterCover.ts';

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

Deno.test('album page numbers count the cover as page 1', () => {
  assertEquals(beatPosterAlbumPageCount(10), 11);
  assertEquals(beatPosterAlbumPageNumber('cover'), 1);
  assertEquals(beatPosterAlbumPageNumber('beat', 0), 2);
  assertEquals(beatPosterAlbumPageNumber('beat', 2), 4);
  assertEquals(beatPosterPageLabel({ kind: 'cover', beatCount: 10 }), '1 / 11');
  assertEquals(beatPosterPageLabel({ kind: 'beat', beatIndex: 2, beatCount: 10 }), '4 / 11');
  assertEquals(formatBeatPosterPageLabel(1, 1), '1 / 1');
});
