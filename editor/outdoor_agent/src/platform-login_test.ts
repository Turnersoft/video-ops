import { findNewestLoginQrcode, loginKindForPlatform } from './platform-login.ts';

function assertEquals(actual: string | null, expected: string): void {
  if (actual !== expected) {
    throw new Error(`expected ${expected}, got ${actual}`);
  }
}

Deno.test('picks the newest cookie-stem QR and ignores other pngs', () => {
  const dir = Deno.makeTempDirSync({ prefix: 'platform-login-qr-' });
  try {
    Deno.writeFileSync(`${dir}/readme.png`, new Uint8Array([1]));
    Deno.writeFileSync(`${dir}/tencent_default_login_qrcode_1.png`, new Uint8Array([2]));
    Deno.writeFileSync(`${dir}/tencent_default_login_qrcode_2.png`, new Uint8Array([3]));
    const older = Deno.statSync(`${dir}/tencent_default_login_qrcode_1.png`);
    Deno.utimeSync(
      `${dir}/tencent_default_login_qrcode_1.png`,
      older.atime ?? new Date(),
      new Date(Date.now() - 60_000),
    );
    assertEquals(
      findNewestLoginQrcode([dir], 'tencent_default'),
      `${dir}/tencent_default_login_qrcode_2.png`,
    );
  } finally {
    Deno.removeSync(dir, { recursive: true });
  }
});

Deno.test('微信公众号 is a portal login', () => {
  if (loginKindForPlatform('wechat') !== 'portal') {
    throw new Error(`expected portal, got ${loginKindForPlatform('wechat')}`);
  }
  if (loginKindForPlatform('xiaohongshu') !== 'qr') {
    throw new Error(`expected qr, got ${loginKindForPlatform('xiaohongshu')}`);
  }
});
