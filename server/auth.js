import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const USERS_FILE = path.join(process.cwd(), 'server', 'config', 'users.json');
const API_KEYS_FILE = path.join(process.cwd(), 'server', 'config', 'api-keys.json');

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
      console.warn(`users.json is not an array (got ${typeof parsed}) — ignoring and returning []. File will be rewritten on next save.`);
      return [];
    }
    return parsed;
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

export function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving users:', error);
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
  const hashedPassword = await bcrypt.hash(userData.password, 12);
  
  const newUser = {
    id: generateUserId(),
    username: userData.username,
    email: userData.email || '',
    role: userData.role || 'user',
    password: hashedPassword,
    createdAt: new Date().toISOString(),
    lastLogin: null
  };
  
  users.push(newUser);
  saveUsers(users);
  
  // Return user without password
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

export async function validatePassword(username, password) {
  const user = findUserByUsername(username);
  if (!user) {
    return null;
  }
  
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return null;
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

export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function generateUserId() {
  return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}


// ─── API Key Management ─────────────────────────────────────────────────
export function loadApiKeys() {
  try {
    if (!fs.existsSync(API_KEYS_FILE)) return [];
    return JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'));
  } catch (error) {
    console.error('Error loading API keys:', error);
    return [];
  }
}

export function saveApiKeys(keys) {
  try {
    const dir = path.dirname(API_KEYS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(keys, null, 2));
  } catch (error) {
    console.error('Error saving API keys:', error);
  }
}

export function generateApiKey() {
  return 'hlr_' + crypto.randomBytes(32).toString('hex');
}

export function createApiKey(userId, label) {
  const keys = loadApiKeys();
  const key = generateApiKey();
  const entry = {
    id: 'key_' + crypto.randomBytes(8).toString('hex'),
    key: key,
    userId: userId,
    label: label || 'Mobile App',
    createdAt: new Date().toISOString(),
    lastUsed: null,
    revoked: false
  };
  keys.push(entry);
  saveApiKeys(keys);
  return entry;
}

export function validateApiKey(key) {
  if (!key || !key.startsWith('hlr_')) return null;
  const keys = loadApiKeys();
  const entry = keys.find(k => k.key === key && !k.revoked);
  if (!entry) return null;
  entry.lastUsed = new Date().toISOString();
  saveApiKeys(keys);
  const user = findUserById(entry.userId);
  if (!user) return null;
  return { id: user.id, username: user.username, role: user.role, apiKey: true };
}

export function listApiKeys(userId) {
  const keys = loadApiKeys();
  return keys
    .filter(k => k.userId === userId && !k.revoked)
    .map(({ key, ...rest }) => ({ ...rest, keyPreview: key.slice(0, 8) + '...' + key.slice(-4) }));
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
const SESSIONS_FILE = path.join(process.cwd(), 'server', 'data', 'sessions.json');

export function loadSessions() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
}

export function saveSessions(sessions) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
  } catch (error) {
    console.error('Error saving sessions:', error);
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
    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    const token = generateToken(user);
    const sessionId = 'session_' + crypto.randomBytes(12).toString('hex') + Date.now().toString(36);
    
    // Create session
    const sessions = loadSessions();
    const session = {
      id: sessionId,
      userId: user.id,
      token: token,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      userAgent: '',
      ipAddress: '',
      invalidated: false
    };
    
    sessions.push(session);
    saveSessions(sessions);

    return {
      success: true,
      user: user,
      token: token,
      sessionId: sessionId
    };
  } catch (error) {
    console.error('Authentication error:', error);
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
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
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
    console.error('Change password error:', error);
    return { success: false, error: 'Failed to change password' };
  }
}

// Initialize default admin user if no users exist
export async function initializeAuth() {
  const users = loadUsers();
  
  if (users.length === 0) {
    console.log('🔐 No users found, creating default admin user...');
    
    // Create default admin with password 'admin' (should be changed immediately)
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';
    
    try {
      await createUser({
        ...DEFAULT_ADMIN,
        password: defaultPassword
      });
      
      console.log('✅ Default admin user created:');
      console.log('   Username: admin');
      console.log('   Password: admin');
      console.log('   ⚠️  CHANGE THE DEFAULT PASSWORD IMMEDIATELY!');
    } catch (error) {
      console.error('❌ Failed to create default admin user:', error);
    }
  }
}

// Middleware functions
export function requireAuth(role) {
  // If called with parameters (req, res, next), it's being used as direct middleware
  if (arguments.length === 3 || (arguments.length === 1 && typeof role === 'object')) {
    const [req, res, next] = arguments.length === 3 ? arguments : [role, arguments[1], arguments[2]];
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'Please provide a valid authentication token'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Try API key first (hlr_ prefix)
    if (token.startsWith('hlr_')) {
      const apiUser = validateApiKey(token);
      if (apiUser) { req.user = apiUser; next(); return; }
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ 
        error: 'Invalid token',
        details: 'Authentication token is invalid or expired'
      });
    }
    
    // Add user info to request
    req.user = decoded;
    next();
    return;
  }
  
  // If called with no arguments or a role, return a middleware function
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'Please provide a valid authentication token'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Try API key first
    if (token.startsWith('hlr_')) {
      const apiUser = validateApiKey(token);
      if (apiUser) {
        req.user = apiUser;
        if (role && apiUser.role !== role && apiUser.role !== 'admin') {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next(); return;
      }
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ 
        error: 'Invalid token',
        details: 'Authentication token is invalid or expired'
      });
    }
    
    // Check role if specified
    if (role && decoded.role !== role && decoded.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        details: `Role '${role}' required`
      });
    }
    
    // Add user info to request
    req.user = decoded;
    next();
  };
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }
    
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        details: `This action requires ${role} role or higher`
      });
    }
    
    next();
  };
}

// Optional authentication middleware (allows both authenticated and unauthenticated access)
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token.startsWith('hlr_')) {
      const apiUser = validateApiKey(token);
      if (apiUser) req.user = apiUser;
    } else {
      const decoded = verifyToken(token);
      if (decoded) req.user = decoded;
    }
  }
  
  next();
}