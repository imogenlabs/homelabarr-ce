import { describe, it, expect, beforeAll, afterEach } from 'vitest';

process.env.DB_PATH = ':memory:';

let getInstallId, db;

beforeAll(async () => {
  ({ getInstallId } = await import('./install-id.js'));
  ({ db } = await import('./db.js'));
});

afterEach(() => { delete process.env.DEMO_MODE; });

describe('install id', () => {
  it('is a random UUID that stays the same once made', () => {
    const first = getInstallId();
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(getInstallId()).toBe(first);
    expect(db.prepare('SELECT count(*) AS n FROM install_meta').get().n).toBe(1);
  });

  it('is read from the database, not from memory', () => {
    db.prepare('UPDATE install_meta SET value = ? WHERE key = ?').run('kept-across-restarts', 'install_id');
    expect(getInstallId()).toBe('kept-across-restarts');
  });

  it('is the fixed word "demo" on the public demo and stores nothing new', () => {
    const real = getInstallId();
    process.env.DEMO_MODE = 'true';
    expect(getInstallId()).toBe('demo');
    delete process.env.DEMO_MODE;
    expect(getInstallId()).toBe(real);
  });
});
