# Round 17 — Public-disclosure surface audit (the outside view)

**Target:** `smashingtags/homelabarr-ce` @ main `7b2954e2c1` (== dev, R16 merged 2026-05-23T02:46:33Z)
**Live:** https://ce-demo.homelabarr.com/
**Date:** 2026-05-23
**Scope:** R1–R16 built and proved a strong inside view of the security posture. R17 asks the inverse question: **what does the outside world see, before they need to ask?** Unauthenticated HTTP probes of the SPA origin plus public surface area on GitHub (security advisories config, npm/GHCR metadata, robots/sitemap, meta tags, security.txt, change-password well-known). Mostly small finishes that, taken together, change how a researcher, search engine, or scanner perceives the project.
**Method:** Passive HTTP recon already performed. Spec-only. **No live exploitation.**

---

## §0 — Verification of R16 (carry-forward)

| # | R16 spec item | Live state (main @ 7b2954e2c1) | Verdict |
|---|---|---|---|
| 1 | `compliance/build-binder.sh` exists, invokes collect-evidence + renderers + manifest + zip | All 7 expected operations present in script. | CLEAN |
| 2 | `compliance/render-binder-index.cjs` produces HTML with 4 live panels (R5 cosign, R6 audit chain, R12 SLO, R15 staleness) | All 4 panel references present in script. | CLEAN |
| 3 | `compliance/render-attestation.cjs` produces JSON with git_sha, build_time, evidence_files, stack | All 4 fields present. | CLEAN |
| 4 | `compliance/test-binder-reproducibility.sh` builds twice and diffs | Script invokes build-binder twice. | CLEAN |
| 5 | `.github/workflows/compliance-binder.yml` SHA-pinned + workflow_dispatch + monthly cron + cosign signing | All `uses:` SHA-pinned (40-char). | CLEAN |
| 6 | `compliance/collect-evidence.sh` extended with R12 SLO + R15 staleness sections | Both `R12-slo-snapshot` and `R15-dep-staleness` references present. | CLEAN |
| 7 | `Makefile` with compliance-binder / evidence / verify targets | All 3 targets present. | CLEAN |
| 8 | `.gitignore` extended for `compliance/dist/` | Present. | CLEAN |
| 9 | CIS binder cross-linked to dependency-update-policy + PB-11 + PB-08 (R15 carry resolution) | Verified at correct path `compliance/cis-docker-v1.6.0.md`. All three links present (2x each). My prior spec used `cis-controls-v8.1.md` — that was my filename error, not a drift on the ship side. | CLEAN |
| 10 | Audit index has R16 row | Present. | CLEAN |
| 11 | R16 archive present | Present. | CLEAN |

**R16 ship verdict:** 11 of 11 clean. **Fully clean ship** — second clean round in a row (after R14). Zero carry-forwards into R17.

**Self-correction note:** my R15 and R16 specs referenced `compliance/cis-controls-v8.1.md` as the CIS binder filename. The actual filename shipped in R11 was `compliance/cis-docker-v1.6.0.md`. The agent correctly applied the changes to the real file regardless. Going forward all references should use `cis-docker-v1.6.0.md`. Folded into R17 INFO-1.

---

## §1 — Goal of R17

After 16 rounds, the *internal* security artifact is comprehensive. The *external* surface is thin. The goal of R17 is to make the outside view match the inside view, so that:

1. A security researcher hitting the site can find disclosure contact in three places (security.txt, SECURITY.md, GitHub Security tab) — all consistent.
2. A search engine indexing the site honors explicit `robots` directives appropriate to a demo (i.e. don't index the live API surface, do index the marketing/docs pages if any).
3. A scanner running automated checks finds the well-knowns it expects (`change-password`, `security.txt`) at conformant URIs.
4. A GitHub visitor sees private vulnerability reporting enabled and the security advisories tab populated with the disclosure policy from R14.
5. A package consumer (GHCR pull or npm-link reading) finds correct metadata (license, repo, security contact).
6. The hard-coded analytics website-ID in HTML is intentional and documented (or removed).
7. The legacy `/security.txt` path either 301s to `/.well-known/security.txt` or is removed.

---

## §2 — Current state (from live recon at `7b2954e2c1`)

**Good — already shipped:**
- `/.well-known/security.txt` returns valid RFC 9116 (Contact, Expires 2027-01-01, Preferred-Languages, Canonical, Policy → SECURITY.md). 317B, `text/plain`. This was likely added quietly during R14 SECURITY.md or earlier; either way, it's correct.
- Security headers solid: CSP with self-only sources + report endpoints, HSTS present, X-Frame-Options DENY, X-Content-Type-Options nosniff, Permissions-Policy restrictive.
- `SECURITY.md` at repo root with reporting / disclosure / IR sections (R14 ship).

**Gaps — outside view doesn't match inside posture:**

- **`/security.txt`** (legacy non-well-known path) returns the SPA `index.html` (200, text/html). Scanners checking the legacy path either get a misleading 200 or never find the real file. RFC 9116 §3 says the file MUST live at `/.well-known/security.txt`; the legacy path SHOULD either 301 to the well-known location or 404.
- **`/robots.txt`** returns 403. SPA didn't ship one. Without it, search engines fall back to "crawl everything," which on a demo with `/api/*` and admin routes is wrong.
- **`/sitemap.xml`** returns 403. Same shape as robots — not necessarily a problem on its own, but combined with no robots and no meta robots tag, the bot guidance is inconsistent.
- **`/humans.txt`** returns SPA index. Either populate (low-cost team credit) or remove (one less 200 on a non-content path).
- **Homepage HTML has 2 meta tags**: `<meta charset>` and `<meta viewport>`. **No description, no robots, no Open Graph, no canonical, no theme-color.** Search/social previews will be ugly; bot guidance is absent.
- **No `X-Robots-Tag` header** to compensate for missing meta robots.
- **`<script defer src="/analytics.js" data-website-id="7f290439-...">`** is hard-coded in HTML. The website-ID is now public (it was always going to be — that's how Umami works — but it's worth documenting deliberately rather than treating it as an inadvertent disclosure).
- **GitHub security advisories config:** not visible from outside; need to confirm "Private vulnerability reporting" is ON at `Settings → Security → Private vulnerability reporting` (owner-only check).
- **`package.json` / `Dockerfile` LABEL`s:** not yet probed for security/repo/license metadata correctness.
- **`/.well-known/change-password`** (RFC 8615 + RFC 8959): not implemented. Browsers and password managers expect this to redirect to the change-password UI for credential-rotation flows. Without it, password managers can't deep-link users to the change-password screen.
---

## §3 — Findings

### INFO-1 (R16-meta) — Standardize CIS binder filename references

**Note:** R15 and R16 spec docs referenced `compliance/cis-controls-v8.1.md`. The actual file shipped in R11 is `compliance/cis-docker-v1.6.0.md`. The agent correctly applied changes to the real file in both rounds. This is informational only — no action needed beyond using the correct filename in future specs.

**Going forward:** all references should use `compliance/cis-docker-v1.6.0.md`. (CIS Docker Benchmark v1.6.0 is the right standard for a Docker-stack demo anyway; CIS Controls v8.1 is the org-level framework and wasn't what R11 actually shipped.)

---

### H-1 — Legacy `/security.txt` path serves SPA HTML instead of redirecting

**File:** `nginx/nginx.conf` (or whichever nginx config the deploy uses)

**Current (WRONG):**
```
GET /security.txt → 200 text/html (SPA index.html)
```

A scanner or researcher checking the legacy path either gets HTML (and silently fails to find a real disclosure contact) or follows the link and assumes the project has no security policy.

**Required (RIGHT) — either 301 redirect or 404:**

```nginx
# In server { } block, before the SPA fallback location:
location = /security.txt {
    return 301 /.well-known/security.txt;
}
```

**Acceptance:** `curl -sI https://ce-demo.homelabarr.com/security.txt` returns `HTTP/2 301` with `location: /.well-known/security.txt`. Same shape for any other legacy disclosure path (e.g. `/.security`).

---

### H-2 — `/robots.txt` missing → search engines crawl everything

**File:** `nginx/nginx.conf` and/or `public/robots.txt`

**Current (WRONG):** `/robots.txt` returns 403. With no meta robots tag and no X-Robots-Tag header, indexing behavior is undefined.

**Required (RIGHT) — explicit robots policy for a demo:**

```
# public/robots.txt
User-agent: *
Disallow: /api/
Disallow: /admin/
Disallow: /.well-known/change-password
Allow: /
Allow: /.well-known/security.txt

Sitemap: https://ce-demo.homelabarr.com/sitemap.xml
```

Plus nginx serves it at `/robots.txt` with `text/plain`:

```nginx
location = /robots.txt {
    add_header Content-Type text/plain;
    try_files /robots.txt =404;
}
```

**Acceptance:** `curl -s https://ce-demo.homelabarr.com/robots.txt` returns 200 `text/plain` with the directives above.

---

### H-3 — Homepage HTML missing essential meta tags

**File:** `index.html` (Vite entry — likely `/index.html` at repo root or `/public/index.html`)

**Current (verified live):** only `charset` and `viewport`. No description, no robots, no canonical, no theme-color, no OG.

**Required (RIGHT) — add these inside `<head>`:**

```html
<meta name="description" content="HomelabARR CE — self-hosted homelab orchestration. Community Edition demo.">
<meta name="robots" content="noindex, nofollow">  <!-- demo only; production marketing site would use 'index, follow' -->
<link rel="canonical" href="https://ce-demo.homelabarr.com/">
<meta name="theme-color" content="#0969da">

<!-- Open Graph (for link unfurling in chat/social) -->
<meta property="og:title" content="HomelabARR CE">
<meta property="og:description" content="Self-hosted homelab orchestration — community edition demo.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://ce-demo.homelabarr.com/">

<!-- Security-relevant meta (defensive) -->
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests"> <!-- belt-and-suspenders with the header CSP -->
```

The `noindex, nofollow` on the demo origin is the right call: search-engine traffic on a demo is noise, and the API surface should never be indexed. The marketing site (whenever there is one) would override per-page.

**Acceptance:** `curl -s https://ce-demo.homelabarr.com/ | grep -E 'meta name="description"|meta name="robots"|rel="canonical"'` finds all three.

---

### H-4 — GitHub security advisories config not auditable from outside

**Owner action required — but specced here:**

In `Settings → Code security and analysis`, confirm:

- **Private vulnerability reporting:** ON. (Lets researchers file private advisories via GitHub UI; complements the SECURITY.md mailto.)
- **Dependabot alerts:** ON. (Confirmed implicitly by the 25 open vulns the owner mentioned in R15 ship.)
- **Dependabot security updates:** ON. (Auto-PRs for security-flagged vulns.)
- **Code scanning (CodeQL):** consider enabling if not on. Free for public repos. One additional R-round-level signal at zero cost.
- **Secret scanning + push protection:** ON. (Prevents committing secrets to the repo.)

**File for agent (new):** `docs/governance/github-security-settings.md` documenting which settings are required, who turned them on, and what the recovery procedure is if they get turned off. The agent can verify state via the GitHub API (`/repos/{owner}/{repo}/private-vulnerability-reporting`) but the *enabling* of these settings is owner-only on GitHub's permission model unless the agent has admin scope.

**Acceptance for the doc:** file lists all 5 settings, current state per setting, and "if turned off, see PB-NN" pointers.

---

### M-1 — `/.well-known/change-password` not implemented

**File:** `nginx/nginx.conf` or backend route

**Required (per RFC 8615 + RFC 8959):**

```nginx
location = /.well-known/change-password {
    return 302 /settings/security;  # or whatever your change-password UI route is
}
```

Or backend route equivalent. The destination should be the authenticated change-password screen; if the user isn't logged in, the login flow then redirects them back after auth.

**Why it matters:** password managers (1Password, Bitwarden, browser-native) deep-link users here for credential rotation after a breach disclosure. Without it, users have to hunt for the change-password page manually.

**Acceptance:** `curl -sI https://ce-demo.homelabarr.com/.well-known/change-password` returns 302 (or 301) with a sensible `location:`.

---

### M-2 — Hard-coded analytics website-ID is undocumented

**File:** `index.html` (the Vite entry that's serving `<script defer src="/analytics.js" data-website-id="7f290439-4876-4f84-966d-a26da50bf4b6">`)

**Current:** the analytics website-ID is embedded in static HTML, served to every visitor, with no documentation of:
- What analytics product this is (Umami? Plausible? PostHog? — based on `data-website-id` attribute, looks like Umami)
- What data is collected
- Whether it's first- or third-party hosted
- Whether CSP `script-src 'self'` covers it (the script is at `/analytics.js` on the same origin, so yes — first-party proxy)
- Any cookie/storage consent gating (likely none needed if first-party Umami with no PII collection, but should be explicit)

**Required (RIGHT):** add a section to `docs/threat-model/02-trust-boundaries.md` documenting the analytics boundary, and add a short `PRIVACY.md` at repo root (or extend SECURITY.md) noting:

```markdown
## Analytics
This demo runs first-party Umami analytics at `/analytics.js`. The script
sends pageview events to a same-origin endpoint. No PII collected, no
third-party cookies, no cross-origin transmission. The website ID
`7f290439-...` is embedded in HTML by design; it is not a secret.
```

**Acceptance:** `PRIVACY.md` exists OR `SECURITY.md` extended with the section above. Threat model trust-boundary doc references the analytics flow.

---

### M-3 — Container image LABELs missing OCI metadata

**File:** `Dockerfile`(s) for backend and nginx images

**Required (RIGHT) — OCI image annotation labels per https://github.com/opencontainers/image-spec/blob/main/annotations.md:**

```dockerfile
LABEL org.opencontainers.image.title="homelabarr-ce-backend"
LABEL org.opencontainers.image.description="HomelabARR CE backend"
LABEL org.opencontainers.image.url="https://ce-demo.homelabarr.com"
LABEL org.opencontainers.image.source="https://github.com/smashingtags/homelabarr-ce"
LABEL org.opencontainers.image.documentation="https://github.com/smashingtags/homelabarr-ce/blob/main/README.md"
LABEL org.opencontainers.image.licenses="<actual license SPDX>"
LABEL org.opencontainers.image.vendor="<owner>"
LABEL io.homelabarr.security.contact="https://github.com/smashingtags/homelabarr-ce/security/policy"
```

**Why it matters:** GHCR shows these labels on the package page. Pulling tools (and humans) get the security contact and license info directly from `docker inspect` without having to find the repo. Cosign + SBOM (R5) becomes more useful when paired with these labels.

**Acceptance:** `docker inspect <image> --format '{{json .Config.Labels}}' | jq` returns all 8 labels with correct values. GHCR package page shows them in the sidebar.

---

### L-1 — `/humans.txt` decision (populate or remove)

**File:** `nginx/nginx.conf` and optionally `public/humans.txt`

**Current:** request returns SPA index (200 text/html — same fallback as other paths).

**Pick one:**

**Option A (populate):**
```
# public/humans.txt
/* TEAM */
Maintainer: <name> -- <github handle>
Site: https://homelabarr.com
Twitter/X: <handle or remove>
Location: <city, country or remove>

/* THANKS */
- Anthropic Claude (security audit loop, R1-R17+)
- dependabot (dependency hygiene)
- The cosign / sigstore / SBOM / OWASP ASVS / CIS / NIST / MITRE ATT&CK communities

/* SITE */
Last update: <ISO date>
Standards: HTML5, CSS3
Components: React, Vite, nginx, Node.js
Software: GitHub Actions, GHCR
```

**Option B (remove):** add `location = /humans.txt { return 404; }` in nginx.

**Acceptance:** either the file resolves to the populated text/plain content, OR returns 404 — not the SPA fallback.

---

### L-2 — `sitemap.xml` decision

**File:** `nginx/nginx.conf` and optionally `public/sitemap.xml`

**Current:** 403.

For a single-page demo with `noindex, nofollow` (per H-3), a sitemap isn't strictly necessary, and the robots.txt sitemap line from H-2 can be dropped. But if/when there's a marketing site or docs, a sitemap becomes useful.

**Pick one:**
- **For the demo:** drop the `Sitemap:` line from robots.txt (H-2) and let `/sitemap.xml` continue returning 403/404. Document the decision in `docs/threat-model/07-residual-risk.md` as "no public crawl surface; sitemap N/A."
- **For future marketing site:** ship a minimal `sitemap.xml` listing the public pages (`/`, `/docs/...`, etc.) and update robots.txt accordingly.

**Acceptance:** the chosen path is documented in `docs/threat-model/07-residual-risk.md` and the robots.txt either references or doesn't reference a sitemap accordingly.

---

### L-3 — `SECURITY.md` should reference `/.well-known/security.txt`

**File:** `SECURITY.md`

**Required:** add a small section noting that the canonical disclosure contact is also available at `https://ce-demo.homelabarr.com/.well-known/security.txt` for scanners. Closes the loop between GitHub disclosure (SECURITY.md) and HTTP disclosure (security.txt).

```markdown
## Machine-readable disclosure contact
A copy of this disclosure policy is available at:
- https://ce-demo.homelabarr.com/.well-known/security.txt (RFC 9116)
```

**Acceptance:** `grep -q "well-known/security.txt" SECURITY.md` returns 0.

---

### L-4 — Audit index row for R17

**File:** `docs/audit/README.md`

**Required:** add row:

```markdown
| R17 | Public-disclosure surface audit | <count> | shipped |
```

(adjust findings count to match actual final tally)
---

## §4 — Verification commands (agent self-check before declaring ship)

```bash
# 1. Legacy /security.txt redirects
curl -sI https://ce-demo.homelabarr.com/security.txt | grep -E '^HTTP.*30[12]' \
  || echo "FAIL: /security.txt does not redirect"
curl -sI https://ce-demo.homelabarr.com/security.txt | grep -i 'location:.*\.well-known/security\.txt' \
  || echo "FAIL: /security.txt redirect target wrong"

# 2. /.well-known/security.txt still valid
curl -s https://ce-demo.homelabarr.com/.well-known/security.txt | grep -q '^Contact:' \
  || echo "FAIL: security.txt missing Contact"
curl -s https://ce-demo.homelabarr.com/.well-known/security.txt | grep -q '^Expires:' \
  || echo "FAIL: security.txt missing Expires"

# 3. robots.txt present and correct
curl -s https://ce-demo.homelabarr.com/robots.txt | grep -q 'User-agent:' \
  || echo "FAIL: robots.txt missing or wrong"
curl -s https://ce-demo.homelabarr.com/robots.txt | grep -q 'Disallow: /api/' \
  || echo "FAIL: robots.txt does not disallow /api/"
curl -sI https://ce-demo.homelabarr.com/robots.txt | grep -i 'content-type:.*text/plain' \
  || echo "FAIL: robots.txt wrong content-type"

# 4. Homepage meta tags
HTML=$(curl -s https://ce-demo.homelabarr.com/)
echo "$HTML" | grep -q 'meta name="description"' || echo "FAIL: no description meta"
echo "$HTML" | grep -q 'meta name="robots"' || echo "FAIL: no robots meta"
echo "$HTML" | grep -q 'rel="canonical"' || echo "FAIL: no canonical link"
echo "$HTML" | grep -q 'property="og:title"' || echo "FAIL: no OG meta"

# 5. change-password well-known
curl -sI https://ce-demo.homelabarr.com/.well-known/change-password | grep -E '^HTTP.*30[12]' \
  || echo "FAIL: change-password not implemented"

# 6. /humans.txt decision
curl -sI https://ce-demo.homelabarr.com/humans.txt | grep -E '^HTTP.*(200|404)' | head -1 \
  | grep -v 'text/html' >/dev/null \
  || echo "WARN: humans.txt still returning SPA HTML"

# 7. SECURITY.md cross-link
grep -q 'well-known/security.txt' SECURITY.md || echo "FAIL: SECURITY.md missing well-known reference"

# 8. PRIVACY.md or extended SECURITY.md for analytics
test -f PRIVACY.md || grep -q 'Analytics' SECURITY.md || echo "FAIL: analytics not documented"

# 9. Dockerfile OCI labels (sample one image)
docker pull ghcr.io/smashingtags/homelabarr-ce:latest 2>/dev/null
docker inspect ghcr.io/smashingtags/homelabarr-ce:latest \
  --format '{{json .Config.Labels}}' | jq -e '."org.opencontainers.image.source"' \
  || echo "FAIL: OCI source label missing"

# 10. GitHub settings doc
test -f docs/governance/github-security-settings.md || echo "FAIL: github-security-settings.md missing"

# 11. Threat model trust boundary for analytics
grep -q -i 'analytics' docs/threat-model/02-trust-boundaries.md \
  || echo "FAIL: analytics not in trust-boundaries doc"

# 12. Audit index R17 row
grep -q '^| R17' docs/audit/README.md || echo "FAIL: audit index missing R17 row"

# 13. R17 archive
test -f docs/audit/R17-public-disclosure-surface.md || echo "FAIL: R17 archive missing"

# 14. Sitemap decision documented (in residual risk)
grep -E -i 'sitemap|crawl surface' docs/threat-model/07-residual-risk.md \
  || echo "WARN: sitemap decision not documented in residual risk"
```

---

## §5 — Out of scope for R17

- SEO optimization beyond basic meta tags. Demo origin is noindex,nofollow by design.
- Cookie banner / GDPR consent. First-party Umami with no PII collection is below the consent threshold; document and move on.
- Public status page (mentioned as TBD in R14 owner pile; stays there).
- Marketing site / docs site work. R17 is the *demo origin's* disclosure surface only.

---

## §6 — Owner pile (human-only decisions)

| # | Decision | Why owner | Recommended |
|---|---|---|---|
| O-1 | Confirm GitHub security settings (H-4): private vulnerability reporting, dependabot alerts, dependabot security updates, secret scanning + push protection, optional CodeQL | These are repo-admin settings; agent has API read but not admin toggles on GitHub's permission model | Turn all 5 on; CodeQL optional but free |
| O-2 | Pick humans.txt option A (populate) or B (remove) — L-1 | Style preference | A if you want credit; B if you want fewer 200s on non-content paths |
| O-3 | Pick sitemap.xml stance — L-2 | Future direction depends on whether you ship a marketing site | Drop the sitemap line from robots.txt for now |
| O-4 | Confirm `SPDX` license string for OCI labels (M-3) | What license is this actually? `MIT`? `Apache-2.0`? Check the existing LICENSE file | Whatever LICENSE says |
| O-5 | Carried: 25 dependabot vulns under R15 policy | Awaiting first staleness fire + owner triage | Half-day |
| O-6 | Carried: audit-log off-box destination (R7) | Cost | Pick one |
| O-7 | Carried: chaos gameday + tabletop (R12 + R14) | Calendar | Half-day |
| O-8 | Carried: sign off on `docs/threat-model/07-residual-risk.md` (R13) | Acceptance | 7 days |

**Reminder:** agent has CF + GH access — DNS, WAF rules, repo workflows, GHCR labels, nginx config (via deploy), all agent work. Only the GitHub *admin-toggle* security settings (H-4) need owner clicks.

---

## §7 — Deliverable shape

```
nginx/nginx.conf                          (EXTEND — /security.txt 301, /robots.txt, /.well-known/change-password 302)
public/robots.txt                         (NEW — explicit disallow /api/ /admin/)
public/humans.txt                         (NEW — populated OR removed per O-2)
index.html                                (EXTEND — description, robots, canonical, theme-color, OG meta)
Dockerfile                                (EXTEND — OCI labels for backend + nginx images)
SECURITY.md                               (EXTEND — well-known cross-reference)
PRIVACY.md                                (NEW — first-party analytics disclosure)

docs/governance/
  github-security-settings.md             (NEW — required settings, current state, recovery)

docs/threat-model/
  02-trust-boundaries.md                  (EXTEND — analytics flow as boundary)
  07-residual-risk.md                     (EXTEND — sitemap decision)

docs/audit/
  R17-public-disclosure-surface.md        (this file, archived)
  README.md                               (EXTEND — R17 row)
```

**Ship message template:**
```
R17: public-disclosure surface audit

- nginx: /security.txt 301 to /.well-known/security.txt, /robots.txt served as text/plain, /.well-known/change-password 302
- public/robots.txt with Disallow /api/ /admin/
- index.html: description, robots noindex, canonical, theme-color, OG meta
- Dockerfile: 8 OCI image annotation labels on backend + nginx
- SECURITY.md cross-references /.well-known/security.txt
- PRIVACY.md (new): first-party Umami analytics disclosure
- docs/governance/github-security-settings.md (new): required repo-admin toggles
- Trust-boundaries doc extended with analytics flow

Verification: all 14 self-check commands in R17 §4 pass on the live origin.
```

---

## §8 — End of round / loop

If everything in §4 passes: ship and report back. R18 will be the **wiki + docs site audit** — you have a `wiki/` directory in the tree with deployment-flow diagrams and screenshots. That's a separate documentation surface from the audit MDs and the threat model, and it has its own security implications (broken links, stale CSP examples, instructions that contradict the current shipped posture, third-party image embeds, etc.). Time to make sure the docs match the code.

If anything in §4 fails: report which line, and we open R17.5 as a pink correction.
