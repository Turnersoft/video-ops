import {
  buildMassPublishBoard,
  filterDispatchableItems,
  formatMassPublishFailure,
  isOpenablePublishUrl,
  massPublishCaption,
  massPublishItemId,
  massPublishProvider,
  parseMassPublishItemId,
  pickActivePublishRecord,
  statusFromRecord,
  type MassPublishEpisodeInput,
  type MassPublishItem,
} from './massPublish.ts';

function assertEquals<T>(actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

function episode(partial: Partial<MassPublishEpisodeInput> & Pick<
  MassPublishEpisodeInput,
  'scriptId' | 'episodeTitle'
>): MassPublishEpisodeInput {
  return {
    seriesId: 'abstract_algebra_in_proof_assistant',
    seriesTitle: 'Abstract algebra',
    coverUrl: null,
    infographic: {
      zh: { ready: true, blockers: [] },
      en: { ready: true, blockers: [] },
    },
    video: {
      zh: { ready: false, blockers: ['No composite video on any take'] },
      en: { ready: false, blockers: ['No composite video on any take'] },
    },
    jobId: null,
    takeId: null,
    infographicRecords: [],
    videoRecords: [],
    ...partial,
  };
}

function item(partial: Partial<MassPublishItem> & Pick<MassPublishItem, 'id' | 'scriptId'>): MassPublishItem {
  return {
    seriesId: 'abstract_algebra_in_proof_assistant',
    seriesTitle: 'Abstract algebra',
    episodeIndex: 1,
    episodeTitle: 'Set',
    kind: 'infographic',
    lang: 'zh',
    platform: 'xiaohongshu',
    title: 'Set',
    captionTitle: 'Set',
    captionBody: '',
    ready: true,
    blockers: [],
    provider: 'sau',
    publishMode: 'auto',
    status: 'pending',
    canDispatch: true,
    publishedAt: null,
    url: null,
    openUrl: null,
    postId: null,
    stub: false,
    jobId: null,
    takeId: null,
    coverUrl: null,
    ...partial,
  };
}

Deno.test('parses mass-publish item ids', () => {
  const id = massPublishItemId({
    scriptId: '01-set',
    kind: 'infographic',
    lang: 'zh',
    platform: 'xiaohongshu',
  });
  assertEquals(id, '01-set::infographic::zh::xiaohongshu');
  assertEquals(parseMassPublishItemId(id), {
    scriptId: '01-set',
    kind: 'infographic',
    lang: 'zh',
    platform: 'xiaohongshu',
  });
  assertEquals(parseMassPublishItemId('bad'), null);
});

Deno.test('marks poster auto vs manual China lanes', () => {
  // 小红书 rejects automated uploads: albums queue as a browser handoff,
  // videos stay off the squat entirely.
  assertEquals(massPublishProvider('infographic', 'zh', 'xiaohongshu'), {
    provider: 'browser',
    publishMode: 'auto',
  });
  assertEquals(massPublishProvider('video', 'zh', 'xiaohongshu'), {
    provider: 'browser',
    publishMode: 'manual',
  });
  assertEquals(massPublishProvider('infographic', 'zh', 'bilibili'), {
    provider: 'sau',
    publishMode: 'auto',
  });
  assertEquals(massPublishProvider('infographic', 'zh', 'wechat_channels'), {
    provider: 'sau',
    publishMode: 'auto',
  });
  assertEquals(massPublishProvider('infographic', 'zh', 'weibo'), {
    provider: 'sau',
    publishMode: 'auto',
  });
  assertEquals(massPublishProvider('infographic', 'zh', 'wechat'), {
    provider: 'manual',
    publishMode: 'manual',
  });
  assertEquals(massPublishProvider('video', 'zh', 'wechat'), {
    provider: 'manual',
    publishMode: 'manual',
  });
  assertEquals(massPublishProvider('video', 'zh', 'weibo'), {
    provider: 'manual',
    publishMode: 'manual',
  });
  assertEquals(massPublishProvider('video', 'en', 'youtube'), {
    provider: 'postiz',
    publishMode: 'auto',
  });
});

Deno.test('published live record wins over later failed attempt', () => {
  const record = pickActivePublishRecord(
    [
      { platform: 'xiaohongshu', lang: 'zh', status: 'live', publishedAt: '2026-01-01' },
      { platform: 'xiaohongshu', lang: 'zh', status: 'failed', publishedAt: '2026-02-01' },
    ],
    'xiaohongshu',
    'zh',
  );
  assertEquals(record?.status, 'live');
  assertEquals(statusFromRecord(true, record), 'published');
  assertEquals(statusFromRecord(false, null), 'blocked');
  assertEquals(
    statusFromRecord(true, { platform: 'xiaohongshu', status: 'failed' }),
    'failed',
  );
});

Deno.test('board keeps poster and video in the same episode folder', () => {
  const board = buildMassPublishBoard({
    seriesId: 'abstract_algebra_in_proof_assistant',
    lang: 'zh',
    generatedAt: '2026-08-17T00:00:00.000Z',
    episodes: [
      episode({
        scriptId: '02-subset',
        episodeTitle: 'Subset',
        infographicRecords: [
          { platform: 'xiaohongshu', lang: 'zh', status: 'live', url: 'https://xhs.example/2' },
        ],
      }),
      episode({
        scriptId: '01-set',
        episodeTitle: 'Set',
        video: {
          zh: { ready: true, blockers: [] },
          en: { ready: true, blockers: [] },
        },
        jobId: 'job-take-1',
        takeId: 'take-1',
      }),
    ],
  });

  assertEquals(board.episodes.map((row) => row.scriptId), ['01-set', '02-subset']);
  const poster = board.items.find((entry) =>
    entry.id === '01-set::infographic::zh::xiaohongshu',
  );
  const video = board.items.find((entry) =>
    entry.id === '01-set::video::zh::xiaohongshu',
  );
  const published = board.items.find((entry) =>
    entry.id === '02-subset::infographic::zh::xiaohongshu',
  );
  const bilibili = board.items.find((entry) =>
    entry.id === '01-set::infographic::zh::bilibili',
  );
  const weibo = board.items.find((entry) =>
    entry.id === '01-set::infographic::zh::weibo',
  );
  assertEquals(poster?.canDispatch, true);
  assertEquals(poster?.status, 'pending');
  assertEquals(video?.canDispatch, false);
  assertEquals(video?.publishMode, 'manual');
  assertEquals(video?.jobId, 'job-take-1');
  assertEquals(published?.status, 'published');
  assertEquals(published?.canDispatch, true);
  assertEquals(published?.openUrl, 'https://xhs.example/2');
  assertEquals(bilibili?.canDispatch, true);
  assertEquals(bilibili?.publishMode, 'auto');
  assertEquals(weibo?.canDispatch, true);
  assertEquals(weibo?.publishMode, 'auto');
  assertEquals(board.summary.published, 1);
});

Deno.test('dispatch squat keeps click order and drops blocked cells', () => {
  const items = [
    item({
      id: '02-subset::infographic::zh::douyin',
      scriptId: '02-subset',
      episodeIndex: 2,
      platform: 'douyin',
    }),
    item({
      id: '01-set::video::zh::xiaohongshu',
      scriptId: '01-set',
      kind: 'video',
      platform: 'xiaohongshu',
    }),
    item({
      id: '01-set::infographic::zh::xiaohongshu',
      scriptId: '01-set',
      canDispatch: false,
      status: 'blocked',
    }),
    item({
      id: '01-set::infographic::zh::douyin',
      scriptId: '01-set',
      platform: 'douyin',
    }),
  ];
  const queued = filterDispatchableItems(items, items.map((entry) => entry.id));
  assertEquals(
    queued.map((entry) => entry.id),
    [
      '02-subset::infographic::zh::douyin',
      '01-set::video::zh::xiaohongshu',
      '01-set::infographic::zh::douyin',
    ],
  );
});

Deno.test('squat order follows the ids the user clicked', () => {
  const items = [
    item({
      id: '01-set::infographic::zh::bilibili',
      scriptId: '01-set',
      platform: 'bilibili',
    }),
    item({
      id: '01-set::infographic::zh::xiaohongshu',
      scriptId: '01-set',
      platform: 'xiaohongshu',
    }),
    item({
      id: '01-set::infographic::zh::weibo',
      scriptId: '01-set',
      platform: 'weibo',
    }),
  ];
  const queued = filterDispatchableItems(
    items,
    [
      '01-set::infographic::zh::weibo',
      '01-set::infographic::zh::xiaohongshu',
      '01-set::infographic::zh::bilibili',
    ],
  );
  assertEquals(
    queued.map((entry) => entry.platform),
    ['weibo', 'xiaohongshu', 'bilibili'],
  );
});

Deno.test('formats sau upload failures without dumping the command line', () => {
  const bili = formatMassPublishFailure(
    'sau bilibili upload-video --account default --file album-zh.mp4 --title x failed: Error: \u001b[1mUnknown Error\u001b[22m\n╰─▶ invalid peer certificate: Other(OtherError("*.bilivideo.com certificate is expired: -67818"))\n',
  );
  assertEquals(bili.message, 'bilibili video failed: CDN certificate expired');
  assertEquals(bili.detail.includes('\u001b'), false);

  const douyin = formatMassPublishFailure(
    'sau douyin upload-note --account default --title t failed: Locator.wait_for: Timeout 120000ms exceeded.\nCall log:\n  - waiting for locator("input[placeholder*=\\"填写作品标题\\"]").first to be visible\n',
  );
  assertEquals(douyin.message, 'douyin note timed out waiting for the title field');
});

Deno.test('keeps poster and video captions separate and rejects fake live URLs', () => {
  assertEquals(isOpenablePublishUrl('https://example.invalid/xiaohongshu/sau-note'), false);
  assertEquals(isOpenablePublishUrl('http://localhost:4007/posts/abc'), false);
  assertEquals(isOpenablePublishUrl('https://www.xiaohongshu.com/explore/1'), true);
  assertEquals(
    massPublishCaption(
      {
        china: {
          xiaohongshu: { title: '视频标题', body: '视频正文' },
        },
        infographic: {
          china: {
            xiaohongshu: { title: '图文标题', body: '图文正文' },
          },
        },
      },
      'infographic',
      'zh',
      'xiaohongshu',
      'Set',
    ),
    { title: '图文标题', body: '图文正文' },
  );
  assertEquals(
    massPublishCaption(
      {
        china: {
          xiaohongshu: { title: '视频标题', body: '视频正文' },
        },
      },
      'video',
      'zh',
      'xiaohongshu',
      'Set',
    ),
    { title: '视频标题', body: '视频正文' },
  );

  const board = buildMassPublishBoard({
    seriesId: 'abstract_algebra_in_proof_assistant',
    lang: 'zh',
    generatedAt: '2026-08-17T00:00:00.000Z',
    episodes: [
      episode({
        scriptId: '01-set',
        episodeTitle: 'Set',
        infographicRecords: [
          {
            platform: 'xiaohongshu',
            lang: 'zh',
            status: 'live',
            url: 'https://example.invalid/xiaohongshu/sau-note',
          },
        ],
        social: {
          china: {
            xiaohongshu: { title: '视频标题', body: '视频正文' },
          },
          infographic: {
            china: {
              xiaohongshu: { title: '图文标题', body: '图文正文' },
            },
          },
        },
      }),
    ],
  });
  const poster = board.items.find((entry) =>
    entry.id === '01-set::infographic::zh::xiaohongshu',
  );
  const video = board.items.find((entry) =>
    entry.id === '01-set::video::zh::xiaohongshu',
  );
  assertEquals(poster?.captionTitle, '图文标题');
  assertEquals(poster?.captionBody, '图文正文');
  assertEquals(poster?.openUrl, null);
  assertEquals(poster?.canDispatch, true);
  assertEquals(video?.captionTitle, '视频标题');
  assertEquals(video?.captionBody, '视频正文');
});
