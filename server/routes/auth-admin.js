import { Router } from 'express';
import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import {
  requireAuth,
  requireRole,
  createUser,
  loadUsers,
  saveUsers,
  findUserByUsername,
  generateToken,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  saveResetToken,
  getResetTokenForUser,
  clearResetToken,
} from '../auth.js';
import { revokeAllForUser } from '../sessions.js';
import { audit, verifyChain, getRecentAuditEvents } from '../audit.js';
import { logActivity, getActivities } from '../activity-logger.js';
import { getUserStars, addStar, removeStar } from '../stars.js';
import transporter from '../email.js';
import { readSecret } from '../secrets.js';

export default function authAdminRoutes({ sendError, getRequestMeta, isDevelopment, logger }) {
  const router = Router();

  // R6: Audit log endpoint — admin only
  router.get('/audit', requireAuth, requireRole('admin'), (req, res) => {
    audit({ actor: req.user?.username, ip: req.ip, event: 'audit.read', result: 'ok', meta: { limit: req.query.limit } });
    const limit = Math.min(parseInt(req.query.limit || '200', 10), 1000);
    const events = getRecentAuditEvents(limit);
    const chainStatus = verifyChain();
    res.json({ chain: chainStatus, events });
  });

  // C-R9.5-2: Internal audit endpoint — token-authenticated, for cron/system events
  router.post('/internal/audit', express.json({ limit: '4kb' }), (req, res) => {
    const tok = req.get('X-Internal-Token');
    const want = process.env.INTERNAL_AUDIT_TOKEN;
    if (!want || !tok) return res.status(403).json({ ok: false });
    try {
      if (tok.length !== want.length || !crypto.timingSafeEqual(Buffer.from(tok), Buffer.from(want))) {
        return res.status(403).json({ ok: false });
      }
    } catch { return res.status(403).json({ ok: false }); }
    const { event, target, meta } = req.body || {};
    if (!event || typeof event !== 'string') return res.status(400).json({ ok: false });
    audit({ actor: 'system:cron', ip: req.ip, event, target: target || null, result: 'ok', meta: meta || {} });
    res.json({ ok: true });
  });

  // R3: Forgot password — send reset email
  router.post('/auth/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }), async (req, res) => {
    const { username } = req.body || {};
    const user = username ? findUserByUsername(username) : null;
    if (user?.email) {
      const raw = crypto.randomBytes(32).toString('base64url');
      const hash = crypto.createHash('sha256').update(raw).digest('hex');
      saveResetToken(user.id, hash, Date.now() + 30 * 60 * 1000);
      const baseUrl = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
      const url = `${baseUrl}/reset-password?u=${encodeURIComponent(user.id)}&t=${raw}`;
      transporter.sendMail({
        from: process.env.SMTP_FROM || 'homelabarr@localhost',
        to: user.email,
        subject: 'HomelabARR — password reset',
        text: `Reset link (valid 30 minutes): ${url}\nIf you did not request this, ignore this email.`,
      }).catch(err => logger.error('reset_email_failed', { err: err.message }));
    }
    res.status(204).end();
  });

  // R3: Reset password — consume reset token and update password
  router.post('/auth/reset-password', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), async (req, res) => {
    try {
      const { user_id, token, new_password } = req.body || {};
      if (!user_id || !token || !new_password) return res.status(400).json({ error: 'Missing fields' });
      if (typeof new_password !== 'string' || new_password.length < 12) return res.status(400).json({ error: 'Password must be at least 12 characters' });
      const stored = getResetTokenForUser(user_id);
      if (!stored || stored.exp < Date.now()) return res.status(400).json({ error: 'Invalid or expired token' });
      const presentedHash = crypto.createHash('sha256').update(token).digest('hex');
      const a = Buffer.from(stored.hash, 'hex');
      const b = Buffer.from(presentedHash, 'hex');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(400).json({ error: 'Invalid or expired token' });
      const passwordHash = await bcrypt.hash(new_password, 12);
      const users = loadUsers();
      const idx = users.findIndex(u => u.id === user_id);
      if (idx === -1) return res.status(400).json({ error: 'User not found' });
      users[idx].password = passwordHash;
      saveUsers(users);
      clearResetToken(user_id);
      revokeAllForUser(user_id);
      res.json({ success: true });
    } catch (error) {
      sendError(res, 500, 'Password reset failed', error);
    }
  });

  // Admin-only user management routes
  router.post('/auth/users', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { username, email, password, role } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password required' });
      }

      const user = await createUser({ username, email, password, role });

      logger.info(`Admin ${req.user.username} created user ${user.username}`);
      res.json({ success: true, user });

      logActivity({
        userId: req.user.id,
        username: req.user.username,
        action: 'user_created',
        targetType: 'user',
        targetId: user.id,
        targetName: user.username,
        details: { role: user.role, email: user.email },
        ...getRequestMeta(req)
      });
    } catch (error) {
      logger.error('Create user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/auth/users', requireAuth, requireRole('admin'), (req, res) => {
    const users = loadUsers();
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    res.json(sanitizedUsers);
  });

  router.delete('/auth/users/:userId', requireAuth, requireRole('admin'), (req, res) => {
    try {
      const { userId } = req.params;

      if (userId === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      const users = loadUsers();
      const userIndex = users.findIndex(u => u.id === userId);

      if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
      }

      const deletedUser = users[userIndex];
      users.splice(userIndex, 1);
      saveUsers(users);

      logger.info(`Admin ${req.user.username} deleted user ${deletedUser.username}`);
      res.json({ success: true, message: `User ${deletedUser.username} deleted` });

      logActivity({
        userId: req.user.id,
        username: req.user.username,
        action: 'user_deleted',
        targetType: 'user',
        targetId: deletedUser.id,
        targetName: deletedUser.username,
        ...getRequestMeta(req)
      });
    } catch (error) {
      logger.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/auth/users/:userId/password', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 12) {
        return res.status(400).json({ error: 'Password must be at least 12 characters' });
      }

      const users = loadUsers();
      const userIndex = users.findIndex(u => u.id === userId);

      if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
      }

      users[userIndex].password = await bcrypt.hash(newPassword, 12);
      saveUsers(users);

      logger.info(`Admin ${req.user.username} reset password for ${users[userIndex].username}`);
      res.json({ success: true, message: `Password reset for ${users[userIndex].username}` });

      logActivity({
        userId: req.user.id,
        username: req.user.username,
        action: 'user_password_reset',
        targetType: 'user',
        targetId: userId,
        targetName: users[userIndex].username,
        ...getRequestMeta(req)
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // H-R9-5: CLI mint endpoint — issue short-lived tokens for scanners/CLI tools
  router.post('/auth/cli-mint', express.json({ limit: '1kb' }), async (req, res) => {
    const mintKey = req.get('X-Mint-Key');
    const want = process.env.CLI_MINT_KEY || readSecret('CLI_MINT_KEY', { required: false });
    if (!want || !mintKey) return res.status(403).json({ ok: false });
    try {
      if (!crypto.timingSafeEqual(Buffer.from(mintKey), Buffer.from(want))) {
        return res.status(403).json({ ok: false });
      }
    } catch { return res.status(403).json({ ok: false }); }
    const { u, role = 'viewer', ttl_s = 1800 } = req.body || {};
    if (!u || typeof u !== 'string' || !/^[a-z0-9._-]{3,32}$/.test(u)) return res.status(400).json({ ok: false });
    if (!['viewer', 'scanner'].includes(role)) return res.status(400).json({ ok: false });
    if (ttl_s < 60 || ttl_s > 3600) return res.status(400).json({ ok: false });
    // Mint a stateless, jti-less token: verifyToken only consults the sessions
    // table when a jti is present, so a minted CLI token (no session row) must
    // omit it or it would always 401. Its lifetime IS the requested ttl_s — the
    // JWT's real `exp` is what enforces revocation here (no server-side session).
    const token = generateToken({ id: u, username: u, role }, undefined, ttl_s);
    audit({ actor: u, ip: req.ip, event: 'auth.cli_mint', result: 'ok', meta: { role, ttl_s } });
    res.json({ a: token, exp: Math.floor(Date.now() / 1000) + ttl_s });
  });

  // ─── API Key Routes ─────────────────────────────────────────────────────
  router.post('/auth/api-keys', requireAuth, async (req, res) => {
    try {
      const { label } = req.body;
      const entry = createApiKey(req.user.id, label);
      res.status(201).json({
        id: entry.id,
        key: entry.key,
        label: entry.label,
        createdAt: entry.createdAt,
        message: 'Save this key — it will not be shown again.'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create API key' });
    }
  });

  router.get('/auth/api-keys', requireAuth, (req, res) => {
    res.json({ apiKeys: listApiKeys(req.user.id) });
  });

  router.delete('/auth/api-keys/:keyId', requireAuth, (req, res) => {
    const success = revokeApiKey(req.params.keyId, req.user.id);
    if (success) res.json({ message: 'API key revoked' });
    else res.status(404).json({ error: 'API key not found' });
  });

  // ─── Starred Apps Routes ────────────────────────────────────────────────
  router.get('/auth/me/stars', requireAuth, (req, res) => {
    try {
      res.json({ stars: getUserStars(req.user.id) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load stars' });
    }
  });

  router.post('/auth/me/stars/:appId', requireAuth, (req, res) => {
    try {
      const stars = addStar(req.user.id, req.params.appId);
      res.json({ stars });
    } catch (err) {
      res.status(500).json({ error: 'Failed to star app' });
    }
  });

  router.delete('/auth/me/stars/:appId', requireAuth, (req, res) => {
    try {
      const stars = removeStar(req.user.id, req.params.appId);
      res.json({ stars });
    } catch (err) {
      res.status(500).json({ error: 'Failed to unstar app' });
    }
  });

  // Activity log endpoint
  router.get('/auth/activity-log', requireAuth, requireRole('admin'), (req, res) => {
    try {
      const { userId, action, limit = '50', offset = '0' } = req.query;

      const result = getActivities({
        userId: userId || undefined,
        action: action || undefined,
        limit: Math.min(parseInt(limit) || 50, 200),
        offset: parseInt(offset) || 0
      });

      res.json(result);
    } catch (error) {
      logger.error('Activity log error:', error);
      res.status(500).json({ error: 'Failed to retrieve activity log' });
    }
  });

  router.post('/auth/register', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { username, password, email, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'Username and password are required'
        });
      }

      const user = await createUser({
        username,
        password,
        email: email || '',
        role: role || 'user'
      });

      res.json({
        success: true,
        user
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(400).json({
        error: 'Registration failed',
        details: error.message
      });
    }
  });

  return router;
}
