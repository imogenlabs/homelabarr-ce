import { describe, it, expect, afterEach } from 'vitest';
import { allowPlainHttp, useSecureCookies } from './transport-security.js';

const saved = { NODE_ENV: process.env.NODE_ENV, ALLOW_PLAIN_HTTP: process.env.ALLOW_PLAIN_HTTP };

afterEach(() => {
  process.env.NODE_ENV = saved.NODE_ENV;
  if (saved.ALLOW_PLAIN_HTTP === undefined) delete process.env.ALLOW_PLAIN_HTTP;
  else process.env.ALLOW_PLAIN_HTTP = saved.ALLOW_PLAIN_HTTP;
});

describe('transport security switches (#622)', () => {
  it('uses Secure cookies in production by default', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_PLAIN_HTTP;
    expect(allowPlainHttp()).toBe(false);
    expect(useSecureCookies()).toBe(true);
  });

  it('drops Secure only for the exact value "true"', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_PLAIN_HTTP = 'true';
    expect(useSecureCookies()).toBe(false);
    for (const v of ['1', 'yes', 'TRUE', 'false', '']) {
      process.env.ALLOW_PLAIN_HTTP = v;
      expect(useSecureCookies()).toBe(true);
    }
  });

  it('never uses Secure cookies outside production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ALLOW_PLAIN_HTTP;
    expect(useSecureCookies()).toBe(false);
  });
});
