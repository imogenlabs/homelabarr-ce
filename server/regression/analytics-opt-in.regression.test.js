import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Usage analytics go to PostHog and are on unless the operator sets
// ANALYTICS=off on the frontend container. The browser only ever talks to the
// dashboard's own address: nginx forwards /ingest/ to PostHog.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

describe('usage analytics', () => {
  const entry = read('docker-entrypoint.sh');
  const template = read('nginx.conf.template');

  it('index.html carries no analytics tag of its own', () => {
    expect(read('index.html')).not.toMatch(/analytics|posthog|data-website-id/i);
  });

  it('the nginx template proxies only to the backend and pulls analytics from the generated file', () => {
    const targets = [...template.matchAll(/proxy_pass\s+([^;]+);/g)].map((m) => m[1].trim());
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) expect(t).toBe('$backend');
    expect(template).toContain('include /etc/nginx/conf.d/analytics*.inc;');
  });

  it('is on by default and ANALYTICS=off writes nothing', () => {
    expect(entry).toContain(': "${ANALYTICS:=on}"');
    expect(entry).toMatch(/rm -f "\$ANALYTICS_CONF"\ncase "\$ANALYTICS" in\n {2}off\|false\) echo "Usage analytics off"/);
    expect(entry).toContain('FATAL: ANALYTICS must be on or off');
  });

  it('refuses a key or host that could break out of the nginx config', () => {
    expect(entry).toContain('FATAL: POSTHOG_KEY must look like phc_');
    expect(entry).toContain('FATAL: POSTHOG_HOST must look like https://us.i.posthog.com');
  });

  // A literal hostname in proxy_pass is resolved when nginx starts, so a host
  // with no DNS would never bring the dashboard up. A variable is resolved per
  // request, through the container's own resolver.
  it('resolves PostHog per request, never at start', () => {
    expect(entry).toContain("awk '$1 == \"nameserver\" { print $2; exit }' /etc/resolv.conf");
    expect(entry).toMatch(/resolver \$\{RESOLVER\} valid=300s ipv6=off;/);
    expect(entry).toMatch(/set \\\$posthog \$\{POSTHOG_HOST\};/);
    expect(entry).toMatch(/proxy_pass \\\$posthog;/);
    expect(entry).not.toMatch(/proxy_pass https?:\/\//);
  });

  it('keeps the browser and PostHog from learning more than the event', () => {
    expect(entry).toContain('location ^~ /ingest/');
    expect(entry).toContain('proxy_set_header Cookie "";');
    expect(entry).toContain('proxy_set_header X-Forwarded-For "";');
    expect(entry).toContain('proxy_hide_header Set-Cookie;');
  });

  it('has no trace of the earlier Umami setup', () => {
    expect(entry).not.toMatch(/ANALYTICS_URL|ANALYTICS_WEBSITE_ID|umami|analytics\.js|\/api\/send/i);
    expect(template).not.toMatch(/ANALYTICS_URL|ANALYTICS_WEBSITE_ID/);
  });
});
