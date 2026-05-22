const SIGNATURES = [
  { match: ctx => ctx.path === '/auth/login' && ctx.status === 429, tid: 'T1110.001', tactic: 'TA0006' },
  { match: ctx => ctx.path === '/auth/login' && ctx.status === 401, tid: 'T1078', tactic: 'TA0001' },
  { match: ctx => /^\/(\.env|\.git|\.aws|\.ssh)/.test(ctx.path), tid: 'T1595.002', tactic: 'TA0043' },
  { match: ctx => /wp-login|phpmyadmin|admin\.php|xmlrpc\.php/.test(ctx.path), tid: 'T1595.002', tactic: 'TA0043' },
  { match: ctx => ctx.path.startsWith('/auth') && ctx.status === 401, tid: 'T1606.001', tactic: 'TA0006' },
  { match: ctx => ctx.path.includes('..') || /%2e%2e/i.test(ctx.originalPath), tid: 'T1083', tactic: 'TA0007' },
  { match: ctx => ctx.method !== 'GET' && ctx.status === 403, tid: 'T1190', tactic: 'TA0001' },
];

export function attackTag(req, res, next) {
  res.on('finish', () => {
    try {
      const ctx = {
        path: req.path,
        originalPath: req.originalUrl,
        method: req.method,
        status: res.statusCode,
      };
      for (const sig of SIGNATURES) {
        if (sig.match(ctx)) {
          req.mitre_tid = sig.tid;
          req.mitre_tactic = sig.tactic;
          break;
        }
      }
    } catch {}
  });
  next();
}
