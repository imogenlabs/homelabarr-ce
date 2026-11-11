import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// HLCE-389: a self-hosted dashboard sends usage data nowhere unless its owner
// sets ANALYTICS_URL and ANALYTICS_WEBSITE_ID. Before, every install loaded the
// project's analytics script and proxied page views to the project's server.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

describe('usage analytics are opt-in (HLCE-389)', () => {
  it('index.html loads no analytics script', () => {
    expect(read('index.html')).not.toMatch(/analytics|data-website-id/i);
  });

  it('the nginx template proxies only to the backend, and pulls analytics from the opt-in file', () => {
    const template = read('nginx.conf.template');
    const targets = [...template.matchAll(/proxy_pass\s+([^;]+);/g)].map((m) => m[1].trim());
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) expect(t).toBe('$backend');
    expect(template).toContain('include /etc/nginx/conf.d/analytics*.inc;');
  });

  it('the entrypoint writes the analytics file only when both settings are given', () => {
    const entry = read('docker-entrypoint.sh');
    expect(entry).toMatch(/rm -f "\$ANALYTICS_CONF"\nif \[ -n "\$\{ANALYTICS_URL\}\$\{ANALYTICS_WEBSITE_ID\}" \]; then/);
    expect(entry).toContain('FATAL: ANALYTICS_URL must look like https://analytics.example.com');
    expect(entry).toContain('FATAL: ANALYTICS_WEBSITE_ID must be the Umami website id');
  });
});
