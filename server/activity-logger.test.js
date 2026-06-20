import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-221: activity log. activity-logger.js keeps an in-memory array (module
// state) persisted as a full-file rewrite, and resolves ACTIVITY_DIR at import.
// Each test resets modules + points ACTIVITY_DIR at a throwaway dir.
let tmp;

async function loadLogger() {
  vi.resetModules();
  process.env.ACTIVITY_DIR = tmp;
  return import('./activity-logger.js');
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-activity-'));
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
  delete process.env.ACTIVITY_DIR;
});

describe('ordering, filtering & pagination (AC3)', () => {
  it('records newest-first and round-trips to disk', async () => {
    const log = await loadLogger();
    log.initializeActivityLog();

    log.logActivity({ userId: 'u1', action: 'a1' });
    log.logActivity({ userId: 'u2', action: 'a2' });
    log.logActivity({ userId: 'u1', action: 'a3' });

    const { activities, total } = log.getActivities();
    expect(total).toBe(3);
    expect(activities.map(a => a.action)).toEqual(['a3', 'a2', 'a1']); // newest first
    expect(activities[0]).toMatchObject({ userId: 'u1', username: 'System' });
    expect(activities[0].id).toMatch(/^act_/);

    // Persisted; a fresh import reads it back.
    const reloaded = await loadLogger();
    reloaded.initializeActivityLog();
    expect(reloaded.getActivities().total).toBe(3);
  });

  it('filters by userId and action, and paginates with limit/offset', async () => {
    const log = await loadLogger();
    log.initializeActivityLog();
    for (let i = 0; i < 5; i++) log.logActivity({ userId: 'u1', action: 'login' });
    log.logActivity({ userId: 'u2', action: 'logout' });

    expect(log.getActivities({ userId: 'u1' }).total).toBe(5);
    expect(log.getActivities({ action: 'logout' }).total).toBe(1);
    expect(log.getActivities({ userId: 'u1', action: 'logout' }).total).toBe(0);

    const page = log.getActivities({ userId: 'u1', limit: 2, offset: 1 });
    expect(page.total).toBe(5);     // total is the full filtered count
    expect(page.activities).toHaveLength(2); // page is sliced
  });

  it('caps the log at MAX_ENTRIES (10000), dropping the oldest', async () => {
    // Pre-seed a full log (newest-first: keep0 newest … keep9999 oldest) so the
    // cap is exercised by a single extra entry — adding 10k entries one-by-one
    // would re-serialise the growing array on every call (O(n²) → timeout).
    const seeded = Array.from({ length: 10000 }, (_, i) => ({
      id: `act_seed${i}`, userId: 'u1', action: `keep${i}`, timestamp: new Date().toISOString(),
    }));
    fs.writeFileSync(path.join(tmp, 'activity-log.json'), JSON.stringify(seeded));

    const log = await loadLogger();
    log.initializeActivityLog();
    expect(log.getActivities().total).toBe(10000);

    // One more entry pushes past the cap; the oldest (keep9999) is evicted.
    log.logActivity({ userId: 'u1', action: 'newest' });

    const { total, activities } = log.getActivities({ limit: 1 });
    expect(total).toBe(10000);
    expect(activities[0].action).toBe('newest');
    expect(log.getActivities({ action: 'keep9999' }).total).toBe(0); // oldest dropped
    expect(log.getActivities({ action: 'keep0' }).total).toBe(1);    // newer kept
  });

  it('resets a corrupt activity-log.json to empty on init without throwing', async () => {
    fs.writeFileSync(path.join(tmp, 'activity-log.json'), 'definitely not json');
    const log = await loadLogger();
    expect(() => log.initializeActivityLog()).not.toThrow();
    expect(log.getActivities().total).toBe(0);
  });

  it('treats a non-array JSON payload as empty', async () => {
    fs.writeFileSync(path.join(tmp, 'activity-log.json'), '{"not":"an array"}');
    const log = await loadLogger();
    log.initializeActivityLog();
    expect(log.getActivities().total).toBe(0);
  });
});
