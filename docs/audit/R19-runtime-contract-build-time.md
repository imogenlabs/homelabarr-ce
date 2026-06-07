# R19 — Runtime Contract & Build-Time Hardening

> **Round:** 19 / loop continuing
> **Repo:** smashingtags/homelabarr-ce
> **Live:** https://ce-demo.homelabarr.com/
> **Main HEAD:** 4a9fe7ec57 (2026-05-23T03:49:24Z)
> **Scope (per owner):** software-layer only. Host configuration, network segmentation, and infrastructure are explicitly out of scope. R19 changes are runtime contract that ships with the repo — Dockerfiles, compose, runtime env handling — so the work compounds whether the production host stays on the current VM or migrates later.
> **Frame:** ce-demo container == backbone image == open-source posture fronting the eight.ly funnel.

---

## §0. Pre-flight verification (R18 close-out)

Live (ce-demo.homelabarr.com, cache-busted, credentials:'omit'):

| Check | Expected | Live | Pass |
|---|---|---|---|
| GET /__nope_<random> | 404 + html body | 404 text/html (1279 B) | yes |
| GET /static/notathing-<ts>.js | 404 | 404 text/html | yes |
| GET /a/b/c/d/e/<ts> (deep SPA path) | 404 + html | 404 text/html | yes |
| GET /robots.txt content-type | single text/plain | single text/plain | yes |
| GET /humans.txt content-type | single text/plain | single text/plain | yes |
| GET /security.txt | 301 | opaqueredirect | yes |
| GET /.well-known/security.txt | 200 RFC 9116 | 200 text/plain (317 B) | yes |
| GET / | 200 html | 200 text/html | yes |
| last-modified | post-merge | 2026-05-23T03:52:50Z | yes |

Source (main @ 4a9fe7ec57):

| Check | Expected | Actual | Pass |
|---|---|---|---|
| api-reference.md http leaks to public hosts | 0 | 0 (22 total http, all LAN/loopback/placeholder) | yes |
| new wiki/docs/guides/security.md exists | 200, ≥3 KB | 200, 3431 B | yes |
| quick-start links to security.md | yes | yes | yes |
| architecture links to security.md | yes | yes | yes |
| traefik-setup links to security.md | yes | yes | yes |
| diagram script mentions new envelope | ≥5 controls | rate-limit (3), CSP/HSTS (4), socket proxy (3), .well-known (2), MFA/CSRF (9), jail/honey (1) | yes |
| deploy-drift.yml workflow exists | schedule + lm cmp + main cmp + opens issue | all 4 present | yes |
| HANDOFF-APP-REBUILD.md moved | docs/internal/ or .github/ | docs/internal/ (3494 B), root 404 | yes |
| security.md guide covers shipped envelope | headers + well-known + threat model + IR + audit | all 5 present | yes |

**R18 status: CLOSED ✓**

---

## §1. Goal

Audit the runtime contract the homelabarr-ce containers ship with. Specifically:

1. Build-time hardening (Dockerfile and Dockerfile.backend): base image pinning, PID-1 signal handling, layer surface, build determinism.
2. Runtime hardening (homelabarr.yml): image pinning, capability surface, network egress, secret material handling, watchtower opt-in label.
3. Find drift between the runtime documented in deploy-pipeline/INFRASTRUCTURE.md (read with permission as operating context) and what the shipped compose actually does.

R19 stays at the artefact layer — the work lands in this repo, ships to GHCR, and arrives on whatever host runs the image. No host-level changes are spec'd.

---

## §2. Current state (what is already strong)

The shipped `homelabarr.yml` is **already substantially hardened**. Inventory of controls already present (do not regress these):

Backend service:
- `user: "1001:1001"` (non-root)
- `cap_drop: [ALL]`
- `security_opt: [apparmor=homelabarr-backend, no-new-privileges:true]` — custom AppArmor profile referenced
- `read_only: true`
- Explicit tmpfs for /tmp (64m) and /run (8m) with noexec,nosuid,nodev
- `pids_limit: 256`, `mem_limit: 768m`, `cpus: 1.5`
- Docker secrets (file-mounted, not env-injected) for jwt key current/previous, default password, alert webhook, sqlcipher key
- Healthcheck wired to /health
- `depends_on: socket-proxy condition: service_healthy`

Socket-proxy service (sits between backend and host docker socket):
- `lscr.io/linuxserver/socket-proxy` with API surface limited to CONTAINERS/IMAGES/NETWORKS/VOLUMES (read paths only; no POST/exec endpoints exposed)
- `cap_drop: [ALL]`, `read_only: true`, `no-new-privileges`
- Host socket mounted **read-only** (`/var/run/docker.sock:/var/run/docker.sock:ro`)
- pids_limit 64, mem 64m, cpus 0.25 (tight)
- Healthcheck against /_ping

Networking:
- `homelabarr` (external bridge) and `homelabarr-internal` (`internal: true` — no external connectivity)
- Backend straddles both; socket-proxy only on internal — proxy cannot reach the internet
- Frontend (separate service) sits only on the external network

Build-time:
- Multi-stage Dockerfile (frontend) and single-stage Dockerfile.backend
- `npm ci` (lockfile-respecting), not `npm install`
- Explicit non-root USER directive in both
- HEALTHCHECK in both
- WORKDIR set

This is genuinely strong. Nothing in §3 is "you forgot the basics" — every finding is at the next layer of hardening.

---

## §3 (caveat-1)

**Drift between deploy-pipeline/INFRASTRUCTURE.md and shipped homelabarr.yml:** the deploy doc says CE backend "Docker socket: Mounted in CE backend (read-write — needed to deploy apps)." The shipped `homelabarr.yml` says `docker.sock:ro` (read-only) on the socket-proxy and the backend does not mount the socket at all (it talks to `tcp://socket-proxy:2375`). One of these is wrong about production. This must be confirmed before R19 ships — see §3 H-1.

---

## §3. Findings

### H-1 — Confirm what production actually mounts; reconcile drift with the shipped compose

**Severity:** High (posture-vs-reality reconciliation)
**Surface:** ce-prod VM 121 vs homelabarr.yml in repo
**Why it matters:** A pentester or auditor who reads the public homelabarr.yml will conclude the Docker socket is :ro behind a capability-limited proxy. If production actually mounts the host socket :rw directly into the backend (as the internal deploy doc states), then the public posture overstates the real posture. Inversely, if production matches the shipped compose, the internal deploy doc is stale and should be corrected. Either way, the discrepancy is a finding.

**FIX (agent/owner step; no code change in this repo unless production differs):**

1. On ce-prod (192.168.1.231) run:
```bash
docker inspect homelabarr-backend --format '{{range .Mounts}}{{.Source}} -> {{.Destination}} (rw={{.RW}}){{"\n"}}{{end}}'
docker inspect homelabarr-backend --format '{{.HostConfig.SecurityOpt}} {{.HostConfig.CapDrop}} {{.HostConfig.ReadonlyRootfs}}'
docker inspect homelabarr-backend --format '{{json .Config.Env}}' | grep -iE 'DOCKER_HOST|CLI_BRIDGE' || echo "no DOCKER_HOST env"
docker ps --filter name=homelabarr-socket-proxy --format '{{.Names}} {{.Status}}'
```

2. Compare to homelabarr.yml in this repo:
- Mounts: backend should have NO docker.sock mount, only `/homelabarr:ro`, `homelabarr-data`, `homelabarr-config`, `homelabarr-activity`
- DOCKER_HOST should be `tcp://socket-proxy:2375`
- socket-proxy container should exist and be running
- SecurityOpt should include `apparmor=homelabarr-backend` and `no-new-privileges:true`
- CapDrop should be `[ALL]`, ReadonlyRootfs should be `true`

3. If production matches: update INFRASTRUCTURE.md in deploy-pipeline to remove the stale "Docker socket: Mounted in CE backend (read-write)" line. No code change here.

4. If production differs: ship a follow-up that aligns production to the shipped compose (this would be an infra change, outside R19 software scope, but R19 must surface the discrepancy).

---

### H-2 — All images use mutable tags (`:latest`, `:24-alpine`, `:1.27-alpine`, `:24-alpine3.23`); no `@sha256:` digests anywhere

**Severity:** High (supply-chain integrity)
**Surface:** Dockerfile, Dockerfile.backend, homelabarr.yml
**Why it matters:** Watchtower polls every 5 minutes and recreates on new image. With `:latest` tags, whatever GHCR currently serves at that tag enters the runtime within 5 minutes, with **no verification of what was actually built**. If a CI run is compromised, a registry is compromised, or a tag is repointed, the running container changes without notice. Build-time bases on mutable tags (`node:24-alpine`) compound the issue: `docker build` will silently consume different base layers across builds.

For the eight.ly funnel: any auditor or paying customer who runs `docker pull` against the shipped compose and inspects what they got cannot verify they got the same artefact you built. That's a hole in the chain-of-custody story SECURITY.md and the threat model implicitly tell.

**FIX (this repo):**

1. Dockerfile and Dockerfile.backend — pin every `FROM` line by digest.

WRONG (current):
```dockerfile
FROM node:24-alpine
FROM nginx:1.27-alpine
FROM node:24-alpine3.23
```

RIGHT (with current real digests, agent to fetch via `docker buildx imagetools inspect`):
```dockerfile
FROM node:24-alpine@sha256:<actual-digest>
FROM nginx:1.27-alpine@sha256:<actual-digest>
FROM node:24-alpine3.23@sha256:<actual-digest>
```

Add a Renovate or Dependabot config to bump these digests on a cadence so they don't go stale and miss security patches. R15 dependency governance already covers application-layer deps; this extends the same policy to base images.

2. homelabarr.yml — pin every `image:` line by digest, OR document a verification step that downstream operators can run.

The harder version (digest in compose): every `image:` becomes `image: ghcr.io/.../homelabarr-backend:latest@sha256:<digest>`. This means CI must update the compose on every release (auto-PR).

The pragmatic version (signature verification at pull time): keep `:latest` for the homelabarr-* images, but add a `# verify with: cosign verify ghcr.io/imogenlabs/homelabarr-backend ...` comment block and document signature verification in SECURITY.md. This requires cosign-signing the GHCR push in the CI workflow.

Recommend the pragmatic version (cosign) over hard-pinning in compose, because:
- Hard-pinning in a public compose file means every release changes the compose, which is noise self-hosters don't want.
- Cosign + transparency log gives the same guarantee with less churn.
- The CI workflow already has GH_PAT for GHCR push (per the deploy doc); adding cosign signing is one workflow change.

For the lscr.io/linuxserver/socket-proxy:latest line, pin to digest immediately — it's a third-party image you don't sign, and `:latest` from a third party is the highest-risk single line in this compose.

---

### H-3 — Dockerfile and Dockerfile.backend run Node as PID 1 without dumb-init or tini

**Severity:** High (operational correctness + security signal handling)
**Surface:** Dockerfile, Dockerfile.backend
**Why it matters:** Node as PID 1 has known issues: it doesn't reap zombie children, doesn't forward signals correctly, and complicates graceful shutdown. For a security-sensitive container, signal-handling matters because docker stop -> SIGTERM should trigger clean audit-log flush, JWT-key rotation completion, and session-table writes before SIGKILL. Without an init, you risk truncated audit chains on every restart (the R16 binder explicitly depends on append-only audit integrity).

**FIX:**

WRONG (current, both Dockerfiles):
```dockerfile
USER nodejs
CMD ["node", "server/index.js"]
```

RIGHT:
```dockerfile
RUN apk add --no-cache dumb-init
USER nodejs
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]
```

Apply to both Dockerfile and Dockerfile.backend. Confirm shutdown chain: a 30s graceful shutdown via SIGTERM should flush the in-flight audit batch and close the sqlite/sqlcipher WAL cleanly before SIGKILL.

---

### M-1 — Backend uses `BIND_ADDRESS=0.0.0.0` but documentation guidance is implicit

**Severity:** Medium (configuration clarity)
**Surface:** homelabarr.yml backend env block
**Why it matters:** `BIND_ADDRESS=0.0.0.0` is correct inside a container that's only reached via the docker bridge network (the container's :8092 is only exposed to other containers, not the host). But a self-hoster who reads this and decides to use `network_mode: host` (an antipattern but possible) suddenly has the backend listening on every interface of the host. The compose ships with bridge networking, so the default is safe; the variable name is just confusable.

**FIX:** Add an inline comment in homelabarr.yml above the env block:

```yaml
# BIND_ADDRESS is intentionally 0.0.0.0 — it binds inside the container's
# network namespace only. Reachable from the host only via the explicit
# port: mapping below. Do NOT set network_mode: host with this binding.
- BIND_ADDRESS=0.0.0.0
```

Optional: document a CONTAINER_ONLY=true env flag the backend can check, that refuses to start if it detects host network mode (read /proc/net/route or compare /proc/self/ns/net to PID 1's). Defer to L-class if not desired.

---

### M-2 — Watchtower opt-in label is absent from the shipped homelabarr.yml

**Severity:** Medium (clarity for self-hosters)
**Surface:** homelabarr.yml — no `com.centurylinklabs.watchtower.enable=true` label on any service
**Why it matters:** Per the deploy-pipeline doc (read with permission), the production fleet runs Watchtower in LABEL_ENABLE=true mode (opt-in). The shipped homelabarr.yml has no Watchtower labels, so any self-hoster who copies this compose and runs Watchtower in default (opt-out) mode gets auto-updates anyway, and any self-hoster who runs Watchtower in opt-in mode does NOT get auto-updates. Neither is necessarily wrong, but it's an undocumented stance.

**FIX:** Decide the default stance for self-hosters and document it. Two options:

**Option A (recommended for self-hosters):** ship the compose WITHOUT watchtower labels. Add a comment block in homelabarr.yml:

```yaml
# Auto-updates: this compose does not opt in to Watchtower by default.
# If you run Watchtower in opt-in (LABEL_ENABLE=true) mode and want
# auto-pulls on this stack, add to each service:
#   labels:
#     - com.centurylinklabs.watchtower.enable=true
# We recommend opt-in mode plus signature verification (see SECURITY.md).
```

**Option B:** ship labels and let opt-out-mode Watchtower respect them as a positive signal. Less defensive.

Go with A.

---

### M-3 — frontend service config not yet inventoried in this round

**Severity:** Medium (audit completeness)
**Surface:** homelabarr.yml — frontend service
**Why it matters:** The backend service was deeply inspected. The frontend (`ghcr.io/imogenlabs/homelabarr-frontend:latest`, user 101:101) was confirmed to have a user directive but the full hardening directive set was not inventoried in this round. Likely-clean but unverified.

**FIX:** Agent reads homelabarr.yml frontend block and confirms the same set as backend: cap_drop ALL, security_opt no-new-privileges (apparmor optional since nginx has its own profile), read_only true with explicit tmpfs for /var/cache/nginx and /var/run, pids_limit, mem_limit, cpus, healthcheck. If any are missing, add them in the same PR as the H-class fixes.

---

### L-1 — Dockerfile.backend FROM line shows `from Alpine` mixed-case anomaly

**Severity:** Low (build hygiene)
**Surface:** Dockerfile.backend
**Why it matters:** The regex sweep returned two FROM-like patterns: `FROM node:24-alpine3.23` and a lowercase `from Alpine` somewhere in the file. The lowercase form is likely inside a comment, but worth a glance to confirm — Docker treats FROM case-insensitively, so a stray lowercase FROM in code would create a third stage silently.

**FIX:** Inspect Dockerfile.backend. If `from Alpine` is a comment, no action. If it's an actual instruction, refactor.

---

### L-2 — `.dockerignore` audit not performed this round

**Severity:** Low (build context hygiene)
**Surface:** .dockerignore (691 B)
**Why it matters:** A small .dockerignore on a Node project usually means a lot of unnecessary files end up in the build context — node_modules, .env files, secrets in dev .env, test fixtures with synthetic but realistic data. None of that necessarily ends up in the final image (multi-stage protects), but build-context size affects build speed and a careless `COPY . .` can leak.

**FIX:** Agent inventories .dockerignore for entries: node_modules, .git, .env, .env.*, *.log, coverage, .vscode, .idea, docs/, wiki/, chaos/, compliance/, docs/audit/, .github/, tests/. Add what's missing. Confirm no `COPY . .` in the final image stage (multi-stage means it's fine in builder stage; in the final stage, `COPY --from=builder /app/dist ./dist` is the right pattern).

---

### INFO-1 — Drift monitor (R18 L-3 / .github/workflows/deploy-drift.yml) now operational

The 30-min drift monitor R18 shipped will catch any future R17.5-class lag automatically and open an issue. R19 does not need a manual deploy-currency probe at §0; the monitor does it continuously. Future rounds can read the most recent drift-monitor run as the §0 freshness signal.

---

## §4. Verification commands (agent-runnable after ship)

```bash
# 1. Image digests are pinned in Dockerfiles
for f in Dockerfile Dockerfile.backend; do
  echo "--- $f"
  curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/$f | grep -E '^FROM ' || echo "no FROM lines"
done
# expected: every FROM line contains '@sha256:'

# 2. dumb-init / tini in entrypoint
for f in Dockerfile Dockerfile.backend; do
  echo "--- $f"
  curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/$f | grep -E '(ENTRYPOINT|dumb-init|tini)'
done
# expected: ENTRYPOINT references dumb-init or tini

# 3. socket-proxy pinned by digest
curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/homelabarr.yml | grep -E '(linuxserver/socket-proxy|lscr\.io)' 
# expected: line contains '@sha256:'

# 4. Watchtower comment block present
curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/homelabarr.yml | grep -iE 'watchtower' | head -5
# expected: a comment block explaining opt-in stance; no enable=true label

# 5. BIND_ADDRESS comment present  
curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/homelabarr.yml | grep -B 2 'BIND_ADDRESS'
# expected: a comment line above explaining container-only binding

# 6. Frontend service has full hardening directive set
curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/homelabarr.yml \
  | awk '/^  frontend:/,/^  [a-z]+:/' \
  | grep -E '(cap_drop|security_opt|read_only|tmpfs|pids_limit|mem_limit|healthcheck)' | wc -l
# expected: >= 7

# 7. .dockerignore covers the obvious bits
for entry in node_modules .git .env docs/ chaos/ compliance/ .github/; do
  echo -n "$entry: "
  curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/.dockerignore | grep -qF "$entry" && echo "present" || echo "MISSING"
done
```

For H-1 (drift confirmation), this is a production-side check — the agent runs the docker inspect commands listed in H-1 §FIX on ce-prod and reports the actual mount/security-opt/cap-drop state. No commit needed unless production differs from the shipped compose.

---

## §5. Out of scope (deferred)

Per owner's scope call, the following are out of scope for R19 and explicitly NOT being audited:

- Host operating system (Debian/Ubuntu/Proxmox VM) configuration
- SSH/sshd hardening
- Host-level firewall/nftables/ufw rules
- Docker daemon configuration (userns-remap, default-ulimits, live-restore)
- Reverse proxy (Traefik) configuration in production
- Cloudflare tunnel and zone settings
- Network segmentation between VMs on the homelab
- Backup integrity, restore drills, off-site backups
- Watchtower configuration on the host (vs the label stance in this compose)
- The deploy-pipeline repo itself

Owner has explicitly stated the production host stack is not finalized and infrastructure work will happen post-host-migration. R19 stays at the artefact layer so the work survives migration.

---

## §6. Owner pile (delta this round)

New items requiring owner attention:

- **H-1 reconciliation:** run the docker inspect on ce-prod, compare to shipped homelabarr.yml, and decide which to align to which. If production is correct (rw socket) and the shipped compose is more secure, that's actually the easier reconciliation — update the production compose to match the repo. If production matches the repo and the deploy-pipeline INFRASTRUCTURE.md is stale, edit that doc in the deploy-pipeline repo.
- **H-2 cosign decision:** pick the strategy (hard digest pin in compose vs cosign signing + verify). Recommend cosign. Agent can implement the signing side of the workflow; owner confirms the decision.
- **M-2 Watchtower stance for self-hosters:** confirm Option A (no labels shipped, documented comment block).

Carried forward (unchanged):
- Audit-log off-box destination (R7) — still pending
- Chaos gameday cadence (R12) — pending owner schedule
- Tabletop exercise (R14) — pending owner schedule
- Threat-model residual-risk sign-off (R13) — pending owner read
- 25 dependabot vulns triage under R15 policy — pending half-day owner session
- License SPDX string for OCI labels (R17 M-3) — confirm with LICENSE file

---

## §7. Deliverable

This MD is the R19 spec. Agent applies §3 H-2, H-3, M-1, M-2, M-3, L-1, L-2 in this repo. H-1 is a production-state reconciliation, not a code change in this repo — surface findings in the ship report.

After ship, verify §4 commands pass and report:
1. Which images were pinned to which digests (paste the SHA256 list).
2. Whether cosign signing was added to CI in the same PR or deferred.
3. Production drift state from H-1 inspect commands.
4. Frontend service hardening directive count from §4 check 6.

---

## §8. End of round

Per the new framing — ce-demo is the open-source posture fronting the eight.ly funnel — R19 closes the runtime contract story for outside observers. After R19 ships, any auditor or paying customer who reads the repo and runs the compose can verify (via cosign or digest) what they got, and the runtime they get is minimum-privilege by default. That's the credibility bar.

Likely next rounds (subject to owner direction):
- **R20:** in-app secret material handling — where JWT-key rotation lives, how SQLcipher key is sourced, what happens on key rotation, whether anything sensitive lands in logs or error responses.
- **R21:** error-surface hygiene — stack traces, path disclosure, unhandled-promise behavior, response timing differentials on auth paths.
- **R22:** OWNER CLOSEOUT MD pulling the carried owner-pile into a dated checklist.

Loop continues.
