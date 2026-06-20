import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// initAudit() wires a winston DailyRotateFile transport whose async file writes
// race the temp-dir cleanup (ENOENT) and leak handles. Replace it with a no-op
// in-memory winston transport so initAudit + the audit() winston path stay
// covered without touching the filesystem.
vi.mock('winston-daily-rotate-file', async () => {
  const Transport = (await import('winston-transport')).default;
  return { default: class extends Transport { log(_info, cb) { if (cb) cb(); } } };
});

// HLCE-217: tamper-evident audit hash chain. audit.js imports the db singleton
// and resolves AUDIT_DIR at import, so each test resets modules and points
// DB_PATH at a fresh in-memory database + AUDIT_DIR at a throwaway dir.
let tmp;

async function loadAudit() {
  vi.resetModules();
  process.env.DB_PATH = ':memory:';
  process.env.DATA_DIR = tmp;
  process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
  process.env.AUDIT_DIR = path.join(tmp, 'audit');
  const audit = await import('./audit.js');
  const { db } = await import('./db.js');
  return { audit, db };
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-audit-'));
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const k of ['DB_PATH', 'DATA_DIR', 'SECRET_ROOT', 'AUDIT_DIR']) delete process.env[k];
});

describe('hash-chain build & verify (AC1)', () => {
  it('verifies a clean 3-event chain', async () => {
    const { audit } = await loadAudit();
    audit.initAudit();
    audit.audit({ actor: 'u', ip: '1.1.1.1', event: 'login.success', result: 'ok', meta: {} });
    audit.audit({ actor: 'u', ip: '1.1.1.1', event: 'audit.read', result: 'ok' });
    audit.audit({ actor: 'u', ip: '1.1.1.1', event: 'login.fail', result: 'fail' });
    expect(audit.verifyChain()).toEqual({ ok: true, rows: 3 });
  });

  it('detects a mutated row as row_hash_mismatch', async () => {
    const { audit, db } = await loadAudit();
    audit.initAudit();
    audit.audit({ actor: 'u', event: 'login.success', result: 'ok' });
    audit.audit({ actor: 'u', event: 'login.fail', result: 'fail' });

    // Tamper with a stored field without recomputing row_hash.
    db.prepare("UPDATE audit_events SET actor = 'attacker' WHERE id = 2").run();
    const v = audit.verifyChain();
    expect(v.ok).toBe(false);
    expect(v.kind).toBe('row_hash_mismatch');
    expect(v.brokenAt).toBe(2);
  });

  it('detects a corrupted prev_hash as prev_hash_mismatch', async () => {
    const { audit, db } = await loadAudit();
    audit.initAudit();
    audit.audit({ actor: 'u', event: 'login.success', result: 'ok' });
    audit.audit({ actor: 'u', event: 'login.fail', result: 'fail' });

    db.prepare("UPDATE audit_events SET prev_hash = ? WHERE id = 2").run('f'.repeat(64));
    const v = audit.verifyChain();
    expect(v.ok).toBe(false);
    expect(v.kind).toBe('prev_hash_mismatch');
    expect(v.brokenAt).toBe(2);
  });

  it('verifyChain reports ok with 0 rows on an empty chain', async () => {
    const { audit } = await loadAudit();
    audit.initAudit();
    expect(audit.verifyChain()).toEqual({ ok: true, rows: 0 });
  });
});

describe('meta redaction & event allowlist (AC2)', () => {
  it('recursively redacts secret-bearing keys in stored meta', async () => {
    const { audit } = await loadAudit();
    audit.initAudit();
    audit.audit({
      actor: 'u', event: 'login.success', result: 'ok',
      meta: {
        password: 'pw', token: 'tk', keep: 'visible',
        nested: { secret: 's', cookie: 'c', also: 'ok' },
        arr: [{ authorization: 'bearer x' }],
      },
    });
    const meta = JSON.parse(audit.getRecentAuditEvents(1)[0].meta_json);
    expect(meta).toMatchObject({
      password: '[REDACTED]', token: '[REDACTED]', keep: 'visible',
      nested: { secret: '[REDACTED]', cookie: '[REDACTED]', also: 'ok' },
      arr: [{ authorization: '[REDACTED]' }],
    });
  });

  it('eventAllowed gates the known alertable events', async () => {
    const { audit } = await loadAudit();
    expect(audit.eventAllowed('login.locked')).toBe(true);
    expect(audit.eventAllowed('totally.made.up')).toBe(false);
    expect(audit.eventAllowed(undefined)).toBe(false);
  });

  // PINNED BUG (regression marker, AC2): row_hash joins fields with `.join('')`
  // (no delimiter), so adjacent fields have ambiguous boundaries. Moving a
  // character across the actor/ip/event boundary keeps the concatenation — and
  // therefore the hash — identical, so verifyChain still PASSES on a tampered
  // row. A delimiter-based join would make these distinct; flip this assertion
  // (expect ok:false) once that fix lands.
  it('does NOT detect a boundary-ambiguous tamper (delimiter-less join bug)', async () => {
    const { audit, db } = await loadAudit();
    audit.initAudit();
    // ip omitted (hashes as ''), so actor + '' + event = 'ab' + '' + 'cd' = 'abcd'.
    audit.audit({ actor: 'ab', event: 'cd', result: 'ok' });
    // Shift one char from event into actor: 'abc' + '' + 'd' = 'abcd' — same concat.
    db.prepare("UPDATE audit_events SET actor = 'abc', event = 'd' WHERE id = 1").run();
    // The chain still verifies even though actor/event were changed.
    expect(audit.verifyChain().ok).toBe(true);
  });
});
