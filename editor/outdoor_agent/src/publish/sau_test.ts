import { extractSauPublishedUrl, parseSauCheckOutput } from './sau.ts';

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

Deno.test('parseSauCheckOutput reads the account after valid', () => {
  const result = parseSauCheckOutput('valid TurnerZ(Turn-Lang 创始人）\n');
  assertEquals(result.valid, true);
  assertEquals(result.accountName, 'TurnerZ(Turn-Lang 创始人）');
});

Deno.test('parseSauCheckOutput ignores log lines before the result', () => {
  const result = parseSauCheckOutput('cookie 有效\nvalid Turn-Lang编程语言官方');
  assertEquals(result.valid, true);
  assertEquals(result.accountName, 'Turn-Lang编程语言官方');
});

Deno.test('parseSauCheckOutput treats invalid as logged out', () => {
  const result = parseSauCheckOutput('invalid');
  assertEquals(result.valid, false);
  assertEquals(result.accountName, null);
});

Deno.test('extractSauPublishedUrl strips ANSI reset from weibo links', () => {
  const url = extractSauPublishedUrl(
    'weibo published https://weibo.com/7931125666/RdOKdz4Jn\u001b[0m\n',
  );
  assertEquals(url, 'https://weibo.com/7931125666/RdOKdz4Jn');
});
