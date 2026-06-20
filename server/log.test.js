import { describe, it, expect, afterEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import Transport from 'winston-transport';
import { logger, requestContext } from './log.js';

// HLCE-217: structured logger redaction + request context. Capturing the
// Console transport's stdout is timing-flaky, so attach an in-memory winston
// transport: it receives each `info` AFTER the logger's format pipeline (so meta
// is already redacted and Symbol.for('message') holds the final JSON line).
const MESSAGE = Symbol.for('message');

function withCapture(fn) {
  const records = [];
  class Capture extends Transport {
    log(info, cb) { records.push(info); if (cb) cb(); }
  }
  const cap = new Capture();
  logger.add(cap);
  try { fn(); } finally { logger.remove(cap); }
  return records;
}

afterEach(() => vi.restoreAllMocks());

describe('logger meta redaction (AC3)', () => {
  it('recursively masks secret-bearing meta keys', () => {
    const recs = withCapture(() => logger.info('test.event', {
      meta: {
        password: 'pw', authorization: 'Bearer x', keep: 'visible',
        nested: { refresh_token: 'r', access_token: 'a', also: 'ok' },
      },
    }));
    expect(recs).toHaveLength(1);
    expect(recs[0].meta).toMatchObject({
      password: '[REDACTED]', authorization: '[REDACTED]', keep: 'visible',
      nested: { refresh_token: '[REDACTED]', access_token: '[REDACTED]', also: 'ok' },
    });
    // The serialized line carries the redactions too (no plaintext secret leaks).
    expect(recs[0][MESSAGE]).not.toContain('Bearer x');
  });
});

describe('requestContext log-injection resistance (AC3)', () => {
  it('a newline-laden x-request-id cannot forge a second log record', () => {
    const recs = withCapture(() => {
      const req = {
        headers: { 'x-request-id': 'evil\n{"level":"info","message":"forged"}' },
        ip: '1.2.3.4', method: 'GET', path: '/',
      };
      const res = new EventEmitter();
      res.setHeader = () => {};
      res.statusCode = 200;
      requestContext(req, res, () => {});
      res.emit('finish'); // triggers the http.req log
    });

    // Exactly one record; the injected JSON is escaped inside the rid string.
    expect(recs).toHaveLength(1);
    const line = recs[0][MESSAGE];
    expect(line.split('\n')).toHaveLength(1);       // newline escaped, not a real break
    const parsed = JSON.parse(line);
    expect(parsed.message).toBe('http.req');
    expect(parsed.rid).toContain('forged');         // present as literal data
    expect(parsed.message).not.toBe('forged');      // not a forged record
  });

  it('generates an X-Request-Id when the header is absent', () => {
    let header;
    const res = new EventEmitter();
    res.setHeader = (k, v) => { if (k === 'X-Request-Id') header = v; };
    res.statusCode = 200;
    requestContext({ headers: {}, ip: '1.1.1.1', method: 'GET', path: '/' }, res, () => {});
    expect(header).toMatch(/[0-9a-f-]{36}/); // a generated UUID
  });
});
