import winston from 'winston';
import { randomUUID } from 'node:crypto';

// Single source of truth for sensitive header/field names, shared with the
// encrypted audit sink (audit.js imports this). audit.js previously used a
// narrower list anchored on `token` and missed refresh_token/access_token, so
// the persistent sink leaked them; keeping one merged superset here closes that
// gap (HLCE-282). Anchored ^...$ so substrings ("passwordHint") are not redacted.
export const REDACT_KEYS = /^(authorization|cookie|set-cookie|password|passcode|secret|token|jwt_secret|refresh_token|access_token|api_key|x-api-key|x-csrf-token)$/i;

function deepRedact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepRedact);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = REDACT_KEYS.test(k) ? '[REDACTED]' : deepRedact(v);
  }
  return out;
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp(),
    winston.format(info => { if (info.meta) info.meta = deepRedact(info.meta); return info; })(),
    process.env.LOG_FORMAT === 'pretty'
      ? winston.format.printf(i => `${i.timestamp} ${i.level.toUpperCase()} ${i.message} ${JSON.stringify(i.meta || {})}`)
      : winston.format.json()
  ),
  defaultMeta: { service: 'homelabarr-backend' },
  transports: [new winston.transports.Console({ stderrLevels: ['error'] })],
});

export function requestContext(req, res, next) {
  const rid = req.headers['x-request-id'] || randomUUID();
  req.rid = rid;
  req.log = logger.child({ rid, ip: req.ip, method: req.method, path: req.path });
  res.setHeader('X-Request-Id', rid);
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number((process.hrtime.bigint() - t0) / 1000000n);
    req.log.info('http.req', { meta: { status: res.statusCode, ms } });
  });
  next();
}
