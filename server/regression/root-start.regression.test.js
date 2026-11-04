// HLCE-363 — Unraid creates appdata folders as root, and the backend runs as
// uid 1001, so it could not write its config or open its database. A backend
// started as root (the Unraid template passes --user 0:0) takes ownership of
// its data folders and drops to 1001. These checks keep the three pieces of
// that in step: the Dockerfile ships su-exec, start.sh drops before anything
// else runs, and the folders it fixes are the ones homelabarr.yml mounts.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const startSh = read('server/start.sh');

describe('root start drops to uid 1001 (HLCE-363)', () => {
  it('installs su-exec in the backend image', () => {
    expect(read('Dockerfile.backend')).toMatch(/^\s+su-exec( &&)? \\$/m);
  });

  it('drops to 1001 before the Docker check, config seeding and node', () => {
    const drop = startSh.indexOf('exec su-exec 1001:1001');
    expect(drop).toBeGreaterThan(-1);
    expect(startSh.indexOf('if [ "$(id -u)" = "0" ]')).toBeLessThan(drop);
    for (const later of ['check_docker_endpoint()', 'seed_config_file users.json', 'exec node server/index.js']) {
      expect(startSh.indexOf(later)).toBeGreaterThan(drop);
    }
  });

  it('fixes ownership of every data volume homelabarr.yml mounts into the backend', () => {
    const dirs = startSh.match(/^DATA_DIRS="([^"]+)"/m)[1].split(' ').sort();
    const mounted = [...read('homelabarr.yml').matchAll(/^\s+- homelabarr-[a-z]+:(\/app\/[^\s:]+)/gm)]
      .map((m) => m[1]).sort();
    expect(mounted.length).toBeGreaterThan(0);
    expect(dirs).toEqual(mounted);
  });
});
