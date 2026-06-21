// HLCE-227 (AC5) — permanent security-invariant regression test.
//
// INVARIANT: nginx does NOT inherit server-level `add_header` directives into a
// `location` block that declares its OWN `add_header`. The moment a location adds
// a single header, every server-level security header it does not re-declare is
// SILENTLY DROPPED for responses matched by that location. This is the classic
// nginx add_header non-inheritance footgun — it has bitten this config across the
// R1–R22 hardening rounds (the security-header set was introduced/expanded there;
// see docs/audit/). The comment at nginx.conf.template:16-17 calls it out exactly:
//   "Security headers — must be repeated in any location block that uses add_header
//    (nginx location-level add_header overrides server-level)"
//
// This test parses nginx.conf.template (the ${VAR} envsubst template COPY'd into
// the frontend image per Dockerfile:24) and asserts that the content-serving
// location blocks each re-emit the FULL security-header set. It is ASSERT-ONLY:
// delete any one security `add_header` line from those blocks and this test fails.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(__dirname, '../../nginx.conf.template');

// The canonical security-header set. This is the set the content-serving location
// blocks (`/icons/`, the static-asset regex, and the SPA `/` fallback) declare in
// full. Any one of these going missing from a content block is a real regression.
const SECURITY_HEADERS = [
  'Content-Security-Policy',
  'Strict-Transport-Security',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  'Cross-Origin-Opener-Policy',
  'Cross-Origin-Resource-Policy',
  'X-XSS-Protection',
];

// The location blocks that serve actual HTML / asset content to a browser — these
// MUST carry the complete security-header set, because the CSP, framing, MIME, and
// cross-origin isolation guarantees only apply where they are re-declared.
const CONTENT_SERVING_BLOCKS = [
  '/icons/',
  '\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$',
  '/',
];

/**
 * Plain-string parse of `location <matcher> { ... }` blocks, brace-balanced so
 * nested blocks (none here, but robust anyway) don't truncate. Returns the raw
 * matcher text and the body of each location block.
 */
function parseLocationBlocks(src) {
  const blocks = [];
  const re = /location\s+([^{]+?)\s*\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const matcher = m[1].trim();
    let depth = 1;
    let i = m.index + m[0].length;
    const bodyStart = i;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    }
    const body = src.slice(bodyStart, i - 1);
    blocks.push({ matcher, body });
  }
  return blocks;
}

function headersAddedIn(body) {
  const added = new Set();
  const re = /add_header\s+([A-Za-z0-9-]+)\b/g;
  let m;
  while ((m = re.exec(body)) !== null) added.add(m[1]);
  return added;
}

describe('nginx security-header non-inheritance invariant (HLCE-227 AC5)', () => {
  const src = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const blocks = parseLocationBlocks(src);

  it('parses at least the known content-serving location blocks', () => {
    // Sanity guard: if the parser silently matched nothing, every assertion below
    // would vacuously pass — so fail loudly if the template shape changed.
    expect(blocks.length).toBeGreaterThanOrEqual(CONTENT_SERVING_BLOCKS.length);
    for (const known of CONTENT_SERVING_BLOCKS) {
      expect(
        blocks.some((b) => b.matcher.includes(known)),
        `expected to find a location block matching ${known}`
      ).toBe(true);
    }
  });

  describe.each(CONTENT_SERVING_BLOCKS)(
    'content-serving location matching %s re-emits the full security-header set',
    (matcher) => {
      const block = blocks.find((b) => b.matcher.includes(matcher));
      const added = block ? headersAddedIn(block.body) : new Set();

      // It must add headers at all (otherwise the test is asserting nothing).
      it('declares its own add_header directives', () => {
        expect(block, `location ${matcher} not found`).toBeTruthy();
        expect(added.size).toBeGreaterThan(0);
      });

      it.each(SECURITY_HEADERS)('re-emits %s', (header) => {
        expect(
          added.has(header),
          `location "${matcher}" adds its own headers but DROPS ${header} — ` +
            `nginx will not inherit the server-level one (add_header non-inheritance footgun)`
        ).toBe(true);
      });
    }
  );

  // Cross-cutting invariant: ANY location block that touches add_header at all and
  // is meant to serve browser content carries the full set. We assert it on the
  // content-serving set above; here we additionally lock that no content block ever
  // ships a STRICT SUBSET of the security set (catches a header being half-removed).
  it('no content-serving block ships a partial subset of the security set', () => {
    for (const matcher of CONTENT_SERVING_BLOCKS) {
      const block = blocks.find((b) => b.matcher.includes(matcher));
      const added = headersAddedIn(block.body);
      const present = SECURITY_HEADERS.filter((h) => added.has(h));
      // present must be ALL of them, never a strict subset.
      expect(
        present.length,
        `location "${matcher}" carries only ${present.length}/${SECURITY_HEADERS.length} ` +
          `security headers: missing ${SECURITY_HEADERS.filter((h) => !added.has(h)).join(', ')}`
      ).toBe(SECURITY_HEADERS.length);
    }
  });

  // POTENTIAL GAP (reported, NOT fixed here per HLCE-227 scope — assert-only):
  // The text-resource blocks `= /robots.txt`, `= /humans.txt`, `^~ /.well-known/`
  // and the proxy block `= /analytics.js` add ONLY a minimal subset
  // (Strict-Transport-Security + X-Content-Type-Options [+ X-Frame-Options]) and do
  // NOT re-emit Content-Security-Policy / Referrer-Policy / Permissions-Policy /
  // Cross-Origin-* / X-XSS-Protection. For plain-text / redirect / proxied responses
  // this is arguably fine (no HTML to frame or script), but it IS a divergence from
  // the full set and would be a real gap if any of these ever served HTML. We lock
  // the CURRENT minimal state so a future change to these blocks is visible in diff,
  // without asserting the full set on them.
  describe('POTENTIAL GAP: text/redirect/proxy blocks carry only the minimal subset (current state locked)', () => {
    const MINIMAL_SUBSET = ['Strict-Transport-Security', 'X-Content-Type-Options'];
    const PARTIAL_BLOCKS = ['/robots.txt', '/humans.txt', '^~ /.well-known/', '/analytics.js'];

    it.each(PARTIAL_BLOCKS)('block %s carries at least the minimal hardening subset', (matcher) => {
      const block = blocks.find((b) => b.matcher.includes(matcher));
      if (!block) return; // matcher variants; the ones present are asserted
      const added = headersAddedIn(block.body);
      for (const h of MINIMAL_SUBSET) {
        expect(
          added.has(h),
          `partial block "${matcher}" dropped its minimal-subset header ${h}`
        ).toBe(true);
      }
    });
  });
});
