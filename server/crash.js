// Process-level crash handlers.
//
// By the time anything in here runs, something has already gone wrong, and the
// handler's only remaining job is to make sure the operator learns WHAT. It
// failed at exactly that once (HLCE-312): the uncaughtException handler wrote
// an audit row BEFORE logging the error, that insert threw on its own NOT NULL
// constraint, and the resulting SQLite stack buried the real fault — an EACCES
// on the activity-data volume — under an unrelated database error. The first
// diagnosis went looking at the database.
//
// Two rules follow from that, and both are load-bearing:
//
//   1. Report the original error, with its stack, FIRST and unconditionally.
//   2. Everything after that is best-effort and individually guarded. A failure
//      while recording the crash may add a line; it may never replace or
//      suppress the line above it.
//
// Rule 2 is not hypothetical: the audit sink writes to the same filesystem that
// may be the thing that just broke, so the recording step is a genuine
// candidate to fail during precisely the crashes that matter most.

// Errors are truncated before they reach a log sink or the audit meta. A crash
// stack is unbounded and the audit row is JSON in a SQLite column.
const MESSAGE_LIMIT = 500;
const STACK_LIMIT = 4000;

// `throw 'a string'` is legal, and a crash handler is the last place that should
// assume it got a well-formed Error.
function describe(err) {
  if (err instanceof Error) {
    return {
      message: (err.message || err.name || 'Error').slice(0, MESSAGE_LIMIT),
      stack: (err.stack || '').slice(0, STACK_LIMIT),
    };
  }
  return { message: String(err).slice(0, MESSAGE_LIMIT), stack: '' };
}

/**
 * Builds the uncaughtException / unhandledRejection handlers.
 *
 * Everything the handlers touch is injected so the crash path can be driven in
 * a test with a sink that throws — the case that caused HLCE-312 and that the
 * old in-index.js handlers could not be tested for at all.
 */
export function createCrashHandlers({ logger, audit, exit, onUncaught, onUnhandled, exitDelayMs = 100 }) {
  // The guaranteed floor. structuredLogger writes through winston transports,
  // which is itself I/O that can fail on a broken filesystem, so the original
  // error also goes to stderr directly if the structured write throws. Better
  // reported twice than lost once.
  function report(event, described) {
    try {
      logger.error(event, { message: described.message, stack: described.stack });
    } catch {
      console.error(`[${event}] ${described.message}\n${described.stack}`);
    }
  }

  // Best-effort. The caller has ALREADY reported the original error by the time
  // this runs, so a throw in here is logged as the secondary failure it is and
  // then dropped. It must never propagate: an exception thrown from inside an
  // uncaughtException handler is fatal and takes the process down with the
  // wrong error attached.
  function tryAudit(evt) {
    try {
      // `result` is NOT NULL in the audit schema. Omitting it is what turned a
      // crash report into a second crash (HLCE-312).
      audit({ actor: 'system', result: 'error', ...evt });
      return true;
    } catch (auditErr) {
      const described = describe(auditErr);
      report('audit_write_failed_during_crash', {
        message: described.message,
        stack: described.stack,
      });
      return false;
    }
  }

  function handleUncaughtException(err) {
    onUncaught?.();
    const described = describe(err);
    // FIRST, and outside every guard below.
    report('uncaught_exception', described);
    tryAudit({
      event: 'process.uncaught_exception',
      meta: { message: described.message, stack: described.stack.slice(0, MESSAGE_LIMIT) },
    });
    // Unchanged: a short delay so the log sinks can flush, then a non-zero exit.
    setTimeout(() => exit(1), exitDelayMs);
  }

  function handleUnhandledRejection(reason) {
    onUnhandled?.();
    const described = describe(reason);
    report('unhandled_rejection', described);
    tryAudit({
      event: 'process.unhandled_rejection',
      meta: { message: described.message, stack: described.stack.slice(0, MESSAGE_LIMIT) },
    });
  }

  return { handleUncaughtException, handleUnhandledRejection };
}
