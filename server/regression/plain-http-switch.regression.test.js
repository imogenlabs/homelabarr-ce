// #622 — ALLOW_PLAIN_HTTP is the only way to turn off HSTS and the CSP
// upgrade-insecure-requests directive. These checks lock the defaults: the
// entrypoint must render both unless the operator explicitly opts out.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const template = fs.readFileSync(path.join(root, 'nginx.conf.template'), 'utf8');
const entrypoint = fs.readFileSync(path.join(root, 'docker-entrypoint.sh'), 'utf8');

// Minimal envsubst: replace only the listed ${VAR}s, like the entrypoint does.
function render(vars) {
  return template.replace(/\$\{([A-Z_]+)\}/g, (m, name) => (name in vars ? vars[name] : m));
}

function branch(label) {
  const m = entrypoint.match(new RegExp(`^\\s*${label}\\)\\n([\\s\\S]*?);;`, 'm'));
  if (!m) throw new Error(`no ${label}) branch in docker-entrypoint.sh`);
  const vars = {};
  for (const [, k, v] of m[1].matchAll(/^\s*([A-Z_]+)="([^"]*)"/gm)) vars[k] = v;
  return vars;
}

describe('ALLOW_PLAIN_HTTP switch (#622)', () => {
  it('defaults to false in the entrypoint and compose', () => {
    expect(entrypoint).toMatch(/: "\$\{ALLOW_PLAIN_HTTP:=false\}"/);
    const compose = fs.readFileSync(path.join(root, 'homelabarr.yml'), 'utf8');
    expect(compose.match(/ALLOW_PLAIN_HTTP=\$\{ALLOW_PLAIN_HTTP:-false\}/g)).toHaveLength(2);
  });

  it('envsubst renders the switch variables', () => {
    expect(entrypoint).toMatch(/envsubst '[^']*\$\{HSTS_HEADER\}[^']*'/);
    expect(entrypoint).toMatch(/envsubst '[^']*\$\{CSP_UPGRADE_INSECURE\}[^']*'/);
  });

  it('the default render sends full HSTS and upgrade-insecure-requests', () => {
    const out = render({ BACKEND_URL: 'http://backend:8092', ...branch('false') });
    expect(out).toContain('set $hsts "max-age=63072000; includeSubDomains; preload";');
    expect(out).toMatch(/set \$csp "[^"]*object-src 'none'; upgrade-insecure-requests; report-to/);
    expect(out).not.toMatch(/\$\{[A-Z_]+\}/);
  });

  it('every HSTS header goes through $hsts', () => {
    const lines = template.split('\n').filter((l) => /add_header\s+Strict-Transport-Security/.test(l));
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(l.trim()).toBe('add_header Strict-Transport-Security $hsts always;');
  });

  it('the opt-out render drops HSTS and the upgrade directive', () => {
    const out = render({ BACKEND_URL: 'http://backend:8092', ...branch('true') });
    expect(out).toContain('set $hsts "";');
    expect(out.replace(/^\s*#.*$/gm, '')).not.toContain('upgrade-insecure-requests');
  });

  it('rejects anything other than true/false', () => {
    expect(entrypoint).toMatch(/\*\) echo "FATAL: ALLOW_PLAIN_HTTP must be true or false"; exit 1 ;;/);
  });
});
