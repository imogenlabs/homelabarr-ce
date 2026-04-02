import fs from 'fs';
import path from 'path';

const STARS_FILE = path.join(process.cwd(), 'server', 'config', 'stars.json');

function loadStars() {
  try {
    if (!fs.existsSync(STARS_FILE)) return {};
    return JSON.parse(fs.readFileSync(STARS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveStars(stars) {
  fs.writeFileSync(STARS_FILE, JSON.stringify(stars, null, 2));
}

export function getUserStars(userId) {
  const stars = loadStars();
  return stars[userId] || [];
}

export function addStar(userId, appId) {
  const stars = loadStars();
  if (!stars[userId]) stars[userId] = [];
  if (!stars[userId].includes(appId)) {
    stars[userId].push(appId);
    saveStars(stars);
  }
  return stars[userId];
}

export function removeStar(userId, appId) {
  const stars = loadStars();
  if (!stars[userId]) return [];
  stars[userId] = stars[userId].filter(id => id !== appId);
  if (stars[userId].length === 0) delete stars[userId];
  saveStars(stars);
  return stars[userId] || [];
}
