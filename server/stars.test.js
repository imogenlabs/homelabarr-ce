import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-221: starred-apps store. stars.js resolves STARS_FILE at import and does
// a full-file read-modify-write with no locking, so each test resets modules and
// points STARS_FILE at a throwaway file.
let tmp, starsFile;

async function loadStars() {
  vi.resetModules();
  process.env.STARS_FILE = starsFile;
  return import('./stars.js');
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-stars-'));
  starsFile = path.join(tmp, 'stars.json');
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
  delete process.env.STARS_FILE;
});

describe('stars add/remove/dedupe round-trip (AC2)', () => {
  it('adds, dedupes, and persists across a reload', async () => {
    let stars = await loadStars();
    expect(stars.getUserStars('u1')).toEqual([]);

    expect(stars.addStar('u1', 'plex')).toEqual(['plex']);
    expect(stars.addStar('u1', 'radarr')).toEqual(['plex', 'radarr']);
    // Adding the same app again is a no-op (deduped).
    expect(stars.addStar('u1', 'plex')).toEqual(['plex', 'radarr']);

    // Persisted to disk and isolated per user.
    expect(fs.existsSync(starsFile)).toBe(true);
    expect(stars.getUserStars('u2')).toEqual([]);

    // A fresh import (simulated restart) sees the same data.
    stars = await loadStars();
    expect(stars.getUserStars('u1')).toEqual(['plex', 'radarr']);
  });

  it('removes apps and drops the user key when the last star is removed', async () => {
    const stars = await loadStars();
    stars.addStar('u1', 'plex');
    stars.addStar('u1', 'radarr');

    expect(stars.removeStar('u1', 'plex')).toEqual(['radarr']);
    // Removing a non-existent app is a no-op.
    expect(stars.removeStar('u1', 'ghost')).toEqual(['radarr']);
    // Removing the last app empties the user.
    expect(stars.removeStar('u1', 'radarr')).toEqual([]);
    // removeStar for an unknown user returns [].
    expect(stars.removeStar('nobody', 'plex')).toEqual([]);

    const reloaded = await loadStars();
    expect(reloaded.getUserStars('u1')).toEqual([]);
  });

  it('degrades a corrupt stars.json to empty without throwing (documented as destructive)', async () => {
    fs.writeFileSync(starsFile, '{ this is not valid json');
    const stars = await loadStars();
    // Read path swallows the parse error and returns empty.
    expect(stars.getUserStars('u1')).toEqual([]);
    // Destructive contract: the next write silently overwrites the corrupt file,
    // so the unreadable prior contents are lost rather than recovered.
    expect(stars.addStar('u1', 'plex')).toEqual(['plex']);
    expect(JSON.parse(fs.readFileSync(starsFile, 'utf8'))).toEqual({ u1: ['plex'] });
  });
});

describe('lost-update race — regression marker (AC4)', () => {
  it('two writers that read the same snapshot lose the earlier write', async () => {
    const stars = await loadStars();
    stars.addStar('u1', 'plex'); // baseline on disk: { u1: ['plex'] }

    // Simulate two "concurrent" writers: both read the same pre-race snapshot
    // (no locking / no re-read before save), each appends its own app, and the
    // later save overwrites the earlier — so 'radarr' is silently lost.
    const snapshot = fs.readFileSync(starsFile, 'utf8');
    const spy = vi.spyOn(fs, 'readFileSync').mockReturnValue(snapshot);

    stars.addStar('u1', 'radarr'); // writer A: writes ['plex','radarr']
    stars.addStar('u1', 'sonarr'); // writer B: read same stale snapshot → writes ['plex','sonarr']

    spy.mockRestore();

    // The on-disk result kept only writer B's append; writer A's 'radarr' is gone.
    const finalState = JSON.parse(fs.readFileSync(starsFile, 'utf8'));
    expect(finalState.u1).toEqual(['plex', 'sonarr']);
    expect(finalState.u1).not.toContain('radarr');
  });
});
