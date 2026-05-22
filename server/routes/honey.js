import { audit } from '../audit.js';

const HONEY_PATHS = [
  '/.env', '/.env.local', '/.env.production',
  '/.git/config', '/.git/HEAD',
  '/.aws/credentials', '/.ssh/id_rsa',
  '/wp-login.php', '/wp-admin', '/xmlrpc.php',
  '/phpmyadmin', '/phpMyAdmin',
  '/admin.php', '/administrator', '/manager/html',
  '/shell.php', '/cmd.jsp', '/c99.php',
  '/latest/meta-data', '/computeMetadata/v1',
];

function honeyHandler(req, res) {
  try {
    audit({
      actor: req.user?.username || 'anon',
      ip: req.ip,
      event: 'honey.hit',
      result: 'blocked',
      target: req.originalUrl,
      meta: {
        mitre_tid: 'T1595.002',
        mitre_tactic: 'TA0043',
        ua: (req.get('user-agent') || '').slice(0, 200),
        method: req.method,
      },
    });
  } catch {}
  res.status(404).type('text/plain').send('Not Found');
}

export function mountHoney(app) {
  // Backend-reachable honey paths (nginx strips /api/ prefix, so these are relative)
  ['/admin/legacy-debug', '/admin/debug', '/_admin', '/_internal/debug'].forEach(p => app.all(p, honeyHandler));
  // Root-level paths only work if nginx proxies them through — currently nginx handles these directly
  // HONEY_PATHS are documented for operators running without nginx (direct Express)
  HONEY_PATHS.forEach(p => app.all(p, honeyHandler));
}
