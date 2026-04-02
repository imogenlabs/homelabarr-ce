import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const ACTIVITY_DIR = path.join(process.cwd(), 'server', 'activity-data');
const ACTIVITY_FILE = path.join(ACTIVITY_DIR, 'activity-log.json');
const MAX_ENTRIES = 10000;

let activities = [];

export function initializeActivityLog() {
  if (!fs.existsSync(ACTIVITY_DIR)) {
    fs.mkdirSync(ACTIVITY_DIR, { recursive: true });
  }

  if (fs.existsSync(ACTIVITY_FILE)) {
    try {
      const raw = fs.readFileSync(ACTIVITY_FILE, 'utf8');
      activities = JSON.parse(raw);
      if (!Array.isArray(activities)) activities = [];
    } catch {
      activities = [];
    }
  }

  console.log(`Activity log initialized (${activities.length} entries)`);
}

function persist() {
  try {
    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2));
  } catch (error) {
    console.error('Failed to persist activity log:', error.message);
  }
}

export function logActivity({ userId, username, action, targetType, targetId, targetName, details, ipAddress, userAgent }) {
  const entry = {
    id: 'act_' + crypto.randomBytes(12).toString('hex'),
    userId: userId || 'system',
    username: username || 'System',
    timestamp: new Date().toISOString(),
    action,
    targetType: targetType || null,
    targetId: targetId || null,
    targetName: targetName || null,
    details: details || null,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null
  };

  activities.unshift(entry);

  if (activities.length > MAX_ENTRIES) {
    activities = activities.slice(0, MAX_ENTRIES);
  }

  persist();
}

export function getActivities({ userId, action, limit = 50, offset = 0 } = {}) {
  let filtered = activities;

  if (userId) {
    filtered = filtered.filter(a => a.userId === userId);
  }
  if (action) {
    filtered = filtered.filter(a => a.action === action);
  }

  const total = filtered.length;
  const page = filtered.slice(offset, offset + limit);

  return { activities: page, total };
}
