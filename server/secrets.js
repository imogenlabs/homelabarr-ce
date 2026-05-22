import fs from 'node:fs';

const SECRET_ROOT = process.env.SECRET_ROOT || '/run/secrets';
const cache = new Map();

export function readSecret(name, { required = true } = {}) {
  if (cache.has(name)) return cache.get(name);
  const dockerPath = SECRET_ROOT + '/' + name.toLowerCase();
  if (fs.existsSync(dockerPath)) {
    const v = fs.readFileSync(dockerPath, 'utf8').replace(/\s+$/, '');
    cache.set(name, v); return v;
  }
  const filePath = process.env[name + '_FILE'];
  if (filePath && fs.existsSync(filePath)) {
    const v = fs.readFileSync(filePath, 'utf8').replace(/\s+$/, '');
    cache.set(name, v); return v;
  }
  if (process.env[name] !== undefined) {
    cache.set(name, process.env[name]); return process.env[name];
  }
  if (required) throw new Error('secret-missing: ' + name);
  cache.set(name, null); return null;
}

export function readSecretFresh(name) {
  cache.delete(name);
  return readSecret(name, { required: false });
}
