import { describe, it, expect, vi, afterEach } from 'vitest';
import { createCrashHandlers } from './crash.js';

// HLCE-312. The production incident: a fresh volume on ely-prod-01 was not
// writable, the backend died with an EACCES, and the uncaughtException handler
// then called audit() without a `result` — NOT NULL — so the handler crashed
// too. What surfaced was a SqliteError about a constraint, and the EACCES that
// actually caused the outage was buried above it.
//
// These tests drive the handlers with an audit sink that throws, which is what
// the old in-index.js handlers could not be tested for: they were registered
// inside `if (process.env.NODE_ENV !== 'test')`.

const EACCES = "EACCES: permission denied, open '/app/server/activity-data/audit-2026-08-12.jsonl'";

// Collects everything the handler reported, in order.
function recordingLogger() {
  const calls = [];
  return { calls, error: (event, fields) => calls.push({ event, ...fields }) };
}

// The audit sink as it behaved during the incident.
function constraintFailingAudit() {
  return vi.fn(() => {
    throw new Error('NOT NULL constraint failed: audit_events.result');
  });
}

// The exit is deliberately deferred so the log sinks can flush, so the tests
// drive the timer rather than racing it.
function setup({ audit = vi.fn(), logger = recordingLogger() } = {}) {
  vi.useFakeTimers();
  const exit = vi.fn();
  const handlers = createCrashHandlers({ logger, audit, exit, exitDelayMs: 100 });
  const runExitTimer = () => vi.advanceTimersByTime(100);
  return { handlers, logger, audit, exit, runExitTimer };
}

afterEach(() => { vi.useRealTimers(); });

describe('uncaught exception handler (HLCE-312)', () => {
  it('reports the original error, with its stack, before touching the audit log', () => {
    const { handlers, logger, audit } = setup();
    handlers.handleUncaughtException(new Error(EACCES));

    // The original error is the FIRST thing reported, not something that has to
    // survive a later step.
    expect(logger.calls[0].event).toBe('uncaught_exception');
    expect(logger.calls[0].message).toBe(EACCES);
    expect(logger.calls[0].stack).toContain('Error: EACCES: permission denied');
    // ...and it was reported before the audit write was attempted.
    expect(audit).toHaveBeenCalledTimes(1);
  });

  it('keeps the original error when the audit insert throws, and does not rethrow', () => {
    const audit = constraintFailingAudit();
    const { handlers, logger, exit, runExitTimer } = setup({ audit });

    // The handler must not throw: an exception raised inside an
    // uncaughtException handler is fatal and re-attributes the crash.
    expect(() => handlers.handleUncaughtException(new Error(EACCES))).not.toThrow();

    // AC3: the permission error is still named as the cause.
    expect(logger.calls[0]).toMatchObject({ event: 'uncaught_exception', message: EACCES });

    // The audit failure is reported as the secondary event it is — after the
    // original, clearly labelled, and NOT as 'uncaught_exception'.
    expect(logger.calls[1].event).toBe('audit_write_failed_during_crash');
    expect(logger.calls[1].message).toContain('NOT NULL constraint failed');

    // Nothing else replaced the original report.
    expect(logger.calls).toHaveLength(2);
    expect(logger.calls.filter(c => c.event === 'uncaught_exception')).toHaveLength(1);

    // AC4: the process still exits non-zero.
    runExitTimer();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('supplies a non-null result so the audit insert does not fail in the first place', () => {
    const { handlers, audit } = setup();
    handlers.handleUncaughtException(new Error(EACCES));

    const row = audit.mock.calls[0][0];
    // The column is NOT NULL; omitting it is the original bug.
    expect(row.result).toBe('error');
    expect(row.result).not.toBeNull();
    expect(row).toMatchObject({ event: 'process.uncaught_exception', actor: 'system' });
    // The crash detail now travels in `meta`, which audit() actually persists —
    // the old handler passed a top-level `message` key that audit() ignored, so
    // the reason never reached the row at all.
    expect(row.meta.message).toBe(EACCES);
  });

  it('still exits non-zero when the logger itself is broken', () => {
    // The incident was a filesystem permission error, and winston transports
    // write to that same filesystem. Losing the log must not cost the exit.
    const logger = { error: () => { throw new Error('log sink is gone'); } };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { handlers, exit, runExitTimer } = setup({ logger });

    expect(() => handlers.handleUncaughtException(new Error(EACCES))).not.toThrow();
    // Falls back to stderr so the original error is still visible.
    expect(spy.mock.calls.flat().join(' ')).toContain(EACCES);
    runExitTimer();
    expect(exit).toHaveBeenCalledWith(1);
    spy.mockRestore();
  });

  it('survives a thrown non-Error', () => {
    const { handlers, logger, exit, runExitTimer } = setup();
    expect(() => handlers.handleUncaughtException('just a string')).not.toThrow();
    expect(logger.calls[0].message).toBe('just a string');
    runExitTimer();
    expect(exit).toHaveBeenCalledWith(1);
  });
});

describe('unhandled rejection handler (HLCE-312)', () => {
  it('supplies a non-null result and survives a failing audit sink', () => {
    // AC5: the rejection handler had the same missing-`result` defect as the
    // exception handler.
    const audit = constraintFailingAudit();
    const { handlers, logger } = setup({ audit });

    expect(() => handlers.handleUnhandledRejection(new Error('boom'))).not.toThrow();
    expect(logger.calls[0]).toMatchObject({ event: 'unhandled_rejection', message: 'boom' });
    expect(logger.calls[1].event).toBe('audit_write_failed_during_crash');
  });

  it('records a non-null result on the audit row', () => {
    const { handlers, audit } = setup();
    handlers.handleUnhandledRejection(new Error('boom'));
    expect(audit.mock.calls[0][0]).toMatchObject({
      event: 'process.unhandled_rejection', actor: 'system', result: 'error',
    });
  });

  it('does not exit the process', () => {
    // Unchanged behaviour: only uncaughtException is fatal.
    const { handlers, exit } = setup();
    handlers.handleUnhandledRejection(new Error('boom'));
    expect(exit).not.toHaveBeenCalled();
  });
});

describe('audit row is actually insertable (HLCE-312 AC1)', () => {
  it('inserts against the real audit schema without a constraint error', async () => {
    // The unit tests above use a stub sink. This one drives the REAL audit()
    // against the real NOT NULL schema, which is what actually blew up.
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-crash-'));
    vi.resetModules();
    process.env.DB_PATH = ':memory:';
    process.env.DATA_DIR = tmp;
    process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');

    const { audit, initAudit } = await import('./audit.js');
    const { db } = await import('./db.js');
    initAudit();
    const handlers = createCrashHandlers({
      logger: recordingLogger(), audit, exit: vi.fn(), exitDelayMs: 0,
    });

    expect(() => handlers.handleUncaughtException(new Error(EACCES))).not.toThrow();

    const row = db.prepare(
      "SELECT event, actor, result, meta_json FROM audit_events WHERE event = 'process.uncaught_exception'"
    ).get();
    expect(row).toBeDefined();
    expect(row.result).toBe('error');
    expect(JSON.parse(row.meta_json).message).toBe(EACCES);

    fs.rmSync(tmp, { recursive: true, force: true });
    for (const k of ['DB_PATH', 'DATA_DIR', 'SECRET_ROOT']) delete process.env[k];
  });
});
