import fs from 'fs';
import path from 'path';

const STARS_FILE = path.join(process.cwd(), 'server', 'config', 'stars.json');

// Ensure config directory exists
const configDir = path.dirname(STARS_FILE);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

function loadStars() {
  try {
    if (!fs.existsSync(STARS_FILE)) return {};
    return JSON.parse(fs.readFileSync(STARS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveStars(stars) {
  try {
    fs.writeFileSync(STARS_FILE, JSON.stringify(stars, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving stars:', err);
    return false;
  }
}

export function getUserStars(userId) {
  return loadStars()[userId] || [];
}

export function addStar(userId, appId) {
  const stars = loadStars();
  if (!stars[userId]) stars[userId] = [];
  if (!stars[userId].includes(appId)) {
    stars[userId].push(appId);
    if (!saveStars(stars)) throw new Error('Failed to save stars');
  }
  return stars[userId];
}

export function removeStar(userId, appId) {
  const stars = loadStars();
  if (!stars[userId]) return [];
  stars[userId] = stars[userId].filter(id => id !== appId);
  if (stars[userId].length === 0) delete stars[userId];
  if (!saveStars(stars)) throw new Error('Failed to save stars');
  return stars[userId] || [];
}
