import {
  beatPosterMdCoverCopy,
  beatPosterMdEntryFor,
  parseBeatPosterMd,
} from './beatPosterMd.ts';

Deno.test('parses cover hook and beat copy from beat-posters.md', () => {
  const doc = parseBeatPosterMd(`# Posters

## Cover

### English

The empty set is not a tiny bag.

### Chinese

空集（empty set）不是很小的一袋子。

## Beat 1: Open the book

### English

The textbook writes a symbol.

### Chinese

课本写出一个符号。
`);
  if (beatPosterMdCoverCopy(doc, 'en') !== 'The empty set is not a tiny bag.') {
    throw new Error(`en cover: ${doc.cover.bodyEn}`);
  }
  if (beatPosterMdCoverCopy(doc, 'zh') !== '空集（empty set）不是很小的一袋子。') {
    throw new Error(`zh cover: ${doc.cover.bodyZh}`);
  }
  const beat = beatPosterMdEntryFor(doc, 0);
  if (beat?.bodyEn !== 'The textbook writes a symbol.') {
    throw new Error(`beat body: ${beat?.bodyEn}`);
  }
});
