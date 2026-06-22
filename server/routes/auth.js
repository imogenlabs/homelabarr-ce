import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import {
  requireAuth,
  authenticate,
  findUserById,
  generateToken,
  changePassword,
  createLoginTicket,
  consumeLoginTicket,
  loadUsers,
  loadSessions,
  invalidateSession,
} from '../auth.js';
import {
  createSession,
  rotateRefresh,
  revokeSession,
  revokeAllForUser,
  listForUser,
  getSessionByJti,
} from '../sessions.js';
import {
  newTotp,
  verifyTotp,
  makeBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
  getMfaForUser,
  saveMfaForUser,
  disableMfaForUser,
  setPendingMfa,
  getPendingMfa,
  clearPendingMfa,
} from '../mfa.js';
import { audit } from '../audit.js';
import { maybeAlert } from '../alert.js';
import { logActivity } from '../activity-logger.js';

export default function authRoutes({ sendError, getRequestMeta, loginLimiter, lockout, logger }) {
  const router = Router();

  // Authentication routes (C-8: login rate limited)
  router.post('/auth/login', loginLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      if (lockout.isLocked(username)) {
        audit({ actor: username, ip: req.ip, event: 'login.locked', result: 'denied', meta: {} });
        maybeAlert({ event: 'login.locked', actor: username, ip: req.ip });
        return res.status(423).json({ error: 'Account temporarily locked. Try again in 30 minutes.' });
      }

      const result = await authenticate(username, password);

      if (!result.success) {
        lockout.onFail(username);
        audit({ actor: username, ip: req.ip, event: 'login.fail', result: 'fail', meta: {} });
        maybeAlert({ event: 'login.fail', actor: username, ip: req.ip });
        return res.status(401).json({ error: result.error });
      }

      // R3: Check if user has MFA enabled — if so, return a ticket instead of cookies
      const mfa = getMfaForUser(result.user.id);
      if (mfa?.secret) {
        const ticket = createLoginTicket(result.user.id);
        return res.json({ success: true, mfa_required: true, ticket });
      }

      // No MFA — issue session + refresh cookies
      const { password: _, ...safeUser } = result.user;
      logger.info(`User ${result.user.username} logged in from ${req.ip}`);

      res.cookie('hl_session', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 15 * 60 * 1000,
      });
      if (result.refresh && result.jti) {
        res.cookie('hl_refresh', result.refresh + '.' + result.jti, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/api/auth/refresh',
          maxAge: 14 * 24 * 60 * 60 * 1000,
        });
      }
      const csrfToken = crypto.randomBytes(32).toString('hex');
      res.cookie('hl_csrf', csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 14 * 24 * 60 * 60 * 1000,
      });

      res.json({ success: true, user: safeUser });

      lockout.onSuccess(username);
      audit({ actor: username, ip: req.ip, event: 'login.success', result: 'ok', meta: {} });

      logActivity({
        userId: result.user.id,
        username: result.user.username,
        action: 'user_login',
        targetType: 'user',
        targetId: result.user.id,
        targetName: result.user.username,
        ...getRequestMeta(req)
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/auth/logout', requireAuth, (req, res) => {
    try {
      // Invalidate session — check cookie first, then Authorization header
      const token = req.cookies?.hl_session || (req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.substring(7));

      if (token) {
        const sessions = loadSessions();
        const session = sessions.find(s => s.token === token);
        if (session) {
          invalidateSession(session.id);
        }
      }

      // Clear auth cookies
      res.clearCookie('hl_session', { path: '/' });
      res.clearCookie('hl_refresh', { path: '/api/auth/refresh' });
      res.clearCookie('hl_csrf', { path: '/' });

      // R3: Revoke the session by jti
      if (req.user?.jti) revokeSession(req.user.jti);

      audit({ actor: req.user?.username, ip: req.ip, event: 'session.revoke', result: 'ok', target: req.user?.jti, meta: {} });

      logger.info(`User ${req.user.username} logged out`);
      res.json({ success: true });

      logActivity({
        userId: req.user.id,
        username: req.user.username,
        action: 'user_logout',
        targetType: 'user',
        targetId: req.user.id,
        targetName: req.user.username,
        ...getRequestMeta(req)
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/auth/me', requireAuth, (req, res) => {
    const users = loadUsers();
    const user = users.find(u => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return the user wrapped in `user`, matching /auth/login. The frontend reads
    // `data.user` for both; returning a flat object here logged users out on every
    // page reload (data.user was undefined).
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  });

  router.post('/auth/change-password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password required' });
      }

      if (newPassword.length < 12) {
        return res.status(400).json({ error: 'New password must be at least 12 characters' });
      }

      const result = await changePassword(req.user.id, currentPassword, newPassword);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // R3: Revoke all other sessions after password change
      revokeAllForUser(req.user.sub || req.user.id, req.user.jti);

      logger.info(`User ${req.user.username} changed password`);
      res.json({ success: true });

      logActivity({
        userId: req.user.id,
        username: req.user.username,
        action: 'password_changed',
        targetType: 'user',
        targetId: req.user.id,
        targetName: req.user.username,
        ...getRequestMeta(req)
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // R3: MFA second-step login
  router.post('/auth/login/mfa', loginLimiter, async (req, res) => {
    try {
      const { ticket, code, backup_code } = req.body;
      if (!ticket) return res.status(400).json({ error: 'Ticket required' });
      const userId = consumeLoginTicket(ticket);
      if (!userId) return res.status(401).json({ error: 'Invalid or expired ticket' });
      const mfa = getMfaForUser(userId);
      if (!mfa?.secret) return res.status(400).json({ error: 'MFA not enabled' });

      let ok = false;
      if (code) {
        ok = verifyTotp(mfa.secret, code);
      } else if (backup_code) {
        const idx = await verifyBackupCode(backup_code, mfa.backupHashes);
        if (idx >= 0) {
          mfa.backupHashes[idx] = null;
          saveMfaForUser(userId, mfa);
          ok = true;
        }
      }
      if (!ok) return res.status(401).json({ error: 'Invalid MFA code' });

      const user = findUserById(userId);
      if (!user) return res.status(401).json({ error: 'User not found' });
      const { jti, refresh } = createSession({ userId, userAgent: req.headers['user-agent'], ip: req.ip });
      const token = generateToken(user, jti);
      const { password: pw, ...safeUser } = user;

      res.cookie('hl_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 15 * 60 * 1000 });
      res.cookie('hl_refresh', refresh + '.' + jti, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth/refresh', maxAge: 14 * 24 * 60 * 60 * 1000 });
      const csrfToken = crypto.randomBytes(32).toString('hex');
      res.cookie('hl_csrf', csrfToken, { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 14 * 24 * 60 * 60 * 1000 });
      res.json({ success: true, user: safeUser });
    } catch (error) {
      sendError(res, 500, 'MFA login failed', error);
    }
  });

  // R3: Token refresh via rotate-on-use refresh cookie
  router.post('/auth/refresh', (req, res) => {
    try {
      const raw = req.cookies?.hl_refresh;
      if (!raw) return res.status(401).json({ error: 'No refresh token' });
      const dotIdx = raw.lastIndexOf('.');
      if (dotIdx === -1) return res.status(400).json({ error: 'Bad refresh format' });
      const presented = raw.substring(0, dotIdx);
      const jti = raw.substring(dotIdx + 1);

      const newRefresh = rotateRefresh(jti, presented, req.headers['user-agent'], req.ip);
      if (!newRefresh) {
        res.clearCookie('hl_session', { path: '/' });
        res.clearCookie('hl_refresh', { path: '/api/auth/refresh' });
        return res.status(401).json({ error: 'Refresh invalid or reused' });
      }

      const session = getSessionByJti(jti);
      if (!session) return res.status(401).json({ error: 'Session not found' });
      const user = findUserById(session.user_id);
      if (!user) return res.status(401).json({ error: 'User not found' });

      const token = generateToken(user, jti);
      res.cookie('hl_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 15 * 60 * 1000 });
      res.cookie('hl_refresh', newRefresh + '.' + jti, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth/refresh', maxAge: 14 * 24 * 60 * 60 * 1000 });
      res.json({ success: true });
    } catch (error) {
      sendError(res, 500, 'Token refresh failed', error);
    }
  });

  // R3: List active sessions for current user
  router.get('/auth/sessions', requireAuth, (req, res) => {
    const userId = req.user.sub || req.user.id;
    const rows = listForUser(userId);
    res.json({
      current_jti: req.user.jti,
      sessions: rows.map(r => ({
        jti: r.jti, user_agent: r.user_agent, ip: r.ip,
        created_at: r.created_at, last_seen_at: r.last_seen_at,
        expires_at: r.expires_at, revoked: !!r.revoked_at,
        is_current: r.jti === req.user.jti,
      })),
    });
  });

  // R3: Revoke a single session
  router.delete('/auth/sessions/:jti', requireAuth, (req, res) => {
    if (!/^[a-f0-9]{32}$/.test(req.params.jti)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }
    const userId = req.user.sub || req.user.id;
    const session = getSessionByJti(req.params.jti);
    if (!session || session.user_id !== userId) return res.status(404).json({ error: 'Not found' });
    if (req.params.jti === req.user.jti) {
      res.clearCookie('hl_session', { path: '/' });
      res.clearCookie('hl_refresh', { path: '/api/auth/refresh' });
    }
    revokeSession(req.params.jti);
    audit({ actor: req.user?.username, ip: req.ip, event: 'session.revoke', result: 'ok', target: req.params.jti, meta: {} });
    res.json({ success: true });
  });

  // R3: Revoke all sessions except current
  router.post('/auth/sessions/revoke-all', requireAuth, (req, res) => {
    const userId = req.user.sub || req.user.id;
    revokeAllForUser(userId, req.user.jti);
    audit({ actor: req.user?.username, ip: req.ip, event: 'session.revoke_all', result: 'ok', meta: {} });
    res.json({ success: true });
  });

  // R3: MFA setup — generate TOTP secret + QR code
  router.post('/auth/mfa/setup', requireAuth, async (req, res) => {
    try {
      if (req.body && Object.keys(req.body).length > 0) {
        return res.status(400).json({ error: 'This endpoint does not accept a request body' });
      }
      const totp = newTotp(req.user.username);
      setPendingMfa(req.user.sub || req.user.id, { secret: totp.secret.base32, exp: Date.now() + 5 * 60 * 1000 });
      const uri = totp.toString();
      const qr = await QRCode.toDataURL(uri);
      res.json({ uri, qr });
    } catch (error) {
      sendError(res, 500, 'MFA setup failed', error);
    }
  });

  // R3: MFA verify — confirm TOTP code and enable MFA
  router.post('/auth/mfa/verify', requireAuth, async (req, res) => {
    try {
      const { code } = req.body || {};
      if (typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) {
        return res.status(400).json({ error: 'Code must be a 6-digit string' });
      }
      const userId = req.user.sub || req.user.id;
      const pending = getPendingMfa(userId);
      if (!pending) return res.status(400).json({ error: 'No pending MFA setup' });
      if (!verifyTotp(pending.secret, code)) return res.status(400).json({ error: 'Invalid code' });
      const backup = makeBackupCodes(10);
      const backupHashes = await hashBackupCodes(backup);
      saveMfaForUser(userId, { secret: pending.secret, backupHashes, enabledAt: Date.now() });
      clearPendingMfa(userId);
      const csrfToken = crypto.randomBytes(32).toString('hex');
      res.cookie('hl_csrf', csrfToken, { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 14 * 24 * 60 * 60 * 1000 });
      res.json({ enabled: true, backup_codes: backup });
    } catch (error) {
      sendError(res, 500, 'MFA verification failed', error);
    }
  });

  // R3: MFA disable — requires password confirmation
  router.post('/auth/mfa/disable', requireAuth, async (req, res) => {
    try {
      const { password } = req.body || {};
      if (typeof password !== 'string' || password.length === 0) {
        return res.status(400).json({ error: 'Password required' });
      }
      const userId = req.user.sub || req.user.id;
      const user = findUserById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: 'Invalid password' });
      disableMfaForUser(userId);
      res.json({ disabled: true });
    } catch (error) {
      sendError(res, 500, 'MFA disable failed', error);
    }
  });

  return router;
}
