import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { readSecret, readSecretFresh } from './secrets.js';
import { createSession, isJtiActive, getSessionByJti, rotateRefresh, revokeSession, revokeAllForUser, listForUser } from './sessions.js';
import { newTotp, verifyTotp, makeBackupCodes, hashBackupCodes, verifyBackupCode, getMfaForUser, saveMfaForUser, disableMfaForUser, setPendingMfa, getPendingMfa, clearPendingMfa } from './mfa.js';
import transporter from './email.js';
import QRCode from 'qrcode';
import { hkdfSync } from 'node:crypto';
import { logger } from './log.js';

// Cost 12 in production; tests may lower it via BCRYPT_COST for speed.
const BCRYPT_COST = Number(process.env.BCRYPT_COST) || 12;
const ACCESS_TTL_SEC = 15 * 60;
const JWT_EXPIRES_IN = ACCESS_TTL_SEC;
// Path seams: align with stars.js (CONFIG_DIR) and db.js (DATA_DIR) so tests can
// redirect file storage to a tmp dir instead of clobbering real server/config.
const CONFIG_DIR = process.env.CONFIG_DIR || path.join(process.cwd(), 'server', 'config');
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'server', 'data');
const USERS_FILE = path.join(CONFIG_DIR, 'users.json');
const API_KEYS_FILE = path.join(CONFIG_DIR, 'api-keys.json');
const PREVIOUS_KEY_MAX_AGE_SEC = 24 * 60 * 60;

function getActiveKeys() {
  const current = readSecretFresh('JWT_SECRET')
    || readSecretFresh('JWT_KEY_CURRENT')
    || process.env.JWT_SECRET;
  const previous = readSecretFresh('JWT_KEY_PREVIOUS') || null;
  return { current, previous };
}

function getApiKeyHmacKey() {
  const explicit = readSecretFresh('API_KEY_HMAC_KEY');
  if (explicit) return explicit;
  const { current } = getActiveKeys();
  return Buffer.from(hkdfSync('sha256', current, Buffer.alloc(0), 'homelabarr-api-key-hmac/v1', 32)).toString('hex');
}

const ROLE_HIERARCHY = { user: 1, operator: 2, admin: 3 };

function hasRole(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

// Ensure config directory exists
const configDir = path.dirname(USERS_FILE);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Default admin user (only created if no users exist)
const DEFAULT_ADMIN = {
  id: 'admin',
  username: 'admin',
  email: 'admin@homelabarr.local',
  role: 'admin',
  createdAt: new Date().toISOString(),
  lastLogin: null
};

// User management functions
export function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    // Guard against malformed state (e.g. users.json saved as {} instead of []).
    // Without this, every downstream call (users.find, users.length) breaks and
    // the default-admin seeder never runs because `users.length === 0` is false
    // for non-arrays.
    if (!Array.isArray(parsed)) {
      logger.warn(`users.json is not an array (got ${typeof parsed}) — ignoring and returning []`);
      return [];
    }
    return parsed;
  } catch (error) {
    logger.error('Error loading users', { error: error.message });
    return [];
  }
}

export function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    logger.error('Error saving users', { error: error.message });
    return false;
  }
}

export function findUserByUsername(username) {
  const users = loadUsers();
  return users.find(user => user.username === username);
}

export function findUserById(id) {
  const users = loadUsers();
  return users.find(user => user.id === id);
}

export async function createUser(userData) {
  const users = loadUsers();
  
  // Check if username already exists
  if (users.find(user => user.username === userData.username)) {
    throw new Error('Username already exists');
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password, BCRYPT_COST);
  
  const newUser = {
    id: generateUserId(),
    username: userData.username,
    email: userData.email || '',
    role: userData.role || 'user',
    password: hashedPassword,
    mustChangePassword: userData.mustChangePassword || false,
    createdAt: new Date().toISOString(),
    lastLogin: null
  };
  
  users.push(newUser);
  saveUsers(users);
  
  // Return user without password
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

// A fixed, valid bcrypt hash used only to equalize timing when the requested
// user does not exist. Without this, the absent-user path skips bcrypt entirely
// and returns much faster than the present-user path, giving an attacker a
// timing oracle to enumerate valid usernames. Comparing against this dummy makes
// both paths pay roughly the same bcrypt cost before returning null.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('homelabarr-timing-equalizer', BCRYPT_COST);

export async function validatePassword(username, password) {
  const user = findUserByUsername(username);
  if (!user) {
    // Run a throwaway compare so timing matches the known-user path (constant
    // against username enumeration), then fail closed.
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return null;
  }

  const currentCost = Number(user.password.match(/^\$2[aby]\$(\d+)\$/)?.[1] || 0);
  if (currentCost < BCRYPT_COST) {
    const newHash = await bcrypt.hash(password, BCRYPT_COST);
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) { users[idx].password = newHash; saveUsers(users); }
  }

  // Update last login
  const users = loadUsers();
  const userIndex = users.findIndex(u => u.id === user.id);
  if (userIndex !== -1) {
    users[userIndex].lastLogin = new Date().toISOString();
    saveUsers(users);
  }
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export function generateToken(user, jti, expiresInSec = JWT_EXPIRES_IN) {
  const { current } = getActiveKeys();
  return jwt.sign(
    { sub: user.id, id: user.id, username: user.username, role: user.role, jti },
    current,
    { expiresIn: expiresInSec, algorithm: 'HS256' }
  );
}

export function verifyToken(token) {
  const { current, previous } = getActiveKeys();
  try {
    const decoded = jwt.verify(token, current, { algorithms: ['HS256'] });
    if (decoded.jti && !isJtiActive(decoded.jti)) return null;
    return decoded;
  } catch (err) {
    if (err.name !== 'JsonWebTokenError' || !previous) return null;
    try {
      const decoded = jwt.verify(token, previous, { algorithms: ['HS256'] });
      if (decoded.iat && (Date.now() / 1000 - decoded.iat) > PREVIOUS_KEY_MAX_AGE_SEC) return null;
      if (decoded.jti && !isJtiActive(decoded.jti)) return null;
      return decoded;
    } catch {
      return null;
    }
  }
}

export function generateUserId() {
  return 'user_' + crypto.randomBytes(12).toString('hex');
}


// ─── API Key Management ─────────────────────────────────────────────────
export function loadApiKeys() {
  try {
    if (!fs.existsSync(API_KEYS_FILE)) return [];
    // Guard against a malformed store: a non-array JSON value (e.g. a stray `{}`)
    // would otherwise propagate to listApiKeys().filter(...) and 500 the API-key
    // endpoints. Treat anything that isn't an array as "no keys" (HLCE-274).
    const parsed = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    logger.error('Error loading API keys', { error: error.message });
    return [];
  }
}

export function saveApiKeys(keys) {
  try {
    const dir = path.dirname(API_KEYS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(keys, null, 2));
  } catch (error) {
    logger.error('Error saving API keys', { error: error.message });
  }
}

export function createApiKey(userId, label) {
  const keys = loadApiKeys();
  const key = 'hlr_' + crypto.randomBytes(32).toString('hex');
  const lookup = key.slice(0, 12);
  const hash = crypto.createHmac('sha256', getApiKeyHmacKey()).update(key).digest('hex');
  const entry = {
    id: 'key_' + crypto.randomBytes(8).toString('hex'),
    lookup,
    hash,
    userId,
    label: label || 'Mobile App',
    createdAt: new Date().toISOString(),
    lastUsed: null,
    revoked: false,
  };
  keys.push(entry);
  saveApiKeys(keys);
  return { ...entry, key };
}

export function validateApiKey(key) {
  if (!key || !key.startsWith('hlr_')) return null;
  const lookup = key.slice(0, 12);
  const hash = crypto.createHmac('sha256', getApiKeyHmacKey()).update(key).digest('hex');
  const keys = loadApiKeys();
  for (const entry of keys.filter(k => !k.revoked && (k.lookup === lookup || k.key))) {
    if (entry.hash && entry.hash.length === hash.length &&
        crypto.timingSafeEqual(Buffer.from(entry.hash, 'hex'), Buffer.from(hash, 'hex'))) {
      entry.lastUsed = new Date().toISOString();
      saveApiKeys(keys);
      const user = findUserById(entry.userId);
      if (!user) return null;
      return { id: user.id, username: user.username, role: user.role, apiKey: true };
    }
    // Legacy fallback: unhashed key stored as entry.key (migrate on next validate)
    if (entry.key === key) {
      entry.hash = hash;
      entry.lookup = lookup;
      delete entry.key;
      entry.lastUsed = new Date().toISOString();
      saveApiKeys(keys);
      const user = findUserById(entry.userId);
      if (!user) return null;
      return { id: user.id, username: user.username, role: user.role, apiKey: true };
    }
  }
  return null;
}

export function listApiKeys(userId) {
  const keys = loadApiKeys();
  return keys
    .filter(k => k.userId === userId && !k.revoked)
    .map(({ key, hash, ...rest }) => ({ ...rest, keyPreview: rest.lookup || 'hlr_****' }));
}

export function revokeApiKey(keyId, userId) {
  const keys = loadApiKeys();
  const entry = keys.find(k => k.id === keyId && k.userId === userId);
  if (!entry) return false;
  entry.revoked = true;
  saveApiKeys(keys);
  return true;
}

// Session management
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

export function loadSessions() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Error loading sessions', { error: error.message });
    return [];
  }
}

export function saveSessions(sessions) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
  } catch (error) {
    logger.error('Error saving sessions', { error: error.message });
  }
}

export function getUserSessions(userId) {
  const sessions = loadSessions();
  return sessions.filter(session => session.userId === userId && !session.invalidated);
}

export function invalidateSession(sessionId) {
  const sessions = loadSessions();
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex !== -1) {
    sessions[sessionIndex].invalidated = true;
    saveSessions(sessions);
  }
}

// Authentication function
export async function authenticate(username, password) {
  try {
    const user = await validatePassword(username, password);
    if (!user) return { success: false, error: 'Invalid username or password' };

    const { jti, refresh } = createSession({ userId: user.id, userAgent: '', ipAddress: '' });
    const token = generateToken(user, jti);

    return { success: true, user, token, jti, refresh };
  } catch (error) {
    logger.error('Authentication error', { error: error.message });
    return { success: false, error: 'Authentication failed' };
  }
}

// Change password function
export async function changePassword(userId, currentPassword, newPassword) {
  try {
    const user = findUserById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, BCRYPT_COST);
    
    // Update user
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].password = hashedNewPassword;
      saveUsers(users);
      return { success: true };
    }

    return { success: false, error: 'Failed to update password' };
  } catch (error) {
    logger.error('Change password error', { error: error.message });
    return { success: false, error: 'Failed to change password' };
  }
}

// Initialize default admin user if no users exist
export async function initializeAuth() {
  const users = loadUsers();
  
  if (users.length === 0) {
    logger.info('No users found, creating default admin user');
    
    // Create default admin with password 'admin' (should be changed immediately)
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';
    
    try {
      await createUser({
        ...DEFAULT_ADMIN,
        password: defaultPassword,
        mustChangePassword: true,
      });
      
      logger.info('Default admin user created — change the password immediately');
    } catch (error) {
      logger.error('Failed to create default admin user', { error: error.message });
    }
  }
}

// Middleware functions
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  // API keys via Authorization header (mobile app / CLI)
  if (authHeader?.startsWith('Bearer hlr_')) {
    const apiUser = validateApiKey(authHeader.substring(7));
    if (apiUser) { req.user = apiUser; return next(); }
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Log legacy Bearer JWT attempts (H-R2.5-2 deprecation window)
  if (authHeader?.startsWith('Bearer ') && !authHeader.startsWith('Bearer hlr_')) {
    logger.warn('legacy_bearer_seen', { ip: req.ip, path: req.path });
  }

  // Cookie-only JWT auth (C-R2.5-1)
  const token = req.cookies?.hl_session;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!hasRole(req.user.role, role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Optional authentication middleware (allows both authenticated and unauthenticated access)
export function optionalAuth(req, res, next) {
  // API key via header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer hlr_')) {
    const apiUser = validateApiKey(authHeader.substring(7));
    if (apiUser) req.user = apiUser;
  } else {
    // Cookie-based JWT
    const token = req.cookies?.hl_session;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) req.user = decoded;
    }
  }

  next();
}

// ─── Login Ticket System (MFA) ──────────────────────────────────────────
const loginTickets = new Map();
const LOGIN_TICKET_TTL = 5 * 60 * 1000;

export function createLoginTicket(userId) {
  const ticket = crypto.randomBytes(32).toString('hex');
  loginTickets.set(ticket, { userId, exp: Date.now() + LOGIN_TICKET_TTL });
  return ticket;
}

export function consumeLoginTicket(ticket) {
  const entry = loginTickets.get(ticket);
  if (!entry || entry.exp < Date.now()) { loginTickets.delete(ticket); return null; }
  loginTickets.delete(ticket);
  return entry.userId;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of loginTickets) { if (v.exp < now) loginTickets.delete(k); }
}, 60 * 1000).unref();

// ─── Password Reset Token Storage ───────────────────────────────────────
const RESET_FILE = path.join(CONFIG_DIR, 'resets.json');

function loadResets() {
  try { return JSON.parse(fs.readFileSync(RESET_FILE, 'utf8')); } catch { return {}; }
}
function saveResets(data) {
  fs.writeFileSync(RESET_FILE, JSON.stringify(data, null, 2));
}

export function saveResetToken(userId, hash, exp) {
  const all = loadResets();
  all[userId] = { hash, exp };
  saveResets(all);
}

export function getResetTokenForUser(userId) {
  const all = loadResets();
  return all[userId] || null;
}

export function clearResetToken(userId) {
  const all = loadResets();
  delete all[userId];
  saveResets(all);
}

export { hasRole, ROLE_HIERARCHY };