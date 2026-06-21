import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-212: auth core (JWT, bcrypt, API keys, login tickets, RBAC).
//
// HLCE-263 mutation pass: score 61.60% -> 80.61% (526 mutants; the largest of the
// five hardened modules). The residual survivors are EQUIVALENT or non-observable
// mutants, left documented rather than gamed:
//   - The `logger.error/warn/info('...message...')` argument string literals (e.g.
//     'Error loading users', 'Authentication error', 'legacy_bearer_seen', and the
//     `{ error: ... }` metadata objects): this suite asserts behaviour and return
//     values, not log text, and no code path branches on the message. Mutating the
//     wording is unobservable. (Asserting exact log strings would be brittle.)
//   - validatePassword's `user.password.match(/^\$2[aby]\$(\d+)\$/)?.[1]` optional
//     chaining and the bare-`^` regex variant (line 147): this only runs AFTER a
//     successful bcrypt.compare, which guarantees user.password is a valid bcrypt
//     hash, so .match() is never null and the `?.` short-circuit is never taken.
//   - The `userIndex !== -1` / `idx !== -1` guards in validatePassword and
//     changePassword (151/152/157/158/365): in normal flow the user located by
//     findUserById/findUserByUsername is always present in loadUsers(), so the
//     -1 branch is purely defensive. (The reachable -1 case in changePassword IS
//     killed by the "user vanishes between lookup and save" test.)
//   - requireAuth's legacy-Bearer warning branch (line 414): it only emits a
//     logger.warn and never alters req/res, so its condition mutants are
//     logging-only side effects.
//
// auth.js resolves its file paths (CONFIG_DIR/DATA_DIR), bcrypt cost
// (BCRYPT_COST) and JWT keys at import time, and imports sessions.js which
// opens DB_PATH. So every test resets modules and re-imports with env pointing
// at a throwaway tmp dir + an in-memory DB. Dynamic import() is required so the
// env is in place before the module evaluates it.
const SECRET = 'x'.repeat(40);
const PREV = 'p'.repeat(40);
const PREVIOUS_KEY_MAX_AGE_SEC = 24 * 60 * 60;

let tmp;

async function loadAuth({ cost = 4, previous } = {}) {
  vi.resetModules();
  process.env.CONFIG_DIR = tmp;
  process.env.DATA_DIR = tmp;
  process.env.DB_PATH = ':memory:';
  // Point at a non-existent dir so no real Docker secret leaks in.
  process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
  process.env.JWT_SECRET = SECRET;
  process.env.BCRYPT_COST = String(cost);
  delete process.env.JWT_KEY_CURRENT;
  delete process.env.API_KEY_HMAC_KEY;
  if (previous) process.env.JWT_KEY_PREVIOUS = previous;
  else delete process.env.JWT_KEY_PREVIOUS;
  return import('./auth.js');
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-auth-'));
});

afterEach(() => {
  vi.useRealTimers();
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const k of ['CONFIG_DIR', 'DATA_DIR', 'DB_PATH', 'SECRET_ROOT', 'JWT_SECRET', 'BCRYPT_COST', 'JWT_KEY_PREVIOUS', 'JWT_KEY_CURRENT', 'API_KEY_HMAC_KEY']) {
    delete process.env[k];
  }
});

describe('JWT verifyToken (AC1)', () => {
  it('round-trips a token signed with the current key (no jti => no revocation check)', async () => {
    const auth = await loadAuth();
    const token = auth.generateToken({ id: 'u1', username: 'alice', role: 'admin' });
    const decoded = auth.verifyToken(token);
    expect(decoded).toMatchObject({ sub: 'u1', id: 'u1', username: 'alice', role: 'admin' });
  });

  it('rejects a forged signature', async () => {
    const auth = await loadAuth();
    const token = auth.generateToken({ id: 'u1', username: 'alice', role: 'admin' });
    const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
    expect(auth.verifyToken(tampered)).toBeNull();
  });

  it('rejects alg-confusion: alg "none"', async () => {
    const auth = await loadAuth();
    const forged = jwt.sign({ sub: 'u1', role: 'admin' }, '', { algorithm: 'none' });
    expect(auth.verifyToken(forged)).toBeNull();
  });

  it('rejects alg-confusion: RS256-signed token when only HS256 is accepted', async () => {
    const auth = await loadAuth();
    const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const forged = jwt.sign({ sub: 'u1', role: 'admin' }, privateKey, { algorithm: 'RS256' });
    expect(auth.verifyToken(forged)).toBeNull();
  });

  it('rejects a token signed with a different HMAC algorithm (HS384)', async () => {
    const auth = await loadAuth();
    const forged = jwt.sign({ sub: 'u1', role: 'admin' }, SECRET, { algorithm: 'HS384' });
    expect(auth.verifyToken(forged)).toBeNull();
  });

  it('rejects an expired token (does not fall through to the previous key)', async () => {
    const auth = await loadAuth();
    const expired = jwt.sign({ sub: 'u1', role: 'admin' }, SECRET, { algorithm: 'HS256', expiresIn: '-10s' });
    expect(auth.verifyToken(expired)).toBeNull();
  });

  it('rejects a token whose jti is not an active session (revoked / unknown)', async () => {
    const auth = await loadAuth();
    const token = auth.generateToken({ id: 'u1', username: 'alice', role: 'admin' }, 'deadbeefdeadbeefdeadbeefdeadbeef');
    expect(auth.verifyToken(token)).toBeNull();
  });

  it('accepts a token whose jti is an active session, then rejects it after revocation', async () => {
    const auth = await loadAuth();
    const sessions = await import('./sessions.js');
    const { jti } = sessions.createSession({ userId: 'u1', userAgent: '', ip: '' });
    const token = auth.generateToken({ id: 'u1', username: 'alice', role: 'admin' }, jti);
    expect(auth.verifyToken(token)).toMatchObject({ sub: 'u1', jti });

    sessions.revokeSession(jti);
    expect(auth.verifyToken(token)).toBeNull();
  });
});

describe('JWT key rotation (AC1)', () => {
  it('accepts a previous-key token within the max-age window', async () => {
    const auth = await loadAuth({ previous: PREV });
    const token = jwt.sign({ sub: 'u1', role: 'admin' }, PREV, { algorithm: 'HS256', expiresIn: 3600 });
    expect(auth.verifyToken(token)).toMatchObject({ sub: 'u1' });
  });

  it('rejects a previous-key token older than the max-age window', async () => {
    const auth = await loadAuth({ previous: PREV });
    const nowSec = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      { sub: 'u1', role: 'admin', iat: nowSec - PREVIOUS_KEY_MAX_AGE_SEC - 100, exp: nowSec + 3600 },
      PREV,
      { algorithm: 'HS256' },
    );
    expect(auth.verifyToken(token)).toBeNull();
  });

  it('rejects a previous-key token when no previous key is configured', async () => {
    const auth = await loadAuth(); // no previous
    const token = jwt.sign({ sub: 'u1', role: 'admin' }, PREV, { algorithm: 'HS256', expiresIn: 3600 });
    expect(auth.verifyToken(token)).toBeNull();
  });

  // HLCE-273 AC4a: jti revocation must be enforced on the previous-key fallback
  // path too, not only the current-key path. Sign with PREV (so the current-key
  // verify throws JsonWebTokenError and the fallback runs), keep iat recent so
  // the max-age guard passes, then revoke the jti so isJtiActive is false.
  it('rejects a previous-key token within max-age whose jti has been revoked', async () => {
    const auth = await loadAuth({ previous: PREV });
    const sessions = await import('./sessions.js');
    const { jti } = sessions.createSession({ userId: 'u1', userAgent: '', ip: '' });

    const nowSec = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      { sub: 'u1', role: 'admin', jti, iat: nowSec - 60, exp: nowSec + 3600 },
      PREV,
      { algorithm: 'HS256' },
    );
    // Sanity: while the session is active, the previous-key path accepts it.
    expect(auth.verifyToken(token)).toMatchObject({ sub: 'u1', jti });

    // Revoking the jti makes isJtiActive(jti) false; the previous-key path must
    // now reject even though the signature is valid and the token is in-window.
    sessions.revokeSession(jti);
    expect(auth.verifyToken(token)).toBeNull();
  });
});

describe('validatePassword + bcrypt (AC2)', () => {
  it('returns the user without the password field on correct credentials', async () => {
    const auth = await loadAuth();
    await auth.createUser({ username: 'alice', password: 'correct horse', role: 'operator' });
    const result = await auth.validatePassword('alice', 'correct horse');
    expect(result).toMatchObject({ username: 'alice', role: 'operator' });
    expect(result).not.toHaveProperty('password');
  });

  it('returns null on a wrong password and on an unknown user', async () => {
    const auth = await loadAuth();
    await auth.createUser({ username: 'alice', password: 'correct horse' });
    expect(await auth.validatePassword('alice', 'wrong')).toBeNull();
    expect(await auth.validatePassword('nobody', 'whatever')).toBeNull();
  });

  it('never stores the plaintext password (stored value is a bcrypt hash)', async () => {
    const auth = await loadAuth();
    await auth.createUser({ username: 'alice', password: 'secretpw' });
    const stored = JSON.parse(fs.readFileSync(path.join(tmp, 'users.json'), 'utf8'));
    expect(stored[0].password).not.toBe('secretpw');
    expect(stored[0].password).toMatch(/^\$2[aby]\$/);
  });

  it('rehashes a sub-cost hash up to BCRYPT_COST on successful login', async () => {
    const auth = await loadAuth({ cost: 6 });
    // Seed a user whose password hash is cost 4 (below the configured cost 6).
    const weakHash = bcrypt.hashSync('hunter2', 4);
    expect(weakHash).toMatch(/^\$2[aby]\$04\$/);
    fs.writeFileSync(path.join(tmp, 'users.json'), JSON.stringify([
      { id: 'u1', username: 'bob', role: 'user', password: weakHash },
    ]));

    const result = await auth.validatePassword('bob', 'hunter2');
    expect(result).toMatchObject({ username: 'bob' });

    const stored = JSON.parse(fs.readFileSync(path.join(tmp, 'users.json'), 'utf8'));
    expect(stored[0].password).toMatch(/^\$2[aby]\$06\$/);
    // Still a valid hash of the same password.
    expect(bcrypt.compareSync('hunter2', stored[0].password)).toBe(true);
  });

  it('persists the lastLogin timestamp to the matching user row (HLCE-263)', async () => {
    // Pins the lastLogin update block: findIndex `!== -1` (158) + the write.
    const auth = await loadAuth();
    await auth.createUser({ username: 'll', password: 'pw' });
    expect(auth.findUserByUsername('ll').lastLogin).toBeNull();
    await auth.validatePassword('ll', 'pw');
    const ll = auth.findUserByUsername('ll').lastLogin;
    expect(ll).not.toBeNull();
    expect(() => new Date(ll).toISOString()).not.toThrow();
  });

  it('updates lastLogin on a successful validation', async () => {
    const auth = await loadAuth();
    await auth.createUser({ username: 'alice', password: 'pw' });
    await auth.validatePassword('alice', 'pw');
    const stored = JSON.parse(fs.readFileSync(path.join(tmp, 'users.json'), 'utf8'));
    expect(stored[0].lastLogin).toBeTruthy();
  });
});

describe('createUser (AC2)', () => {
  it('rejects a duplicate username', async () => {
    const auth = await loadAuth();
    await auth.createUser({ username: 'alice', password: 'pw' });
    await expect(auth.createUser({ username: 'alice', password: 'other' })).rejects.toThrow('Username already exists');
  });

  it('returns a safe user with a generated id and no password', async () => {
    const auth = await loadAuth();
    const user = await auth.createUser({ username: 'carol', password: 'pw', role: 'admin' });
    expect(user.id).toMatch(/^user_[0-9a-f]{24}$/);
    expect(user).not.toHaveProperty('password');
    expect(user.role).toBe('admin');
  });
});

describe('API keys (AC3)', () => {
  async function setupUserAndAuth() {
    const auth = await loadAuth();
    const user = await auth.createUser({ username: 'mobile', password: 'pw', role: 'operator' });
    return { auth, user };
  }

  it('mints an hlr_ key and stores only the HMAC hash (never the plaintext key)', async () => {
    const { auth, user } = await setupUserAndAuth();
    const { key, hash } = auth.createApiKey(user.id, 'My phone');
    expect(key).toMatch(/^hlr_[0-9a-f]{64}$/);

    const stored = JSON.parse(fs.readFileSync(path.join(tmp, 'api-keys.json'), 'utf8'));
    expect(stored[0].hash).toBe(hash);
    expect(stored[0]).not.toHaveProperty('key');
    expect(JSON.stringify(stored)).not.toContain(key);
  });

  it('validates a correct key and returns the owning user (apiKey:true)', async () => {
    const { auth, user } = await setupUserAndAuth();
    const { key } = auth.createApiKey(user.id, 'My phone');
    expect(auth.validateApiKey(key)).toMatchObject({ id: user.id, username: 'mobile', role: 'operator', apiKey: true });
  });

  it('rejects keys without the hlr_ prefix without touching storage', async () => {
    const { auth } = await setupUserAndAuth();
    expect(auth.validateApiKey('nope')).toBeNull();
    expect(auth.validateApiKey('')).toBeNull();
    expect(auth.validateApiKey(null)).toBeNull();
  });

  it('rejects a tampered key (HMAC mismatch)', async () => {
    const { auth, user } = await setupUserAndAuth();
    const { key } = auth.createApiKey(user.id, 'My phone');
    const tampered = key.slice(0, -1) + (key.endsWith('a') ? 'b' : 'a');
    expect(auth.validateApiKey(tampered)).toBeNull();
  });

  it('rejects a revoked key', async () => {
    const { auth, user } = await setupUserAndAuth();
    const minted = auth.createApiKey(user.id, 'My phone');
    expect(auth.revokeApiKey(minted.id, user.id)).toBe(true);
    expect(auth.validateApiKey(minted.key)).toBeNull();
  });

  it('returns null when the key is valid but its user no longer exists', async () => {
    const { auth } = await setupUserAndAuth();
    const orphan = auth.createApiKey('ghost-user', 'orphan');
    expect(auth.validateApiKey(orphan.key)).toBeNull();
  });

  it('migrates a legacy plaintext key to an HMAC hash on first validate', async () => {
    const { auth, user } = await setupUserAndAuth();
    const legacyKey = 'hlr_' + 'a'.repeat(64);
    fs.writeFileSync(path.join(tmp, 'api-keys.json'), JSON.stringify([
      { id: 'key_legacy', userId: user.id, key: legacyKey, revoked: false },
    ]));

    expect(auth.validateApiKey(legacyKey)).toMatchObject({ id: user.id, apiKey: true });
    const stored = JSON.parse(fs.readFileSync(path.join(tmp, 'api-keys.json'), 'utf8'));
    expect(stored[0]).not.toHaveProperty('key');
    expect(stored[0].hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns null when a legacy plaintext key matches but its user is gone (HLCE-263)', async () => {
    // Pins the `if (!user) return null` after a legacy-key match (line 268). The
    // key migrates (hash written) but resolves to no user.
    const { auth } = await setupUserAndAuth();
    const legacyKey = 'hlr_' + 'b'.repeat(64);
    fs.writeFileSync(path.join(tmp, 'api-keys.json'), JSON.stringify([
      { id: 'key_orphan', userId: 'vanished-user', key: legacyKey, revoked: false },
    ]));
    expect(auth.validateApiKey(legacyKey)).toBeNull();
    // It still migrated the storage (hash replaces the plaintext key).
    const stored = JSON.parse(fs.readFileSync(path.join(tmp, 'api-keys.json'), 'utf8'));
    expect(stored[0]).not.toHaveProperty('key');
  });

  // HLCE-273 AC4b: revokeApiKey is scoped to the owning user — it only matches
  // an entry where BOTH id and userId line up, returns false otherwise, and must
  // not flip `revoked` on a key it didn't own.
  it('revokeApiKey refuses a wrong owner and leaves the key unrevoked', async () => {
    const { auth } = await setupUserAndAuth();
    const entry = auth.createApiKey('userA', 'label');

    expect(auth.revokeApiKey(entry.id, 'userB')).toBe(false);

    const stored = JSON.parse(fs.readFileSync(path.join(tmp, 'api-keys.json'), 'utf8'));
    const persisted = stored.find(k => k.id === entry.id);
    expect(persisted.revoked).toBe(false);
  });

  it('revokeApiKey returns false for a non-existent key id', async () => {
    const { auth } = await setupUserAndAuth();
    expect(auth.revokeApiKey('key_doesnotexist', 'userA')).toBe(false);
  });

  it('revokeApiKey by the owner returns true and persists revoked:true', async () => {
    const { auth } = await setupUserAndAuth();
    const entry = auth.createApiKey('userA', 'label');

    expect(auth.revokeApiKey(entry.id, 'userA')).toBe(true);

    const stored = JSON.parse(fs.readFileSync(path.join(tmp, 'api-keys.json'), 'utf8'));
    const persisted = stored.find(k => k.id === entry.id);
    expect(persisted.revoked).toBe(true);
  });

  it('listApiKeys hides hash/key and exposes only a preview', async () => {
    const { auth, user } = await setupUserAndAuth();
    auth.createApiKey(user.id, 'My phone');
    const listed = auth.listApiKeys(user.id);
    expect(listed).toHaveLength(1);
    expect(listed[0]).not.toHaveProperty('hash');
    expect(listed[0]).not.toHaveProperty('key');
    expect(listed[0].keyPreview).toMatch(/^hlr_/);
  });

  // HLCE-274: a malformed store (a non-array JSON value, e.g. a stray `{}`) must
  // not propagate to listApiKeys().filter(...) and 500 the API-key endpoints —
  // loadApiKeys guards with Array.isArray and treats it as "no keys".
  it('treats a non-array api-keys store as empty instead of throwing', async () => {
    const { auth } = await setupUserAndAuth();
    fs.writeFileSync(path.join(tmp, 'api-keys.json'), '{}');
    expect(auth.loadApiKeys()).toEqual([]);
    expect(() => auth.listApiKeys('userA')).not.toThrow();
    expect(auth.listApiKeys('userA')).toEqual([]);
  });
});

describe('login tickets (AC4)', () => {
  it('issues a single-use ticket that resolves to the user id exactly once', async () => {
    const auth = await loadAuth();
    const ticket = auth.createLoginTicket('u1');
    expect(ticket).toMatch(/^[0-9a-f]{64}$/);
    expect(auth.consumeLoginTicket(ticket)).toBe('u1');
    // Single-use: a second consume yields nothing.
    expect(auth.consumeLoginTicket(ticket)).toBeNull();
  });

  it('expires a ticket after its TTL', async () => {
    vi.useFakeTimers();
    const auth = await loadAuth();
    const ticket = auth.createLoginTicket('u1');
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(auth.consumeLoginTicket(ticket)).toBeNull();
  });

  it('returns null for an unknown ticket', async () => {
    const auth = await loadAuth();
    expect(auth.consumeLoginTicket('does-not-exist')).toBeNull();
  });
});

describe('RBAC helpers (AC1 surface)', () => {
  it('hasRole respects the user < operator < admin hierarchy', async () => {
    const auth = await loadAuth();
    expect(auth.hasRole('admin', 'user')).toBe(true);
    expect(auth.hasRole('operator', 'operator')).toBe(true);
    expect(auth.hasRole('user', 'admin')).toBe(false);
    expect(auth.hasRole('bogus', 'user')).toBe(false);
  });

  it('requireRole 401s without a user, 403s when under-privileged, calls next when sufficient', async () => {
    const auth = await loadAuth();
    const mw = auth.requireRole('admin');

    const noUser = mockRes();
    mw({}, noUser, () => { throw new Error('next should not run'); });
    expect(noUser.statusCode).toBe(401);

    const under = mockRes();
    mw({ user: { role: 'user' } }, under, () => { throw new Error('next should not run'); });
    expect(under.statusCode).toBe(403);

    let called = false;
    mw({ user: { role: 'admin' } }, mockRes(), () => { called = true; });
    expect(called).toBe(true);
  });
});

describe('requireAuth / optionalAuth middleware', () => {
  it('401s when there is no token', async () => {
    const auth = await loadAuth();
    const res = mockRes();
    auth.requireAuth({ headers: {}, cookies: {} }, res, () => { throw new Error('next should not run'); });
    expect(res.statusCode).toBe(401);
  });

  it('passes a valid cookie JWT and sets req.user', async () => {
    const auth = await loadAuth();
    const token = auth.generateToken({ id: 'u1', username: 'alice', role: 'admin' });
    const req = { headers: {}, cookies: { hl_session: token } };
    let called = false;
    auth.requireAuth(req, mockRes(), () => { called = true; });
    expect(called).toBe(true);
    expect(req.user).toMatchObject({ sub: 'u1', role: 'admin' });
  });

  it('401s an invalid cookie JWT', async () => {
    const auth = await loadAuth();
    const res = mockRes();
    auth.requireAuth({ headers: {}, cookies: { hl_session: 'garbage.token.here' } }, res, () => { throw new Error('next should not run'); });
    expect(res.statusCode).toBe(401);
  });

  it('authenticates an API key via the Authorization: Bearer hlr_ header', async () => {
    const auth = await loadAuth();
    const user = await auth.createUser({ username: 'mobile', password: 'pw', role: 'operator' });
    const { key } = auth.createApiKey(user.id, 'phone');
    const req = { headers: { authorization: `Bearer ${key}` }, cookies: {} };
    let called = false;
    auth.requireAuth(req, mockRes(), () => { called = true; });
    expect(called).toBe(true);
    expect(req.user).toMatchObject({ id: user.id, apiKey: true });
  });

  it('401s an invalid API key', async () => {
    const auth = await loadAuth();
    const res = mockRes();
    auth.requireAuth({ headers: { authorization: 'Bearer hlr_deadbeef' }, cookies: {} }, res, () => { throw new Error('next should not run'); });
    expect(res.statusCode).toBe(401);
  });

  it('optionalAuth always calls next, setting req.user only when a valid token is present', async () => {
    const auth = await loadAuth();
    const token = auth.generateToken({ id: 'u1', username: 'alice', role: 'admin' });

    const anon = { headers: {}, cookies: {} };
    let anonNext = false;
    auth.optionalAuth(anon, mockRes(), () => { anonNext = true; });
    expect(anonNext).toBe(true);
    expect(anon.user).toBeUndefined();

    const authed = { headers: {}, cookies: { hl_session: token } };
    let authedNext = false;
    auth.optionalAuth(authed, mockRes(), () => { authedNext = true; });
    expect(authedNext).toBe(true);
    expect(authed.user).toMatchObject({ sub: 'u1' });
  });
});

describe('authenticate + changePassword', () => {
  it('authenticate returns a token, jti and refresh on valid credentials', async () => {
    const auth = await loadAuth();
    await auth.createUser({ username: 'alice', password: 'pw', role: 'admin' });
    const result = await auth.authenticate('alice', 'pw');
    expect(result.success).toBe(true);
    expect(result.user).toMatchObject({ username: 'alice' });
    expect(result.token).toBeTruthy();
    expect(result.jti).toMatch(/^[0-9a-f]{32}$/);
    expect(result.refresh).toBeTruthy();
    // The minted token verifies against its active session.
    expect(auth.verifyToken(result.token)).toMatchObject({ sub: result.user.id, jti: result.jti });
  });

  it('authenticate fails closed on a bad password', async () => {
    const auth = await loadAuth();
    await auth.createUser({ username: 'alice', password: 'pw' });
    const result = await auth.authenticate('alice', 'nope');
    expect(result).toMatchObject({ success: false });
    expect(result.token).toBeUndefined();
  });

  it('changePassword swaps the hash on the correct current password and rejects a wrong one', async () => {
    const auth = await loadAuth();
    const user = await auth.createUser({ username: 'alice', password: 'old-pw' });
    const before = JSON.parse(fs.readFileSync(path.join(tmp, 'users.json'), 'utf8'))[0].password;

    expect(await auth.changePassword(user.id, 'wrong', 'new-pw')).toMatchObject({ success: false });
    const ok = await auth.changePassword(user.id, 'old-pw', 'new-pw');
    expect(ok).toMatchObject({ success: true });

    const after = JSON.parse(fs.readFileSync(path.join(tmp, 'users.json'), 'utf8'))[0].password;
    expect(after).not.toBe(before);
    expect(await auth.validatePassword('alice', 'new-pw')).toMatchObject({ username: 'alice' });
  });

  it('changePassword reports an unknown user', async () => {
    const auth = await loadAuth();
    expect(await auth.changePassword('ghost', 'a', 'b')).toMatchObject({ success: false, error: 'User not found' });
  });
});

describe('initializeAuth + user loaders', () => {
  it('seeds a default admin when no users exist, and is idempotent', async () => {
    const auth = await loadAuth();
    await auth.initializeAuth();
    const first = auth.loadUsers();
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ username: 'admin', role: 'admin', mustChangePassword: true });

    await auth.initializeAuth();
    expect(auth.loadUsers()).toHaveLength(1);
  });

  it('loadUsers tolerates a non-array users.json by returning []', async () => {
    const auth = await loadAuth();
    fs.writeFileSync(path.join(tmp, 'users.json'), JSON.stringify({ not: 'an array' }));
    expect(auth.loadUsers()).toEqual([]);
  });

  it('findUserByUsername / findUserById locate seeded users', async () => {
    const auth = await loadAuth();
    const user = await auth.createUser({ username: 'alice', password: 'pw' });
    expect(auth.findUserByUsername('alice')).toMatchObject({ id: user.id });
    expect(auth.findUserById(user.id)).toMatchObject({ username: 'alice' });
    expect(auth.findUserByUsername('missing')).toBeUndefined();
  });
});

describe('password reset token storage', () => {
  it('saves, reads back, and clears a reset token per user', async () => {
    const auth = await loadAuth();
    expect(auth.getResetTokenForUser('u1')).toBeNull();

    auth.saveResetToken('u1', 'hash-abc', 123456);
    expect(auth.getResetTokenForUser('u1')).toEqual({ hash: 'hash-abc', exp: 123456 });

    // Independent per user.
    auth.saveResetToken('u2', 'hash-xyz', 999);
    expect(auth.getResetTokenForUser('u2')).toEqual({ hash: 'hash-xyz', exp: 999 });

    auth.clearResetToken('u1');
    expect(auth.getResetTokenForUser('u1')).toBeNull();
    // Clearing u1 leaves u2 intact.
    expect(auth.getResetTokenForUser('u2')).toEqual({ hash: 'hash-xyz', exp: 999 });
  });
});

describe('middleware edge paths', () => {
  it('requireAuth logs and 401s a legacy (non-hlr_) Bearer JWT with no cookie', async () => {
    const auth = await loadAuth();
    const res = mockRes();
    auth.requireAuth(
      { headers: { authorization: 'Bearer legacy.jwt.value' }, cookies: {}, ip: '1.2.3.4', path: '/x' },
      res,
      () => { throw new Error('next should not run'); },
    );
    expect(res.statusCode).toBe(401);
  });

  it('optionalAuth attaches req.user from a valid API key header', async () => {
    const auth = await loadAuth();
    const user = await auth.createUser({ username: 'mobile', password: 'pw', role: 'operator' });
    const { key } = auth.createApiKey(user.id, 'phone');
    const req = { headers: { authorization: `Bearer ${key}` }, cookies: {} };
    let called = false;
    auth.optionalAuth(req, mockRes(), () => { called = true; });
    expect(called).toBe(true);
    expect(req.user).toMatchObject({ id: user.id, apiKey: true });
  });
});

// ─── HLCE-263 mutation-pass additions ────────────────────────────────────────
describe('session store (HLCE-263)', () => {
  it('round-trips sessions to DATA_DIR/sessions.json and reads an empty list when absent', async () => {
    const auth = await loadAuth();
    // No file yet -> []. Pins loadSessions' `if (!fs.existsSync(...)) return []`.
    expect(auth.loadSessions()).toEqual([]);
    expect(fs.existsSync(path.join(tmp, 'sessions.json'))).toBe(false);

    auth.saveSessions([
      { id: 's1', userId: 'u1', invalidated: false },
      { id: 's2', userId: 'u2', invalidated: false },
    ]);
    expect(fs.existsSync(path.join(tmp, 'sessions.json'))).toBe(true);
    expect(auth.loadSessions()).toEqual([
      { id: 's1', userId: 'u1', invalidated: false },
      { id: 's2', userId: 'u2', invalidated: false },
    ]);
  });

  it('getUserSessions returns only the user\'s non-invalidated sessions', async () => {
    const auth = await loadAuth();
    auth.saveSessions([
      { id: 's1', userId: 'u1', invalidated: false },
      { id: 's2', userId: 'u1', invalidated: true },  // invalidated -> excluded
      { id: 's3', userId: 'u2', invalidated: false },  // other user -> excluded
      { id: 's4', userId: 'u1', invalidated: false },
    ]);
    const got = auth.getUserSessions('u1').map(s => s.id);
    expect(got).toEqual(['s1', 's4']);
    // The other user is isolated.
    expect(auth.getUserSessions('u2').map(s => s.id)).toEqual(['s3']);
    // An unknown user gets nothing.
    expect(auth.getUserSessions('nobody')).toEqual([]);
  });

  it('invalidateSession flips exactly the matching session and is a no-op for an unknown id', async () => {
    const auth = await loadAuth();
    auth.saveSessions([
      { id: 's1', userId: 'u1', invalidated: false },
      { id: 's2', userId: 'u1', invalidated: false },
    ]);

    // Unknown id FIRST, on an all-clean store: nothing must be invalidated. This
    // pins both the `s.id === sessionId` predicate (322 — an always-true mutant
    // would invalidate s1) and the `sessionIndex !== -1` guard (323).
    auth.invalidateSession('ghost');
    expect(auth.loadSessions().filter(s => s.invalidated)).toHaveLength(0);

    auth.invalidateSession('s1');
    const after = auth.loadSessions();
    expect(after.find(s => s.id === 's1').invalidated).toBe(true);
    expect(after.find(s => s.id === 's2').invalidated).toBe(false);
  });

  it('loadSessions returns [] when sessions.json holds malformed JSON', async () => {
    const auth = await loadAuth();
    fs.writeFileSync(path.join(tmp, 'sessions.json'), '{ not valid json');
    // Pins the catch -> return [] error path.
    expect(auth.loadSessions()).toEqual([]);
  });
});

describe('file-store error paths (HLCE-263)', () => {
  it('loadUsers returns [] when users.json is corrupt (catch path)', async () => {
    const auth = await loadAuth();
    fs.writeFileSync(path.join(tmp, 'users.json'), 'definitely-not-json{');
    expect(auth.loadUsers()).toEqual([]);
  });

  it('saveUsers reports false when the write fails', async () => {
    const auth = await loadAuth();
    const spy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('EROFS: read-only file system');
    });
    try {
      // Pins saveUsers' try/catch: a thrown write returns false, not true.
      expect(auth.saveUsers([{ id: 'u1' }])).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it('loadApiKeys returns [] when api-keys.json is corrupt (catch path)', async () => {
    const auth = await loadAuth();
    fs.writeFileSync(path.join(tmp, 'api-keys.json'), '<<<corrupt>>>');
    expect(auth.loadApiKeys()).toEqual([]);
  });
});

describe('default paths + secret fallbacks (HLCE-263)', () => {
  it('falls back to <cwd>/server/{config,data} when CONFIG_DIR/DATA_DIR are unset', async () => {
    // Capture mkdir/writeFile targets instead of writing to the real tree.
    vi.resetModules();
    delete process.env.CONFIG_DIR;
    delete process.env.DATA_DIR;
    process.env.DB_PATH = ':memory:';
    process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
    process.env.JWT_SECRET = SECRET;
    process.env.BCRYPT_COST = '4';
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    try {
      const auth = await import('./auth.js');
      // saveUsers writes to CONFIG_DIR default (server/config/users.json).
      auth.saveUsers([{ id: 'u1' }]);
      expect(writeSpy.mock.calls.some(c =>
        c[0] === path.join(process.cwd(), 'server', 'config', 'users.json'))).toBe(true);
      // saveSessions writes to DATA_DIR default (server/data/sessions.json).
      auth.saveSessions([{ id: 's1' }]);
      expect(writeSpy.mock.calls.some(c =>
        c[0] === path.join(process.cwd(), 'server', 'data', 'sessions.json'))).toBe(true);
    } finally {
      writeSpy.mockRestore();
      mkdirSpy.mockRestore();
      delete process.env.CONFIG_DIR; delete process.env.DATA_DIR;
    }
  });

  it('generateToken signs with the active JWT secret so it round-trips', async () => {
    const auth = await loadAuth();
    const token = auth.generateToken({ id: 'u1', username: 'u', role: 'user' });
    expect(jwt.verify(token, SECRET, { algorithms: ['HS256'] })).toMatchObject({ sub: 'u1' });
  });
});

describe('file-store write/dir error paths (HLCE-263)', () => {
  it('saveApiKeys creates a missing dir and swallows write errors', async () => {
    const auth = await loadAuth();
    // First: a successful save creates the file (and would mkdir if absent).
    const u = await auth.createUser({ username: 'm', password: 'pw' });
    auth.createApiKey(u.id, 'k');
    expect(fs.existsSync(path.join(tmp, 'api-keys.json'))).toBe(true);

    // Now force the write to throw -> saveApiKeys must not propagate (catch path).
    const spy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('ENOSPC');
    });
    try {
      expect(() => auth.saveApiKeys([{ id: 'x' }])).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });

  it('saveSessions swallows write errors (catch path)', async () => {
    const auth = await loadAuth();
    const spy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('EROFS');
    });
    try {
      expect(() => auth.saveSessions([{ id: 's' }])).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });

  it('creates the config dir at import when it does not yet exist (HLCE-263)', async () => {
    // Pins the module-load `if (!fs.existsSync(configDir)) fs.mkdirSync(...)`
    // (lines 49-50). Point CONFIG_DIR at a path that does not exist and assert
    // the module created it on import.
    vi.resetModules();
    const freshCfg = path.join(tmp, 'brand', 'new', 'cfg');
    process.env.CONFIG_DIR = freshCfg;
    process.env.DATA_DIR = tmp;
    process.env.DB_PATH = ':memory:';
    process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
    process.env.JWT_SECRET = SECRET;
    process.env.BCRYPT_COST = '4';
    expect(fs.existsSync(freshCfg)).toBe(false);
    await import('./auth.js');
    expect(fs.existsSync(freshCfg)).toBe(true);
  });

  it('saveApiKeys recreates a missing key-store directory before writing (HLCE-263)', async () => {
    // Pins `if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })`
    // (line 219). Remove the dir, then save: it must be recreated and the file
    // written. (Here CONFIG_DIR is tmp itself; use a nested CONFIG_DIR instead.)
    vi.resetModules();
    const cfg = path.join(tmp, 'cfg-sub');
    fs.mkdirSync(cfg, { recursive: true });
    process.env.CONFIG_DIR = cfg;
    process.env.DATA_DIR = tmp;
    process.env.DB_PATH = ':memory:';
    process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
    process.env.JWT_SECRET = SECRET;
    process.env.BCRYPT_COST = '4';
    const auth = await import('./auth.js');
    // Delete the directory so saveApiKeys must recreate it.
    fs.rmSync(cfg, { recursive: true, force: true });
    expect(fs.existsSync(cfg)).toBe(false);
    auth.saveApiKeys([{ id: 'k1', userId: 'u1', revoked: false }]);
    expect(fs.existsSync(path.join(cfg, 'api-keys.json'))).toBe(true);
  });
});

describe('secret resolution chains (HLCE-263)', () => {
  it('getActiveKeys honours JWT_KEY_CURRENT when JWT_SECRET is absent', async () => {
    // Pins the `readSecretFresh('JWT_SECRET') || readSecretFresh('JWT_KEY_CURRENT')`
    // chain (27). With JWT_SECRET unset, tokens must sign/verify under JWT_KEY_CURRENT.
    vi.resetModules();
    process.env.CONFIG_DIR = tmp;
    process.env.DATA_DIR = tmp;
    process.env.DB_PATH = ':memory:';
    process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
    delete process.env.JWT_SECRET;
    const CURRENT = 'c'.repeat(40);
    process.env.JWT_KEY_CURRENT = CURRENT;
    process.env.BCRYPT_COST = '4';
    try {
      const auth = await import('./auth.js');
      const token = auth.generateToken({ id: 'u1', username: 'u', role: 'user' });
      expect(jwt.verify(token, CURRENT, { algorithms: ['HS256'] })).toMatchObject({ sub: 'u1' });
      // And a token forged with a different key is rejected.
      const forged = jwt.sign({ sub: 'u1' }, 'wrong-key-wrong-key', { algorithm: 'HS256' });
      expect(auth.verifyToken(forged)).toBeNull();
    } finally {
      delete process.env.JWT_KEY_CURRENT;
    }
  });

  it('getApiKeyHmacKey uses an explicit API_KEY_HMAC_KEY when configured', async () => {
    // Pins `if (explicit) return explicit;` (36) — when API_KEY_HMAC_KEY is set,
    // the HMAC must derive from it (not the JWT-derived fallback). Two modules
    // with the same explicit key must mint mutually-validatable keys; a module
    // without it must NOT validate a key minted under the explicit one.
    vi.resetModules();
    process.env.CONFIG_DIR = tmp;
    process.env.DATA_DIR = tmp;
    process.env.DB_PATH = ':memory:';
    process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
    process.env.JWT_SECRET = SECRET;
    process.env.BCRYPT_COST = '4';
    process.env.API_KEY_HMAC_KEY = 'explicit-hmac-key-value-1234567890';
    let madeKey, userId;
    try {
      const auth = await import('./auth.js');
      const u = await auth.createUser({ username: 'h', password: 'pw' });
      userId = u.id;
      madeKey = auth.createApiKey(u.id, 'k').key;
      expect(auth.validateApiKey(madeKey)).toMatchObject({ id: u.id, apiKey: true });
    } finally {
      delete process.env.API_KEY_HMAC_KEY;
    }
    // Re-import WITHOUT the explicit key: the stored HMAC no longer matches, so
    // the previously-minted key fails to validate.
    vi.resetModules();
    process.env.CONFIG_DIR = tmp;
    process.env.DATA_DIR = tmp;
    process.env.DB_PATH = ':memory:';
    process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
    process.env.JWT_SECRET = SECRET;
    process.env.BCRYPT_COST = '4';
    const auth2 = await import('./auth.js');
    expect(auth2.validateApiKey(madeKey)).toBeNull();
    expect(userId).toBeTruthy();
  });
});

describe('listApiKeys preview fallback (HLCE-263)', () => {
  it('falls back to "hlr_****" when a stored key has no lookup field', async () => {
    const auth = await loadAuth();
    // Legacy entry without a `lookup` field: the preview must use the fallback.
    auth.saveApiKeys([{ id: 'k1', userId: 'u1', revoked: false, hash: 'deadbeef' }]);
    const list = auth.listApiKeys('u1');
    expect(list[0].keyPreview).toBe('hlr_****');
  });
});

describe('verifyToken inner-catch (HLCE-263)', () => {
  it('returns null when a token verifies under neither the current nor the previous key', async () => {
    const auth = await loadAuth({ previous: PREV });
    // A token signed with a THIRD, unknown key: current verify throws (triggers
    // the previous-key branch), previous verify also throws -> inner catch
    // returns null (pins line 190).
    const bogus = jwt.sign({ sub: 'u1' }, 'z'.repeat(40), { algorithm: 'HS256' });
    expect(auth.verifyToken(bogus)).toBeNull();
  });
});

describe('authenticate + changePassword error paths (HLCE-263)', () => {
  it('authenticate fails closed when validatePassword throws (catch path)', async () => {
    const auth = await loadAuth();
    // Corrupt users.json so the bcrypt.compare on a non-string hash throws inside
    // validatePassword -> authenticate's catch returns the generic failure.
    auth.saveUsers([{ id: 'u1', username: 'broken', password: { not: 'a-string' } }]);
    const res = await auth.authenticate('broken', 'pw');
    expect(res).toEqual({ success: false, error: 'Authentication failed' });
  });

  it('changePassword reports failure when the user vanishes between lookup and save', async () => {
    const auth = await loadAuth();
    const u = await auth.createUser({ username: 'cp2', password: 'old-pw' });

    // findUserById (read #1) + the bcrypt.compare see the real user; the post-verify
    // loadUsers (read #2) returns an empty array, so userIndex === -1 and the
    // "Failed to update password" branch (line 365 -> 371) fires.
    const real = fs.readFileSync.bind(fs);
    let usersReads = 0;
    const spy = vi.spyOn(fs, 'readFileSync').mockImplementation((p, enc) => {
      if (String(p).endsWith('users.json')) {
        usersReads++;
        if (usersReads >= 2) return '[]';
      }
      return real(p, enc);
    });
    try {
      const res = await auth.changePassword(u.id, 'old-pw', 'new-pw');
      expect(res).toEqual({ success: false, error: 'Failed to update password' });
    } finally {
      spy.mockRestore();
    }
  });
});

describe('createUser field defaults (HLCE-263)', () => {
  it('defaults email to "", role to "user", and mustChangePassword to false', async () => {
    const auth = await loadAuth();
    const u = await auth.createUser({ username: 'plain', password: 'pw' });
    // Pins `userData.email || ''` (120), `userData.role || 'user'` (121),
    // `userData.mustChangePassword || false` (123).
    const stored = auth.findUserByUsername('plain');
    expect(stored.email).toBe('');
    expect(stored.role).toBe('user');
    expect(stored.mustChangePassword).toBe(false);
    expect(u).not.toHaveProperty('password');
  });

  it('keeps explicit email / role / mustChangePassword values', async () => {
    const auth = await loadAuth();
    await auth.createUser({
      username: 'fancy', password: 'pw', email: 'f@x.io', role: 'operator', mustChangePassword: true,
    });
    const stored = auth.findUserByUsername('fancy');
    expect(stored.email).toBe('f@x.io');
    expect(stored.role).toBe('operator');
    expect(stored.mustChangePassword).toBe(true);
  });
});

describe('validatePassword cost-rehash (HLCE-263)', () => {
  it('leaves an at-cost hash untouched on login (no rehash when currentCost >= BCRYPT_COST)', async () => {
    const auth = await loadAuth({ cost: 4 });
    await auth.createUser({ username: 'steady', password: 'pw' });
    const before = auth.findUserByUsername('steady').password;
    expect(before).toMatch(/^\$2[aby]\$04\$/); // cost matches BCRYPT_COST=4
    const ok = await auth.validatePassword('steady', 'pw');
    expect(ok).toMatchObject({ username: 'steady' });
    // Pins `currentCost < BCRYPT_COST` (148): equal cost must NOT rehash, so the
    // stored hash is byte-identical.
    expect(auth.findUserByUsername('steady').password).toBe(before);
  });

  it('reads a multi-digit cost factor correctly (no spurious rehash at cost 12)', async () => {
    // Pins the `(\d+)` capture group + the regex anchors (147). Seed a cost-12
    // hash and log in under BCRYPT_COST=12: a `(\d)` mutant would read cost "1",
    // see 1 < 12, and rehash; a `[^aby]` mutant would fail to match and read 0.
    const auth = await loadAuth({ cost: 12 });
    const hash12 = await bcrypt.hash('pw', 12);
    auth.saveUsers([{ id: 'u1', username: 'big', password: hash12, role: 'user' }]);
    const before = auth.findUserByUsername('big').password;
    expect(before).toMatch(/^\$2[aby]\$12\$/);
    await auth.validatePassword('big', 'pw');
    // Cost already meets BCRYPT_COST=12 -> the hash must be untouched.
    expect(auth.findUserByUsername('big').password).toBe(before);
  }, 20000);

  it('rehashes a hash whose cost is below BCRYPT_COST and persists the upgrade', async () => {
    // Seed a deliberately low-cost (4) hash, then log in under a higher cost (6).
    const auth = await loadAuth({ cost: 6 });
    const lowHash = await bcrypt.hash('pw', 4);
    auth.saveUsers([{ id: 'u1', username: 'old', password: lowHash, role: 'user' }]);
    expect(auth.findUserByUsername('old').password).toMatch(/^\$2[aby]\$04\$/);

    const ok = await auth.validatePassword('old', 'pw');
    expect(ok).toMatchObject({ username: 'old' });
    // The cost prefix moved up to 06 and the new hash was saved.
    const after = auth.findUserByUsername('old').password;
    expect(after).toMatch(/^\$2[aby]\$06\$/);
    expect(after).not.toMatch(/^\$2[aby]\$04\$/);
  });
});

describe('createApiKey / listApiKeys defaults (HLCE-263)', () => {
  it('defaults the label to "Mobile App" when none is supplied', async () => {
    const auth = await loadAuth();
    const u = await auth.createUser({ username: 'm', password: 'pw' });
    const made = auth.createApiKey(u.id); // no label
    // Pins `label || 'Mobile App'` (236).
    expect(made.label).toBe('Mobile App');
    const labelled = auth.createApiKey(u.id, 'Tablet');
    expect(labelled.label).toBe('Tablet');
  });

  it('listApiKeys exposes the lookup as keyPreview and excludes revoked keys', async () => {
    const auth = await loadAuth();
    const u = await auth.createUser({ username: 'm', password: 'pw' });
    const k1 = auth.createApiKey(u.id, 'a');
    const k2 = auth.createApiKey(u.id, 'b');
    auth.revokeApiKey(k2.id, u.id);
    const list = auth.listApiKeys(u.id);
    // Pins the `!k.revoked` filter (278) and the lookup preview map (279).
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(k1.id);
    expect(list[0].keyPreview).toBe(k1.lookup);
    expect(list[0]).not.toHaveProperty('hash');
    expect(list[0]).not.toHaveProperty('key');
  });

  it('listApiKeys scopes results to the requesting user only', async () => {
    const auth = await loadAuth();
    const a = await auth.createUser({ username: 'a', password: 'pw' });
    const b = await auth.createUser({ username: 'b', password: 'pw' });
    auth.createApiKey(a.id, 'a-key');
    auth.createApiKey(b.id, 'b-key');
    // Pins `k.userId === userId` (278): user a must not see user b's key.
    expect(auth.listApiKeys(a.id)).toHaveLength(1);
    expect(auth.listApiKeys(a.id)[0].label).toBe('a-key');
  });
});

describe('changePassword paths (HLCE-263)', () => {
  it('rejects a wrong current password and succeeds (persisting) on the right one', async () => {
    const auth = await loadAuth();
    const u = await auth.createUser({ username: 'cp', password: 'old-pw' });

    expect(await auth.changePassword(u.id, 'nope', 'new-pw'))
      .toEqual({ success: false, error: 'Current password is incorrect' });

    expect(await auth.changePassword(u.id, 'old-pw', 'new-pw')).toEqual({ success: true });
    // The new password validates and the old one no longer does.
    expect(await auth.validatePassword('cp', 'new-pw')).toMatchObject({ username: 'cp' });
    expect(await auth.validatePassword('cp', 'old-pw')).toBeNull();
  });

  it('returns "User not found" for an unknown user id', async () => {
    const auth = await loadAuth();
    expect(await auth.changePassword('ghost', 'a', 'b'))
      .toEqual({ success: false, error: 'User not found' });
  });
});

describe('verifyToken previous-key age window (HLCE-263)', () => {
  it('accepts a previous-key token just inside max-age and rejects one just outside', async () => {
    const auth = await loadAuth({ previous: PREV });
    const user = { id: 'u1', username: 'u', role: 'user' };

    // iat just inside the 24h window -> accepted via the previous key. (Don't use
    // noTimestamp: jsonwebtoken strips a manual iat in that mode; without it the
    // explicit iat in the payload is honoured.)
    const freshIat = Math.floor(Date.now() / 1000) - (PREVIOUS_KEY_MAX_AGE_SEC - 60);
    const fresh = jwt.sign({ sub: user.id, iat: freshIat }, PREV, { algorithm: 'HS256' });
    expect(auth.verifyToken(fresh)).toMatchObject({ sub: 'u1' });

    // iat just past the window -> rejected (pins the `> PREVIOUS_KEY_MAX_AGE_SEC`
    // comparison at 187).
    const staleIat = Math.floor(Date.now() / 1000) - (PREVIOUS_KEY_MAX_AGE_SEC + 60);
    const stale = jwt.sign({ sub: user.id, iat: staleIat }, PREV, { algorithm: 'HS256' });
    expect(auth.verifyToken(stale)).toBeNull();
  });

  it('accepts a previous-key token exactly at the max-age boundary (strict > boundary)', async () => {
    // Pins `> PREVIOUS_KEY_MAX_AGE_SEC` vs `>=` (187). At exactly MAX_AGE the age
    // is NOT strictly greater, so the token is still accepted under fake time.
    const auth = await loadAuth({ previous: PREV });
    vi.useFakeTimers();
    const nowSec = 1_800_000_000;
    vi.setSystemTime(nowSec * 1000);
    const boundaryIat = nowSec - PREVIOUS_KEY_MAX_AGE_SEC; // age === MAX_AGE exactly
    const tok = jwt.sign({ sub: 'u1', iat: boundaryIat }, PREV, { algorithm: 'HS256' });
    expect(auth.verifyToken(tok)).toMatchObject({ sub: 'u1' });
  });
});

describe('login ticket TTL boundary (HLCE-263)', () => {
  it('honours the 5-minute TTL: valid just before exp, null at/after exp', async () => {
    const auth = await loadAuth();
    vi.useFakeTimers();
    const T0 = new Date('2026-06-21T00:00:00Z').getTime();
    const TTL = 5 * 60 * 1000;

    // Ticket A: consumed 1ms before its exp -> still valid. Pins both the
    // `5 * 60 * 1000` TTL arithmetic (466) and `entry.exp < Date.now()` (476).
    vi.setSystemTime(T0);
    const a = auth.createLoginTicket('u1'); // exp = T0 + TTL
    vi.setSystemTime(T0 + TTL - 1);
    expect(auth.consumeLoginTicket(a)).toBe('u1');

    // Ticket B: consumed 1ms after its exp -> expired -> null.
    const TB = T0 + TTL;
    vi.setSystemTime(TB);
    const b = auth.createLoginTicket('u2'); // exp = TB + TTL
    vi.setSystemTime(TB + TTL + 1);
    expect(auth.consumeLoginTicket(b)).toBeNull();
  });
});

describe('initializeAuth admin seeding (HLCE-263)', () => {
  it('seeds exactly one mustChangePassword admin and skips when a user already exists', async () => {
    const auth = await loadAuth();
    await auth.initializeAuth();
    const users = auth.loadUsers();
    // Pins `users.length === 0` (382) gate + the seeded admin shape.
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ username: 'admin', role: 'admin', mustChangePassword: true });

    // Idempotent: a second call must NOT add another user.
    await auth.initializeAuth();
    expect(auth.loadUsers()).toHaveLength(1);
  });

  it('honours DEFAULT_ADMIN_PASSWORD when set', async () => {
    const auth = await loadAuth();
    process.env.DEFAULT_ADMIN_PASSWORD = 'super-secret-seed';
    try {
      await auth.initializeAuth();
      // Pins `process.env.DEFAULT_ADMIN_PASSWORD || 'admin'` (386).
      expect(await auth.validatePassword('admin', 'super-secret-seed')).toMatchObject({ username: 'admin' });
      expect(await auth.validatePassword('admin', 'admin')).toBeNull();
    } finally {
      delete process.env.DEFAULT_ADMIN_PASSWORD;
    }
  });
});

describe('middleware header branches (HLCE-263)', () => {
  it('requireAuth 403s nothing but routes API-key vs cookie correctly', async () => {
    const auth = await loadAuth();
    const u = await auth.createUser({ username: 'm', password: 'pw' });
    const { key } = auth.createApiKey(u.id, 'phone');

    // Valid hlr_ API key -> next() with req.user.apiKey (pins startsWith 'Bearer hlr_' at 407).
    let called = false;
    const req1 = { headers: { authorization: `Bearer ${key}` }, cookies: {} };
    auth.requireAuth(req1, mockRes(), () => { called = true; });
    expect(called).toBe(true);
    expect(req1.user.apiKey).toBe(true);

    // hlr_ prefix but bad key -> 401 'Invalid API key' (not the generic message).
    const res2 = mockRes();
    auth.requireAuth({ headers: { authorization: 'Bearer hlr_bogus' }, cookies: {} }, res2, () => {
      throw new Error('next should not run');
    });
    expect(res2.statusCode).toBe(401);
    expect(res2.body.error).toBe('Invalid API key');
  });

  it('requireRole 401s without user, 403s under-privileged, next()s when sufficient', async () => {
    const auth = await loadAuth();
    const mw = auth.requireRole('operator');

    const r401 = mockRes();
    mw({}, r401, () => { throw new Error('next should not run'); });
    expect(r401.statusCode).toBe(401);

    const r403 = mockRes();
    mw({ user: { role: 'user' } }, r403, () => { throw new Error('next should not run'); });
    expect(r403.statusCode).toBe(403);
    expect(r403.body.error).toBe('Insufficient permissions');

    let okCalled = false;
    mw({ user: { role: 'admin' } }, mockRes(), () => { okCalled = true; });
    expect(okCalled).toBe(true);
  });
});
