import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-212: auth core (JWT, bcrypt, API keys, login tickets, RBAC).
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
