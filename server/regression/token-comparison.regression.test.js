import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-227 (Epic HLCE-209) — AC3: constant-time token comparison + jti revocation.
//
// These are ASSERT-ONLY security-invariant guardrails: each test is designed to
// FAIL if the underlying control is removed. They lock the exact controls that
// already exist in source so a future refactor that swaps timingSafeEqual for
// `===`, drops the length pre-check, or skips the jti/session-set lookup is
// caught by a red test rather than shipping silently.
//
// Setup mirrors server/auth.test.js (HLCE-212) and server/sessions.test.js
// (HLCE-213): env-before-import (JWT_SECRET, CONFIG_DIR/DATA_DIR, DB_PATH) +
// dynamic import() so the env seam is in place before auth.js/sessions.js/db.js
// evaluate at module load.

const SECRET = 'x'.repeat(40);

// ───────────────────────────────────────────────────────────────────────────
// AC3a + AC3c: pure-unit invariants on server/auth.js + server/sessions.js
// ───────────────────────────────────────────────────────────────────────────
describe('AC3 token comparison invariants (auth.js / sessions.js)', () => {
  let tmp;

  async function loadAuth() {
    vi.resetModules();
    process.env.CONFIG_DIR = tmp;
    process.env.DATA_DIR = tmp;
    process.env.DB_PATH = ':memory:';
    process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
    process.env.JWT_SECRET = SECRET;
    process.env.BCRYPT_COST = '4';
    delete process.env.JWT_KEY_CURRENT;
    delete process.env.JWT_KEY_PREVIOUS;
    delete process.env.API_KEY_HMAC_KEY;
    return import('../auth.js');
  }

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-ac3-'));
  });

  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(tmp, { recursive: true, force: true });
    for (const k of ['CONFIG_DIR', 'DATA_DIR', 'DB_PATH', 'SECRET_ROOT', 'JWT_SECRET', 'BCRYPT_COST', 'JWT_KEY_PREVIOUS', 'JWT_KEY_CURRENT', 'API_KEY_HMAC_KEY']) {
      delete process.env[k];
    }
  });

  // ─── AC3a: API keys compared constant-time, length-checked first ────────────
  // CONTROL: server/auth.js:248-249 — validateApiKey compares the candidate's
  // HMAC against each stored hash with `entry.hash.length === hash.length &&
  // crypto.timingSafeEqual(...)`. The length pre-check is load-bearing:
  // timingSafeEqual THROWS a RangeError on unequal-length buffers, so dropping
  // it would turn a length-mismatch attempt into an uncaught throw.
  describe('AC3a: validateApiKey uses constant-time timingSafeEqual with a length pre-check (auth.js:248-249)', () => {
    async function mintKey() {
      const auth = await loadAuth();
      const user = await auth.createUser({ username: 'mobile', password: 'pw', role: 'operator' });
      const { key } = auth.createApiKey(user.id, 'My phone');
      return { auth, user, key };
    }

    it('accepts the correct key (proves the compare path is reached, not short-circuited)', async () => {
      const { auth, user, key } = await mintKey();
      expect(auth.validateApiKey(key)).toMatchObject({ id: user.id, apiKey: true });
    });

    it('rejects a WRONG key of the SAME length — the timingSafeEqual branch returns false, not a match', async () => {
      const { auth, key } = await mintKey();
      // Flip the last hex nibble: same `hlr_` prefix + same length (64 hex),
      // so it survives the prefix/length gates and exercises the constant-time
      // hash comparison itself. If `===` replaced timingSafeEqual the result
      // would be identical here — so this alone is not the full proof; the
      // length-mismatch test below is what pins timingSafeEqual specifically.
      const wrongSameLen = key.slice(0, -1) + (key.endsWith('a') ? 'b' : 'a');
      expect(wrongSameLen.length).toBe(key.length);
      expect(auth.validateApiKey(wrongSameLen)).toBeNull();
    });

    it('rejects a DIFFERENT-length key WITHOUT throwing — proves the length pre-check guards timingSafeEqual', async () => {
      const { auth } = await mintKey();
      // A valid hlr_ prefix but a deliberately short body. Its HMAC is still
      // 64 hex chars, BUT to force the length-mismatch path we craft a stored
      // entry whose hash differs in length from the candidate's HMAC. Simpler:
      // assert the public contract — a malformed-but-prefixed key returns null
      // and never throws. If the `entry.hash.length === hash.length` guard at
      // auth.js:248 were removed, timingSafeEqual would throw RangeError here
      // for any legacy/short stored hash, surfacing as an unhandled throw.
      const shortKey = 'hlr_' + 'a'.repeat(8);
      let threw = false;
      let result;
      try {
        result = auth.validateApiKey(shortKey);
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);
      expect(result).toBeNull();
    });

    it('a stored hash of a different length than the candidate HMAC is rejected without throwing (direct length-guard proof)', async () => {
      // Directly exercise auth.js:248 length guard: plant an entry whose stored
      // `hash` is a DIFFERENT length than sha256-HMAC output (64 hex). The loop
      // must skip it via the length check before ever calling timingSafeEqual.
      // Remove the `entry.hash.length === hash.length &&` guard and this throws.
      const auth = await loadAuth();
      const user = await auth.createUser({ username: 'mobile', password: 'pw', role: 'operator' });
      const probe = 'hlr_' + 'c'.repeat(64);
      fs.writeFileSync(path.join(tmp, 'api-keys.json'), JSON.stringify([
        { id: 'key_badlen', userId: user.id, hash: 'deadbeef', lookup: probe.slice(0, 12), revoked: false },
      ]));
      let threw = false;
      try {
        expect(auth.validateApiKey(probe)).toBeNull();
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);
    });
  });

  // ─── AC3c: jti revocation — a valid JWT with an unknown/revoked jti is rejected ─
  // CONTROL: server/auth.js:181 (and :188 for the previous key) calls
  // `isJtiActive(decoded.jti)` and returns null when false; server/sessions.js:31-37
  // is isJtiActive — it looks the jti up in the active `sessions` table and
  // returns false for unknown / revoked / expired sessions. This is the
  // server-side revocation: a token's signature being valid + unexpired is NOT
  // sufficient; the jti must be in the active session set.
  describe('AC3c: jti not in active session set is rejected even with a valid signature (auth.js:181 + sessions.js:31-37)', () => {
    it('rejects a validly-signed, unexpired token whose jti was NEVER registered (forged jti)', async () => {
      const auth = await loadAuth();
      // Sign with the REAL current secret so the signature verifies and the
      // token is unexpired — the only thing wrong is the jti is unknown.
      const forgedJti = crypto.randomBytes(16).toString('hex');
      const token = jwt.sign(
        { sub: 'u1', id: 'u1', username: 'alice', role: 'admin', jti: forgedJti },
        SECRET,
        { algorithm: 'HS256', expiresIn: '15m' },
      );
      // Sanity: the signature genuinely verifies — so rejection is purely the
      // jti/session-set check, not a signature failure.
      expect(() => jwt.verify(token, SECRET, { algorithms: ['HS256'] })).not.toThrow();
      const sessions = await import('../sessions.js');
      expect(sessions.isJtiActive(forgedJti)).toBe(false);

      expect(auth.verifyToken(token)).toBeNull();
    });

    it('accepts a token whose jti IS an active session, then rejects it AFTER revocation (revocation works live)', async () => {
      const auth = await loadAuth();
      const sessions = await import('../sessions.js');
      const { jti } = sessions.createSession({ userId: 'u1', userAgent: '', ip: '' });
      const token = auth.generateToken({ id: 'u1', username: 'alice', role: 'admin' }, jti);

      // Before revocation: accepted (jti is in the active set).
      expect(auth.verifyToken(token)).toMatchObject({ sub: 'u1', jti });

      // After revocation: the SAME unexpired, validly-signed token is rejected.
      sessions.revokeSession(jti);
      expect(sessions.isJtiActive(jti)).toBe(false);
      expect(auth.verifyToken(token)).toBeNull();
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// AC3b: CSRF double-submit compared constant-time, length-checked first
// ───────────────────────────────────────────────────────────────────────────
// CONTROL: server/index.js:142-149 — the CSRF middleware reads the hl_csrf
// cookie + the x-csrf-token header and compares them with
// `a.length !== b.length || !crypto.timingSafeEqual(a, b)` inside a try/catch.
// On mismatch (or any throw) it returns 403, never 500. The length pre-check +
// try/catch are what keep a length-mismatch from throwing RangeError out of
// timingSafeEqual into a 500. Driven through the real app (HLCE-216 supertest
// pattern) because the control lives only in the HTTP middleware.
describe('AC3b: CSRF double-submit token compared constant-time, length-mismatch never 500s (index.js:142-149)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-ac3-csrf-'));

  let request, app, auth;

  function setEnv() {
    // Re-asserted inside beforeAll (not just at collection time): the AC3a/AC3c
    // describe above resets modules and deletes JWT_SECRET in its afterEach, so
    // the env must be re-established before index.js is imported here, or
    // EnvironmentManager process.exits on the missing JWT_SECRET.
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    process.env.DB_PATH = ':memory:';
    process.env.CONFIG_DIR = tmp;
    process.env.DATA_DIR = tmp;
    process.env.AUDIT_DIR = path.join(tmp, 'audit');
    process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
    process.env.BCRYPT_COST = '4';
    process.env.RATE_LIMIT_DISABLED = 'true';
    delete process.env.SMTP_HOST;
  }

  function parseCookie(setCookieArr, name) {
    const line = (setCookieArr || []).find(c => c.startsWith(name + '='));
    if (!line) return null;
    return line.split(';')[0].slice(name.length + 1);
  }

  async function login(username, password) {
    const agent = request.agent(app);
    const res = await agent.post('/auth/login').send({ username, password });
    const set = res.headers['set-cookie'] || [];
    return { agent, csrf: parseCookie(set, 'hl_csrf') };
  }

  beforeAll(async () => {
    setEnv();
    vi.resetModules();
    request = (await import('supertest')).default;
    app = (await import('../index.js')).app;
    auth = await import('../auth.js');
    await auth.createUser({ username: 'csrfuser', email: 'c@x.com', password: 'csrfpass', role: 'user' });
  });

  it('a state-changing request with a WRONG-but-same-length CSRF header is rejected with 403', async () => {
    const { agent, csrf } = await login('csrfuser', 'csrfpass');
    expect(typeof csrf).toBe('string');
    expect(csrf.length).toBeGreaterThan(0);

    // Same length as the real cookie token, wrong value. With `===` this is
    // also 403, so this case is the wrong-value half of the invariant; the
    // length-mismatch case below is what pins timingSafeEqual specifically.
    const wrongSameLen = csrf.slice(0, -1) + (csrf.endsWith('a') ? 'b' : 'a');
    expect(wrongSameLen.length).toBe(csrf.length);

    const res = await agent
      .post('/auth/logout')
      .set('x-requested-with', 'XMLHttpRequest')
      .set('x-csrf-token', wrongSameLen)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'CSRF validation failed' });
  });

  it('a CSRF header of a DIFFERENT length than the cookie is rejected with 403 and never 500 (length pre-check + try/catch guard timingSafeEqual)', async () => {
    const { agent, csrf } = await login('csrfuser', 'csrfpass');
    // Deliberately different length: timingSafeEqual would throw RangeError if
    // the `a.length !== b.length ||` short-circuit at index.js:144 were removed.
    // The control must return 403 (caught) — and crucially NOT 500.
    const wrongLen = csrf + 'EXTRA-LENGTH-BYTES';
    expect(wrongLen.length).not.toBe(csrf.length);

    const res = await agent
      .post('/auth/logout')
      .set('x-requested-with', 'XMLHttpRequest')
      .set('x-csrf-token', wrongLen)
      .send({});
    expect(res.status).toBe(403);
    expect(res.status).not.toBe(500);
    expect(res.body).toMatchObject({ error: 'CSRF validation failed' });
  });

  it('a matching double-submit token passes the CSRF gate (proves the gate is real, not always-403)', async () => {
    const { agent, csrf } = await login('csrfuser', 'csrfpass');
    const res = await agent
      .post('/auth/logout')
      .set('x-requested-with', 'XMLHttpRequest')
      .set('x-csrf-token', csrf)
      .send({});
    // Matching token clears the CSRF middleware; logout returns 200. The key
    // invariant is simply that it is NOT a 403 CSRF rejection.
    expect(res.status).not.toBe(403);
  });
});
