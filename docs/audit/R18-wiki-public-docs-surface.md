# R18 — Wiki + Public Docs Surface Audit

> **Round:** 18 / loop continuing
> **Repo:** smashingtags/homelabarr-ce
> **Live:** https://ce-demo.homelabarr.com/
> **Main HEAD:** 6abe777080 (2026-05-23T03:10:30Z)
> **Last shipped:** R17.5 redeploy correction — verified clean
> **This round:** prospect-facing doc surfaces (README, SECURITY, PRIVACY, HANDOFF, wiki/docs/guides/*)
> **Frame:** ce-demo is the open-source posture that fronts the eight.ly funnel. Treat the wiki as a paying-prospect trust artifact, not internal notes.

---

## §0. Pre-flight verification (R17.5 close-out)

| Check | Expected | Live | Pass |
|---|---|---|---|
| GET /security.txt | 301 | opaqueredirect (status 0, type opaqueredirect) | yes |
| GET /.well-known/security.txt | 200 text/plain | 200 text/plain (317 B) | yes |
| GET /robots.txt | 200 text/plain | 200 text/plain (129 B) | yes |
| GET /humans.txt | 200 text/plain | 200 text/plain (419 B) | yes |
| GET / | 200 text/html | 200 text/html (1279 B) | yes |
| last-modified | > 2026-05-23T02:56Z | 2026-05-23T03:13:53Z | yes |
| Security headers preserved | 9 present | 9 present (COEP intentionally absent) | yes |

**R17.5 status: CLOSED ✓**

Two minor observations carried as L-class into R18 §3:
- Doubled `Content-Type: text/plain, text/plain` header on /robots.txt and /humans.txt
- SPA fallback returns 200 for unknown paths instead of 404

---

## §1. Goal

Audit every publicly-visible documentation surface as a hostile prospect would read it. Specifically:

1. Does the wiki accurately reflect the shipped security posture? (R10–R17 surface)
2. Does any doc surface ship credentials, auth examples, or config patterns over plaintext HTTP?
3. Does any doc surface contradict another doc surface or the live deployment?
4. Are the architecture diagrams current?
5. Is the disclosure surface (security.txt, SECURITY.md, IR runbook) findable from where prospects actually look?

This is the surface that fronts the eight.ly funnel. A prospect who reads the wiki and sees plaintext auth examples, stale diagrams, or missing security signposting will not believe the rest of the posture is real.

---

## §2. Current state

- **README.md** — 16,900 chars. Strong shape, links to ce-demo, SECURITY, wiki. Clean.
- **SECURITY.md** — 12,861 chars. Full disclosure policy + safe-harbor + topology + cross-link to /.well-known/security.txt. Clean.
- **PRIVACY.md** — 1,489 chars. Minimal but accurate for a self-hosted product. Acceptable.
- **HANDOFF-APP-REBUILD.md** — 3,494 chars. Internal-ops doc that ended up in repo root. Prospect-facing concern (see §3 M-1).
- **wiki/docs/guides/** — 18 markdown files (~115 KB total) + 4 PNG diagrams (~806 KB total) + 1 Python diagram generator.

Documented surface coverage:
- Quick-start, architecture, configuration, traefik-setup, white-label, api-reference, faq, history, migration, mobile-app, cli-installation, cli-bridge, contributing, web-dashboard

Coverage gaps vs shipped posture (R10–R17 surface):
- **Zero wiki coverage** of: security headers, CSP, HSTS, COOP/CORP, rate-limiting, audit log, threat model, IR runbook, /.well-known/security.txt, chaos experiments, dependency policy, evidence binder.
- All of that exists in SECURITY.md and docs/audit/ but is invisible to a prospect who only reads wiki guides.

---

## §3. Findings

### H-1 — wiki/docs/guides/api-reference.md ships every endpoint example over plain HTTP

**Severity:** High (prospect-credibility)
**Surface:** wiki/docs/guides/api-reference.md
**Why it matters:** Every documented API example uses `http://your-server:8092` and transmits `Authorization: Bearer YOUR_TOKEN` in the same line. A reader cannot infer from these examples that TLS is required, supported, or recommended. For a product whose differentiator is security posture, this is the worst possible first impression in the technical reference.

**WRONG (current):**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://your-server:8092/auth/api-keys
```

**RIGHT (replace all examples):**
```bash
# Behind Traefik (recommended): https + real hostname
curl -H "Authorization: Bearer YOUR_TOKEN" https://homelabarr.yourdomain.com/api/auth/api-keys

# LAN-only / no reverse proxy (development): http to LAN IP, never to a public URL
curl -H "Authorization: Bearer YOUR_TOKEN" http://192.168.1.100:8092/auth/api-keys
```

Add a banner block at the top of api-reference.md:

```markdown
> **TLS required for any non-loopback use.** Examples below show LAN-only http for local
> testing. For any deployment reachable from outside the host, put HomelabARR behind
> Traefik (or another TLS-terminating proxy) and use https. Never transmit bearer tokens
> over plaintext on a non-loopback network.
```

Apply to every endpoint example in the file (count: 14+ http:// occurrences in api-reference.md).

---

### H-2 — Architecture diagrams (4 PNGs) predate the R10–R17 security envelope

**Severity:** High (prospect-credibility)
**Surface:** wiki/docs/img/diagrams/{deployment-flow,network-topology,request-lifecycle,system-architecture}.png + generate_diagrams.py
**Why it matters:** `generate_diagrams.py` was scanned for keywords representing shipped controls. Results:

| Control | Mentions in diagram script |
|---|---|
| rate-limit / throttle | 0 |
| CSP / security headers / HSTS | 0 |
| audit log / access log | 9 (legacy logging, not the R7 audit pipeline) |
| auth step (login/session/hash) | 2 (basic, not Argon2 + rehash + jail) |
| jail / tarpit / honey events | 0 |

The diagrams show HomelabARR as a generic frontend + backend + Docker app, with **none of the R7–R17 controls visible**. A prospect who opens `architecture.md` and sees these diagrams will conclude the security posture is bolted-on documentation, not architecture.

**FIX:** Regenerate diagrams to include:
1. Request path: Cloudflare → Traefik (TLS termination) → nginx (security headers, rate-limit, jail-on-401) → backend (Argon2 auth, audit log emit) → Docker socket proxy → Docker
2. Audit log path: backend → ndjson audit log → off-box destination (placeholder for R7 owner-pile item)
3. Surface artefacts: /.well-known/security.txt, /robots.txt, SECURITY.md disclosure surface as a separate annotation
4. Threat-model overlay (optional): mark trust boundaries from docs/threat-model/

Owner pile: regenerating these 4 PNGs requires the diagram-generator environment. Suggest agent runs `generate_diagrams.py` after updating the source to match shipped architecture.

---

### H-3 — Wiki guides do not surface any of the R10–R17 security posture

**Severity:** High (prospect-credibility)
**Surface:** wiki/docs/guides/ (all 18 files)
**Why it matters:** A prospect who reads the wiki will never encounter the security posture that differentiates this repo. SECURITY.md, /.well-known/security.txt, the threat model, the IR runbook, chaos experiments, the evidence binder, the compliance posture — none of it is linked or referenced from any guide.

**FIX (minimum):** Add a new guide `wiki/docs/guides/security.md` (~3-5 KB) that contains:
- One paragraph: what security controls ship by default (link to SECURITY.md for detail)
- A table of the security headers shipped (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP, CORP)
- A pointer to /.well-known/security.txt for disclosure
- A pointer to docs/audit/ for the rolling audit trail
- A pointer to docs/threat-model/ and docs/ir/ for operators

Then link this new page from:
- wiki/docs/guides/quick-start.md — "Before you expose this to the internet, read [Security](security.md)"
- wiki/docs/guides/architecture.md — "Security envelope: [Security](security.md)"
- wiki/docs/guides/traefik-setup.md — "Headers added at nginx: [Security](security.md)"

---

### M-1 — HANDOFF-APP-REBUILD.md is an internal ops doc visible at repo root

**Severity:** Medium
**Surface:** /HANDOFF-APP-REBUILD.md (repo root)
**Why it matters:** This file is an internal handover note (3,494 chars, contains private IP 192.168.x.x and an internal date). A prospect browsing the repo root via GitHub sees it next to README/SECURITY/CONTRIBUTING/PRIVACY and may read internal context not intended for them.

**FIX:** Move to `docs/internal/HANDOFF-APP-REBUILD.md` (or `.github/HANDOFF-APP-REBUILD.md`), or delete if no longer needed. If kept at root, sanitize the internal IP and date references.

---

### M-2 — quick-start.md and faq.md hardcode 192.168.1.100 as the example LAN IP

**Severity:** Medium (consistency / hygiene)
**Surface:** wiki/docs/guides/quick-start.md, wiki/docs/guides/faq.md
**Why it matters:** Using a real-looking RFC1918 IP in examples is fine, but `192.168.1.100` is the user's actual production host (per R17.5 ship report: ce-prod is 192.168.1.231 — close but not identical). Risk of leak by template-copy is low but non-zero. Many docs use `192.0.2.x` (TEST-NET-1, RFC 5737) or `10.0.0.x` as the convention for examples.

**FIX:** Replace `192.168.1.100` examples with either:
- `YOUR-SERVER-IP` placeholder consistently, or
- `192.0.2.100` (documentation-reserved RFC 5737 block)

---

### M-3 — Doubled Content-Type header on /robots.txt and /humans.txt

**Severity:** Medium (config hygiene)
**Surface:** Live response from ce-demo.homelabarr.com — `Content-Type: text/plain, text/plain`
**Why it matters:** Carried from R17.5 §0. Two locations in the nginx config are setting the Content-Type for these paths. Strict header validators (Google security report, Mozilla Observatory, securityheaders.com) will flag this. It also indicates a config layering problem that will cause silent breakage if either location is later edited.

**FIX:** In the nginx config for the demo, locate the two sources of `add_header Content-Type` (or `default_type`) that affect /robots.txt and /humans.txt. Keep one (the more specific location block), remove the other. Owner pile: agent to inspect nginx config on ce-prod.

---

### M-4 — SPA fallback returns 200 + index.html for unknown paths instead of 404

**Severity:** Medium (correctness)
**Surface:** GET /__nope_<random> returns 200 text/html (1279 B) instead of 404.
**Why it matters:** Carried from R17.5 §0. For a SPA this is conventional, but security scanners and link-checkers will misread this as "every URL exists." It also makes it impossible to detect typos against deep-links externally.

**FIX:** In nginx, return real 404 for paths that don't match a known route or static asset; keep the SPA fallback only for whitelisted client-routed paths. Alternatively, serve a real 404 status with index.html as the body (status 404 + text/html). Owner pile: agent to update nginx try_files / error_page.

---

### L-1 — wiki/docs/guides/_white-label-audit.md is a 40 KB underscore-prefixed file in a public wiki

**Severity:** Low
**Surface:** wiki/docs/guides/_white-label-audit.md (40,130 bytes)
**Why it matters:** Underscore-prefix is a MkDocs/Jekyll convention for "do not publish," but the file is committed in the published wiki tree. Worth confirming whether it's intentionally rendered, intentionally hidden by the static-site config, or vestigial.

**FIX:** If it should not render on the published wiki: confirm mkdocs.yml excludes underscore-prefixed files (check the file). If it should render: rename without underscore. If vestigial: delete.

---

### L-2 — traefik-setup.md uses "yourdomain.com" placeholder convention

**Severity:** Low (consistency)
**Surface:** wiki/docs/guides/traefik-setup.md
**Why it matters:** `yourdomain.com` is fine but inconsistent with other docs that use `YOUR-SERVER-IP` (uppercase placeholder convention). Pick one convention.

**FIX:** Pick a placeholder convention and apply globally. Suggested: `YOUR-DOMAIN` and `YOUR-SERVER-IP` in all-caps to make placeholders visually obvious.

---

### L-3 — No live-vs-main drift monitor

**Severity:** Low (operations)
**Surface:** Operational, not docs
**Why it matters:** R17.5 caught a 2-hour deploy lag because the audit happened to probe. For an actual production posture you want this as a scheduled check, not an audit accident.

**FIX:** Owner-pile item (operations, agent-applicable): cron on ce-prod that compares the live last-modified header against `gh api repos/smashingtags/homelabarr-ce/commits/main` committer date and alerts when the gap exceeds (e.g.) 30 minutes. Output to existing audit log channel.

---

### INFO-1 — Default credential mention pattern is consistent and gated

**Status:** No action required.
The `admin / admin` mention pattern across README, SECURITY, quick-start, and architecture is consistent: every mention is paired with explicit "change immediately" or "set DEFAULT_*_PASSWORD before first start" guidance. SECURITY.md additionally warns to never set AUTH_ENABLED=false. Pattern is defensible.

---

## §4. Verification commands (agent-runnable after ship)

```bash
# 1. api-reference https/http audit after edits
curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/wiki/docs/guides/api-reference.md \
  | grep -E 'http://' | grep -v '192\.168\.|192\.0\.2\.|10\.|localhost|127\.0\.0\.1' | wc -l
# expected: 0 (every non-LAN example should be https)

# 2. new security.md guide exists and is linked
curl -sI https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/wiki/docs/guides/security.md | head -1
# expected: 200

for f in quick-start.md architecture.md traefik-setup.md; do
  echo "--- $f"
  curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/wiki/docs/guides/$f \
    | grep -i 'security\.md' || echo "MISSING link to security.md"
done

# 3. diagram script reflects shipped envelope
curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/wiki/docs/img/diagrams/generate_diagrams.py \
  | grep -iE 'rate.?limit|csp|hsts|argon|jail|tarpit|honey|/.well-known' | wc -l
# expected: > 5 (shows the new controls are now in the diagram source)

# 4. HANDOFF-APP-REBUILD moved or sanitized
curl -sI https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/HANDOFF-APP-REBUILD.md | head -1
# expected: 404 (moved to docs/internal/ or .github/)
#   OR if kept at root, verify the 192.168.x.x and internal-date references are removed

# 5. doubled content-type fixed
curl -sI 'https://ce-demo.homelabarr.com/robots.txt?_=$(date +%s)' | grep -i 'content-type'
# expected: exactly one content-type header value, not "text/plain, text/plain"

# 6. 404 returned for unknown paths
curl -sI 'https://ce-demo.homelabarr.com/__nope_$(date +%s)' | head -1
# expected: HTTP/2 404
```

---

## §5. Out of scope (deferred to later rounds)

- Wiki search / discoverability (does ce-demo or homelabarr.com have a search index? — R19)
- Host-level hardening on ce-prod itself (R19+, the real backbone work per the new frame)
- Egress policy on the deployed host (R20)
- Secrets rotation cadence and detection (R20)
- Backup integrity and recovery drill (R21)
- The 25 dependabot vulns triage from R15 (owner-pile half-day)

---

## §6. Owner pile (delta this round)

Items that require owner attention (cannot be agent-applied without owner input):

- **L-3 drift monitor** — decide threshold (suggest 30 min) and alert destination (suggest same channel as audit-log destination, still pending from R7).
- **H-2 diagram regeneration** — confirm the agent has the diagram-generator environment (graphviz/diagrams library), or punt to a quick manual SVG.
- **L-1 white-label-audit underscore file** — owner decision: render, hide, or delete.

Carried forward (unchanged):
- Audit-log off-box destination (R7) — still pending
- Chaos gameday cadence (R12) — pending owner schedule
- Tabletop exercise (R14) — pending owner schedule
- Threat-model residual-risk sign-off (R13) — pending owner read
- 25 dependabot vulns triage under R15 policy — pending half-day owner session
- License SPDX string for OCI labels (R17 M-3) — confirm with LICENSE file

---

## §7. Deliverable

This MD is the R18 spec. Agent applies §3 H/M findings and the relevant L's. After ship:

1. Verify §4 commands all pass.
2. Live-probe ce-demo for §3 M-3 and M-4 fixes.
3. Report back with: files changed, content-length deltas on the wiki guides, and any deviations from this spec.

Next round (R19) pivots to host-level hardening on ce-prod — the real backbone per the new frame. The wiki + docs surface should be closed by then.

---

## §8. End of round

If anything in §3 needs negotiation (e.g., diagram regen blocked, white-label-audit decision), surface it in the ship report rather than skipping silently. R17 → R17.5 was caused by a silent skip; do not repeat.

Loop continues.
