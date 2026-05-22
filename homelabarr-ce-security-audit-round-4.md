# HomelabARR-CE Security Audit — Round 4
**Dimension:** Docker socket proxy adoption + container runtime hardening
**Target:** `smashingtags/homelabarr-ce` @ main (verified live: ce-demo.homelabarr.com, bundle `index-pjntRCiX.js`)
**Date:** 2026-05-22
**Status:** Round 3 verified live. 1 minor drift queued for R3.5 (see §0).
**Findings:** 14 (2 Critical / 5 High / 4 Medium / 3 Low)

---

## §0 — Prior Round Carryover (Verified Live)

### Round 3 verification matrix (against `ce-demo.homelabarr.com/?_v=r3verify`, post-deploy bundle `index-pjntRCiX.js`)

| Probe | Expected | Observed | Verdict |
|---|---|---|---|
| `GET /api/auth/sessions` (authenticated) | 200 + sessions array | **200** | PASS |
| `POST /api/auth/refresh` (no XHR/CSRF) | 401/403 | **401** | PASS |
| `POST /api/auth/mfa/setup` (auth + XHR) | 200 + QR/URI | **200** | PASS |
| `POST /api/auth/forgot-password` (known user) | 204 | **204** | PASS |
| `POST /api/auth/forgot-password` (unknown user) | 204 (no enumeration) | **204** | PASS |
| `POST /api/auth/reset-password` (empty body) | 400 | **400** | PASS |
| `DELETE /api/auth/sessions/<unknown-jti>` | 404 | **404** | PASS |
| `POST /api/auth/mfa/verify` (empty body) | 400 | **500** | **FAIL — see R3.5-drift-1** |

### R3.5-drift-1 (queue for hot-patch, not blocking R4)

**Where:** `server/auth.js` — `POST /api/auth/mfa/verify` handler
**What:** Returns HTTP 500 when request body is missing/empty instead of 400 with validation error.
**Why minor:** Functional — endpoint is wired and CSRF-gated. The 500 leaks "something blew up" instead of cleanly reporting bad input. Server logs will fill with handled exceptions on every empty probe.

**WRONG (current behavior)**
```http
POST /api/auth/mfa/verify  (no body)
→ HTTP 500
```

**RIGHT**
```js
// server/auth.js — POST /api/auth/mfa/verify
const { code } = req.body || {};
if (typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) {
  return res.status(400).json({ error: 'invalid_code_format' });
}
```

Apply the same Joi/zod-style guard to `/api/auth/mfa/setup`, `/api/auth/reset-password`, and `/api/auth/sessions/:jti` (validate `:jti` as a 32-char hex/base64url before DB lookup — return 400 if malformed, 404 only after a real lookup miss).

---

## §1 — Goal

Stop mounting the host's Docker socket directly into the backend container. Replace with a **read-mostly, allow-listed socket proxy** (`tecnativa/docker-socket-proxy`) on an internal Docker network, and harden every HomelabARR container with `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`, `read_only: true`, dropped `group_add`, and explicit `tmpfs` mounts for state that must be writable.

The current configuration (`/var/run/docker.sock:/var/run/docker.sock:rw` mounted into the Node backend with `group_add: [${DOCKER_GID:-999}]`) is **equivalent to giving the backend uid:1001 user full host root**: any RCE in the Node process can `docker run --privileged -v /:/host alpine` and own the host. Round 3 closed the auth surface; Round 4 closes the explosion radius if Round 3 ever fails.

---

## §2 — Current State (Verified via Source @ main, 2026-05-22)

### 2.1 — `homelabarr.yml` (production compose, GHCR images)

Backend service runtime profile (verbatim excerpt):

```yaml
backend:
  image: ghcr.io/smashingtags/homelabarr-backend:latest
  container_name: homelabarr-backend
  restart: unless-stopped
  environment:
    - DOCKER_SOCKET=${DOCKER_SOCKET:-/var/run/docker.sock}
    - DOCKER_GID=${DOCKER_GID:-999}
    - JWT_SECRET=${JWT_SECRET:-CHANGE-THIS-TO-A-SECURE-SECRET}
    - JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-24h}
    - DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:-admin}
  volumes:
    # Docker socket access for container management
    - /var/run/docker.sock:/var/run/docker.sock:rw
    - ${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:rw
    - homelabarr-data:/app/data
    - homelabarr-config:/app/server/config
    - homelabarr-activity:/app/server/activity-data
  ports:
    - "${BACKEND_PORT:-8092}:8092"
  group_add:
    - "${DOCKER_GID:-999}"
```

**Observed gaps vs. CIS Docker Benchmark 1.6 / Docker Bench profile:**

| Control | Present? | Notes |
|---|---|---|
| Socket mounted read-only | NO | `:rw` — backend can issue ANY Docker API call including `POST /containers/create`, `/exec`, `/build` |
| `cap_drop: [ALL]` | NO | All ~14 default Linux caps still granted (NET_RAW, SETUID, SETGID, CHOWN, etc.) |
| `security_opt: [no-new-privileges:true]` | NO | A child process could gain caps via setuid binaries |
| `security_opt: [apparmor=…]` / `seccomp=…` | NO | Default profiles only — no custom seccomp/AppArmor narrowing |
| `read_only: true` rootfs | NO | Container rootfs is writable; an attacker can write `/tmp/x.so` and `LD_PRELOAD` |
| Explicit `tmpfs` for /tmp | NO | Combined with the above |
| Explicit `user:` override | NO (image-bound to 1001) | Compose doesn't pin; relies on image default — drift risk if image rebuilt |
| `pids_limit` | NO | Fork bomb in handler can DoS host |
| `mem_limit` / `cpus` | NO | No resource budget |
| `group_add: [docker]` removed | NO | Currently REQUIRED because socket is mounted directly |
| Docker socket proxy on internal net | NO | Direct socket mount |
| `/homelabarr` bind mount RW | YES (`:rw`) | Backend can also rewrite the CLI it executes |

### 2.2 — `Dockerfile.backend` (image build)

Already does the right things image-side: `USER homelabarr` (uid 1001), `apk upgrade --no-cache` for current Alpine CVEs, multi-package install minimized. **No regressions to fix here.** The runtime compose is the gap.

### 2.3 — `Dockerfile` (frontend, nginx)

```
FROM node:24-alpine AS build  (multi-stage ✓)
FROM nginx:1.27-alpine
# ... adduser/chown present, but USER directive ABSENT
# → final image runs nginx as root (UID 0)
```

Nginx as root inside a container is the conventional default but is unnecessary on Alpine's nginx image — it ships an `nginx` user. Combined with `docker-entrypoint.sh` doing `sed` into `/etc/nginx/conf.d/default.conf` and `exec nginx -g 'daemon off;'`, switching to non-root requires binding `>1024` or granting `CAP_NET_BIND_SERVICE`. The image already exposes 8080, not 80, so the cap isn't needed.

### 2.4 — CI image-build pipeline (`.github/workflows/docker-build-push.yml`)

| Control | Present? | Notes |
|---|---|---|
| `docker/build-push-action` w/ `provenance: true` | YES | SLSA build provenance attached |
| `sbom: true` | YES | Syft-style SBOM attached |
| Multi-platform (`linux/amd64,linux/arm64`) | YES | Good |
| Cosign keyless signature | **NO** | No `cosign sign` step; consumers cannot `cosign verify --certificate-identity=... ghcr.io/smashingtags/homelabarr-backend:latest` |
| Trivy image scan + SARIF | **NO** | `security-audit.yml` runs Trivy on **source**, not on the **published image** |
| Pinned action SHAs | (mostly NO) | Uses tags like `@v5`; supply-chain risk if action repo is hijacked |
| `permissions:` block minimized | PARTIAL | `id-token: write` present (good for OIDC) but workflow-level not job-level scoped |

### 2.5 — Live SSH/network surface (passive recon only)

```
GET https://ce-demo.homelabarr.com/  → 200, served via Traefik (`server: nginx` proxy)
GET https://ce-demo.homelabarr.com/api/health  → 200
```

No exposed Docker socket TCP port (`:2375`, `:2376`) reachable from outside Traefik. Good baseline — the risk is **lateral**, inside the host, not from the internet.

---

## §3 — Findings

Severity scale: **C** Critical (host takeover / data loss) · **H** High (RCE radius / privilege escalation) · **M** Medium (defense-in-depth) · **L** Low (hygiene)

### C-R4-1 — Direct Docker socket RW mount = host root for any backend RCE

**Where:** `homelabarr.yml` → `backend.volumes` line `- /var/run/docker.sock:/var/run/docker.sock:rw` + `backend.group_add: [${DOCKER_GID:-999}]`

**What:** The backend container has unrestricted access to the host's Docker daemon. There is no allow-list of endpoints; `POST /containers/create`, `POST /build`, `POST /containers/<id>/exec`, `GET /containers/<id>/archive` (read any host file via bind mount), and `POST /containers/<id>/start` with `Privileged: true` + `Binds: ["/:/host"]` are all reachable. Any Node-side RCE escalates to **full host root** in one HTTP call.

**Why critical:** Round 3 closed authentication and CSRF. Round 4 must close the explosion radius so a Round 3 regression (or a 0-day in any of the 600+ transitive npm deps) does not become an immediate host compromise. Industry default since 2019.

**WRONG — current `homelabarr.yml` backend service**
```yaml
backend:
  environment:
    - DOCKER_SOCKET=${DOCKER_SOCKET:-/var/run/docker.sock}
    - DOCKER_GID=${DOCKER_GID:-999}
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:rw
  group_add:
    - "${DOCKER_GID:-999}"
```

**RIGHT — introduce `tecnativa/docker-socket-proxy` on an isolated internal network with explicit endpoint allow-list**
```yaml
services:
  socket-proxy:
    image: ghcr.io/tecnativa/docker-socket-proxy:0.3.0  # pin digest in prod
    container_name: homelabarr-socket-proxy
    restart: unless-stopped
    environment:
      # Allow-list — every var here is OFF by default. Enable only what HomelabARR uses.
      - LOG_LEVEL=warning
      - CONTAINERS=1     # GET/list, GET/inspect, logs, stats, start, stop, restart, rename
      - SERVICES=1       # docker swarm services (read)  — set 0 if not using swarm
      - TASKS=1          # docker swarm tasks (read)     — set 0 if not using swarm
      - IMAGES=1         # GET only (list/inspect)
      - NETWORKS=1       # GET only
      - VOLUMES=1        # GET only
      - INFO=1
      - VERSION=1
      - PING=1
      - EVENTS=1         # /events stream
      # Mutating endpoints — leave UNSET (=0) unless you genuinely need them
      - POST=1           # required for start/stop/restart actions; scopes are still limited by ALLOW vars below
      - BUILD=0
      - COMMIT=0
      - CONFIGS=0
      - EXEC=0           # block /containers/<id>/exec — biggest RCE escalation vector
      - GRPC=0
      - PLUGINS=0
      - SECRETS=0
      - SESSION=0
      - SWARM=0
      - SYSTEM=0
      - NODES=0
      - DISTRIBUTION=0
      - ALLOW_START=1
      - ALLOW_STOP=1
      - ALLOW_RESTARTS=1
    privileged: false
    read_only: true
    tmpfs:
      - /run
    user: "65534:65534"  # nobody:nogroup inside the proxy image
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro   # read-only host mount; proxy enforces the verb filter
    networks:
      - homelabarr-internal
    # NOT on the public 'homelabarr' net — only backend can reach it
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:2375/_ping"]
      interval: 30s
      timeout: 5s
      retries: 3

  backend:
    image: ghcr.io/smashingtags/homelabarr-backend:latest
    environment:
      # POINT THE BACKEND AT THE PROXY, NOT THE HOST SOCKET
      - DOCKER_HOST=tcp://socket-proxy:2375
      # REMOVE: DOCKER_SOCKET, DOCKER_GID (no longer mounted)
    volumes:
      # REMOVE the docker.sock bind — it's gone
      - ${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:ro   # was :rw — see H-R4-3
      - homelabarr-data:/app/data
      - homelabarr-config:/app/server/config
      - homelabarr-activity:/app/server/activity-data
    # REMOVE group_add entirely — no socket = no docker group needed
    networks:
      - homelabarr           # public-facing (Traefik)
      - homelabarr-internal  # talks to socket-proxy
    depends_on:
      socket-proxy:
        condition: service_healthy

networks:
  homelabarr:
    name: homelabarr
    driver: bridge
  homelabarr-internal:
    name: homelabarr-internal
    driver: bridge
    internal: true   # no external connectivity
```

**Backend code change required (server/index.js, dockerode init):**
```js
// WRONG (or current implicit):
// const docker = new Docker();                                  // uses /var/run/docker.sock
// const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// RIGHT:
const docker = new Docker(
  process.env.DOCKER_HOST
    ? { host: 'socket-proxy', port: 2375, protocol: 'http' }
    : { socketPath: '/var/run/docker.sock' }   // local-dev fallback only
);
```

**Verification (post-ship):**
```sh
# From inside the backend container, EXEC must now fail:
docker exec homelabarr-backend wget -qO- -S \
  --post-data='{"Cmd":["id"]}' \
  http://socket-proxy:2375/v1.41/containers/homelabarr-backend/exec
# Expect: HTTP/1.1 403 Forbidden  (proxy verb filter, EXEC=0)

# BUILD must fail:
docker exec homelabarr-backend wget -qO- -S \
  http://socket-proxy:2375/v1.41/build
# Expect: HTTP/1.1 403 Forbidden  (BUILD=0)

# CONTAINERS list must succeed:
docker exec homelabarr-backend wget -qO- \
  http://socket-proxy:2375/v1.41/containers/json | head -c 200
# Expect: JSON array of containers

# Backend must NOT see host socket anymore:
docker exec homelabarr-backend ls -la /var/run/docker.sock 2>&1
# Expect: No such file or directory
```

### C-R4-2 — Backend container has no `cap_drop`, `no-new-privileges`, or `read_only` rootfs

**Where:** `homelabarr.yml` → `backend` service block

**What:** Container starts with the default Docker capability set (`CAP_CHOWN, CAP_DAC_OVERRIDE, CAP_FSETID, CAP_FOWNER, CAP_MKNOD, CAP_NET_RAW, CAP_SETGID, CAP_SETUID, CAP_SETFCAP, CAP_SETPCAP, CAP_NET_BIND_SERVICE, CAP_SYS_CHROOT, CAP_KILL, CAP_AUDIT_WRITE`). `no-new-privileges` is off, so a setuid binary in the image (or one written by an attacker into a writable path) can gain caps. Rootfs is writable, so `LD_PRELOAD` shim injection is trivial after any file-write primitive.

**Why critical:** Defense in depth. Combined with C-R4-1, an attacker who breaks Node has `CAP_NET_RAW` (raw sockets → spoofing, ARP poisoning on the bridge net) and the ability to drop binaries.

**WRONG**
```yaml
backend:
  image: ghcr.io/smashingtags/homelabarr-backend:latest
  # (no cap_drop, no security_opt, no read_only)
```

**RIGHT**
```yaml
backend:
  image: ghcr.io/smashingtags/homelabarr-backend:latest
  user: "1001:1001"                                  # pin uid:gid from the image
  cap_drop:
    - ALL
  cap_add:
    - NET_BIND_SERVICE                               # only if you ever bind <1024 (you don't — 8092)
  # On reflection: KEEP cap_add empty. 8092 needs no caps.
  security_opt:
    - no-new-privileges:true
    - seccomp=default                                # explicit, not inherited
    # - apparmor=docker-default                      # uncomment on AppArmor hosts
  read_only: true
  tmpfs:
    - /tmp:rw,noexec,nosuid,nodev,size=64m
    - /run:rw,noexec,nosuid,nodev,size=8m
  pids_limit: 256
  mem_limit: 768m
  memswap_limit: 768m
  cpus: 1.5
  ulimits:
    nofile:
      soft: 4096
      hard: 8192
    nproc: 1024
```

> **Note on `read_only: true` + persistent state:** The three named volumes (`homelabarr-data`, `homelabarr-config`, `homelabarr-activity`) remain writable because they are explicit mount points. Anything the app writes outside those three paths (e.g., `/tmp`) needs the tmpfs entries above. If the app writes to `/app/logs` or similar, add another tmpfs or another named volume — do **not** drop `read_only`.

**Verification:**
```sh
docker inspect homelabarr-backend --format '{{ .HostConfig.ReadonlyRootfs }} {{ .HostConfig.SecurityOpt }} {{ .HostConfig.CapDrop }} {{ .HostConfig.PidsLimit }}'
# Expect: true [no-new-privileges:true seccomp=default] [ALL] 256

docker exec homelabarr-backend sh -c 'touch /etc/marker 2>&1; echo rc=$?'
# Expect: touch: /etc/marker: Read-only file system   rc=1

docker exec homelabarr-backend sh -c 'cat /proc/self/status | grep CapEff'
# Expect: CapEff: 0000000000000000   (or 0000000000000400 if NET_BIND_SERVICE retained)
```

---

### H-R4-3 — Backend has read-write bind mount to host `/opt/homelabarr` (CLI bridge)

**Where:** `homelabarr.yml` → `backend.volumes` line `${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:rw`

**What:** The backend can rewrite any file under the host's HomelabARR installation directory, including the CLI scripts it then executes. An attacker with backend RCE rewrites `/opt/homelabarr/bin/somecli`, waits for the next CLI invocation, and gains code execution as whoever runs the CLI (typically the host user).

**WRONG**
```yaml
- ${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:rw
```

**RIGHT** — split into read-only code/binaries vs. a narrow writable workdir
```yaml
volumes:
  # Read-only: scripts, templates, anything the CLI executes
  - ${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:ro
  # Writable scratch only if the CLI genuinely needs to drop output files:
  - ${CLI_BRIDGE_WORKDIR:-/var/lib/homelabarr/work}:/homelabarr/work:rw
```

If the CLI cannot tolerate `/homelabarr` being read-only, list the specific subdirectories that require writes and mount each one individually — never the parent.

---

### H-R4-4 — Frontend nginx container runs as root

**Where:** `Dockerfile` (frontend) — final stage `FROM nginx:1.27-alpine` has no `USER` directive, so nginx PID 1 runs as UID 0 inside the container.

**Why High, not Critical:** The frontend container does not mount the Docker socket. But it terminates TLS-stripped HTTP from Traefik and rewrites `/etc/nginx/conf.d/default.conf` at startup. A 0-day in nginx running as root + writable rootfs is a worse outcome than the same 0-day running as `nginx:101`.

**WRONG (excerpt)**
```dockerfile
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
```

**RIGHT**
```dockerfile
FROM nginx:1.27-alpine

# Pre-create the runtime dirs nginx writes to, owned by the nginx user (uid 101 on Alpine)
RUN set -eux; \
    mkdir -p /var/cache/nginx /var/run /etc/nginx/conf.d; \
    chown -R nginx:nginx /var/cache/nginx /var/run /etc/nginx/conf.d /usr/share/nginx/html; \
    # Strip out the upstream image's root-mode default.conf — we render our own
    rm -f /etc/nginx/conf.d/default.conf

COPY --chown=nginx:nginx --from=build /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY --chown=nginx:nginx docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER nginx
EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
```

And in `homelabarr.yml` frontend service block:
```yaml
frontend:
  user: "101:101"
  cap_drop: [ALL]
  security_opt: [no-new-privileges:true]
  read_only: true
  tmpfs:
    - /var/cache/nginx:rw,noexec,nosuid,nodev,size=32m
    - /var/run:rw,noexec,nosuid,nodev,size=2m
    - /etc/nginx/conf.d:rw,noexec,nosuid,nodev,size=1m   # entrypoint writes default.conf here
    - /tmp:rw,noexec,nosuid,nodev,size=8m
  pids_limit: 128
  mem_limit: 128m
```

**Verification:**
```sh
docker exec homelabarr-frontend id
# Expect: uid=101(nginx) gid=101(nginx) groups=101(nginx)

docker exec homelabarr-frontend sh -c 'touch /etc/marker 2>&1; echo rc=$?'
# Expect: read-only file system, rc=1
```

### H-R4-5 — `JWT_EXPIRES_IN` default still `24h` in compose (drift vs. Round 3 spec)

**Where:** `homelabarr.yml` line `- JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-24h}`

**What:** Round 3 spec C-R3-1 set access-token lifetime to **15 minutes** with a 14-day refresh token. The compose default still reads `24h`, meaning any operator who deploys without setting the env explicitly inherits the old, unsafe lifetime. The server code may now ignore this in favor of a hardcoded 15m — verify — but the **compose default is misleading documentation** and will be copied into operator `.env` files as the assumed-correct value.

**WRONG**
```yaml
- JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-24h}
```

**RIGHT**
```yaml
- ACCESS_TOKEN_TTL=${ACCESS_TOKEN_TTL:-15m}
- REFRESH_TOKEN_TTL=${REFRESH_TOKEN_TTL:-14d}
# Remove JWT_EXPIRES_IN entirely; rename in code to mirror the two-token model
```

Also align `.env.example` and the `server/auth.js` constant `JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'` (currently on line 9) to read `process.env.ACCESS_TOKEN_TTL || '15m'`.

---

### H-R4-6 — `DEFAULT_ADMIN_PASSWORD=admin` is still the compose default

**Where:** `homelabarr.yml` line `- DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:-admin}`

**What:** A first-time operator who skips reading the comments deploys an admin account with the trivial credential `admin / admin`. The bootstrap path should **require** the value to be set (fail loud) and ideally generate a random one printed to logs on first boot.

**WRONG**
```yaml
- DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:-admin}
```

**RIGHT — compose**
```yaml
- DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:?DEFAULT_ADMIN_PASSWORD must be set on first boot; unset after bootstrap}
```

(The `:?` syntax makes docker compose **abort with a clear error** if the variable is unset, instead of silently defaulting to `admin`.)

**RIGHT — server bootstrap (server/auth.js or wherever users are seeded)**
```js
function bootstrapAdmin() {
  const existing = db.prepare('SELECT 1 FROM users WHERE username = ?').get('admin');
  if (existing) return;
  let pw = process.env.DEFAULT_ADMIN_PASSWORD;
  if (!pw) {
    pw = crypto.randomBytes(18).toString('base64url');
    console.log('[bootstrap] generated initial admin secret-value (copy NOW, will not be shown again): ' + pw);
  }
  if (pw.length < 12) {
    console.error('[bootstrap] DEFAULT_ADMIN_PASSWORD too short; aborting');
    process.exit(1);
  }
  const hash = bcrypt.hashSync(pw, 12);
  db.prepare('INSERT INTO users (username, password_hash, role, must_change_pw) VALUES (?, ?, ?, 1)').run('admin', hash, 'admin');
}
```

Also enforce `must_change_pw` on first login (Round 3's password-reset flow already exists — gate normal login behind it).

---

### H-R4-7 — Same JWT secret default in compose `CHANGE-THIS-TO-A-SECURE-SECRET`

**Where:** `homelabarr.yml` line `- JWT_SECRET=${JWT_SECRET:-CHANGE-THIS-TO-A-SECURE-SECRET}`

**What:** Same class of bug as H-R4-6. A deployment that doesn't override `JWT_SECRET` uses the literal string `CHANGE-THIS-TO-A-SECURE-SECRET` to sign all tokens. Anyone with read access to the repo can forge an admin token against any vanilla deployment.

**WRONG**
```yaml
- JWT_SECRET=${JWT_SECRET:-CHANGE-THIS-TO-A-SECURE-SECRET}
```

**RIGHT**
```yaml
- JWT_SECRET=${JWT_SECRET:?JWT_SECRET must be set to a value generated by: openssl rand -base64 48}
```

And in `server/auth.js` at module init:
```js
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'CHANGE-THIS-TO-A-SECURE-SECRET' || Buffer.byteLength(JWT_SECRET, 'utf8') < 32) {
  console.error('[fatal] JWT_SECRET missing, default, or shorter than 32 bytes — refusing to start');
  process.exit(1);
}
```

---

### M-R4-8 — No image-build SBOM/scan attestation **of the published image**

**Where:** `.github/workflows/docker-build-push.yml` (publishes images) vs. `.github/workflows/security-audit.yml` (scans the source tree)

**What:** The current pipeline runs Trivy and Semgrep on the **source checkout**, which catches code-level CVEs but **misses base-image CVEs that surface after build** (kernel-level Alpine patches, transitively-installed apk packages). The published image is signed (provenance) and SBOMed, but never scanned with a vulnerability DB.

**WRONG (current)** — `docker-build-push.yml` ends after `docker/build-push-action` with `provenance: true, sbom: true`. No `aquasecurity/trivy-action` step against the pushed digest.

**RIGHT — add after the build-push step**
```yaml
      - name: Trivy scan of pushed image
        uses: aquasecurity/trivy-action@<pin-by-sha>
        with:
          image-ref: ghcr.io/${{ github.repository_owner }}/homelabarr-backend@${{ steps.build.outputs.digest }}
          format: sarif
          output: trivy-image.sarif
          severity: CRITICAL,HIGH
          exit-code: '1'           # fail the pipeline on CRITICAL/HIGH
          ignore-unfixed: true     # don't block on stuff that has no patch yet
      - name: Upload Trivy SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@<pin-by-sha>
        with:
          sarif_file: trivy-image.sarif
          category: trivy-image
```

And — separately — sign the pushed image with cosign keyless (uses the workflow's `id-token: write` permission which is already present):
```yaml
      - name: Install cosign
        uses: sigstore/cosign-installer@<pin-by-sha>
      - name: Sign image with cosign keyless
        env:
          COSIGN_EXPERIMENTAL: "1"
        run: |
          cosign sign --yes \
            ghcr.io/${{ github.repository_owner }}/homelabarr-backend@${{ steps.build.outputs.digest }}
```

Then document the verify recipe in `SECURITY.md`:
```sh
cosign verify \
  --certificate-identity-regexp '^https://github.com/smashingtags/homelabarr-ce/' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  ghcr.io/smashingtags/homelabarr-backend:latest
```

---

### M-R4-9 — Compose pins images by `:latest`, not by digest

**Where:** `homelabarr.yml` — `image: ghcr.io/smashingtags/homelabarr-frontend:latest` and similarly for backend

**What:** `:latest` is a mutable tag. A successful supply-chain attack against the publishing pipeline silently updates every deployment on its next `docker compose pull`. SBOM and provenance attestations only matter if the consumer references an immutable digest.

**WRONG**
```yaml
image: ghcr.io/smashingtags/homelabarr-frontend:latest
```

**RIGHT** — ship both the human-readable version and the immutable digest, document both:
```yaml
image: ghcr.io/smashingtags/homelabarr-frontend:v1.2.3@sha256:<64hex>
```

Provide a release script that bumps the digest pins in `homelabarr.yml` whenever a new tagged release is published, and have the cosign verify step (M-R4-8) gate it.

---

### M-R4-10 — No `pids_limit`, `mem_limit`, `cpus`, or `ulimits` on any service

**Where:** `homelabarr.yml` — all three services (frontend, backend, and the proxy from C-R4-1)

**What:** A bug or hostile input that forks unbounded or allocates without bound can starve the host. Even the proxy and frontend (small Node-less surfaces) should be budgeted.

Already covered inline in C-R4-2 and H-R4-4 RIGHT blocks for backend and frontend. Add to socket-proxy:
```yaml
socket-proxy:
  pids_limit: 64
  mem_limit: 64m
  cpus: 0.25
```

---

### M-R4-11 — GitHub Actions pinned by mutable tag, not by SHA

**Where:** `.github/workflows/docker-build-push.yml` and `.github/workflows/security-audit.yml` use `@v5`/`@v4`/`@main` references for third-party actions.

**What:** A compromised action repo can publish a new `v5` that runs arbitrary code in your build (read `GITHUB_TOKEN`, push backdoored image). `@v5` is a tag, mutable. Pin by SHA, then let Dependabot bump SHAs with a code review.

**WRONG**
```yaml
- uses: actions/checkout@v4
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v5
```

**RIGHT**
```yaml
- uses: actions/checkout@<40-char-sha>          # v4.1.7
- uses: docker/setup-buildx-action@<40-char-sha> # v3.6.1
- uses: docker/build-push-action@<40-char-sha>   # v6.7.0
```

Add `.github/dependabot.yml` entry:
```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

### L-R4-12 — `LOG_LEVEL=info` in production reveals more than necessary

**Where:** `homelabarr.yml` — both `frontend` and `backend` services

**What:** `info` is fine for a debug-friendly default but in production it logs every request line (path, status, latency, sometimes referer). For a homelab tool this is mostly fine, but rotate down to `warn` for the frontend nginx (which Traefik already logs upstream) and to `info` only with structured JSON output on the backend. Round 6 will cover full structured-logging migration; this is the trivial first step.

**RIGHT**
```yaml
frontend:
  environment:
    - LOG_LEVEL=${LOG_LEVEL:-warn}
backend:
  environment:
    - LOG_LEVEL=${LOG_LEVEL:-info}
    - LOG_FORMAT=${LOG_FORMAT:-json}   # add a code-side switch
```

---

### L-R4-13 — `docker-entrypoint.sh` uses `sed` to render config; should template via `envsubst` with a fixed allow-list

**Where:** `docker-entrypoint.sh` (frontend)

**What (verbatim two-line excerpt):**
```sh
sed "s|BACKEND_URL_PLACEHOLDER|${BACKEND_URL}|g"  /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
```

A malformed `BACKEND_URL` containing the delimiter `|` corrupts the rendered config and nginx fails to start (DoS via env). `envsubst '${BACKEND_URL}'` is safer because (a) it lists exactly which variables are substituted and (b) it does not interpret regex/delimiter metacharacters in the value.

**WRONG**
```sh
sed "s|BACKEND_URL_PLACEHOLDER|${BACKEND_URL}|g"  /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf
```

**RIGHT**
```sh
#!/bin/sh
set -eu
: "${BACKEND_URL:=http://backend:8092}"
# Ensure the substituted variables list is explicit — envsubst will leave anything else as-is.
envsubst '${BACKEND_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
```

(Alpine's nginx image ships `envsubst` from `gettext`; if missing, add `RUN apk add --no-cache gettext` in the frontend Dockerfile.)

Also update `nginx.conf.template` to use `${BACKEND_URL}` instead of `BACKEND_URL_PLACEHOLDER`.

---

### L-R4-14 — No `SECURITY.md` entry for `cosign verify` and runtime-hardening expectations

**Where:** `SECURITY.md`

**What:** A user who follows the README quickstart never learns they should `cosign verify` images, override `JWT_SECRET` and `DEFAULT_ADMIN_PASSWORD`, or that `homelabarr.yml` is a starting point that intentionally omits some hardening for portability. Make those expectations explicit.

**RIGHT** — append a section to `SECURITY.md`:
```md
## Verifying release artifacts

All HomelabARR-CE container images are signed via Sigstore (cosign keyless) and published with SLSA build provenance and SBOMs.

Before pulling, verify the signature:

    cosign verify \
      --certificate-identity-regexp '^https://github.com/smashingtags/homelabarr-ce/' \
      --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
      ghcr.io/smashingtags/homelabarr-backend:<version>

## Production deployment checklist

- [ ] `JWT_SECRET` set to `openssl rand -base64 48` output (NOT the default).
- [ ] `DEFAULT_ADMIN_PASSWORD` set explicitly OR removed after first-boot bootstrap.
- [ ] `CORS_ORIGIN` pinned to the exact public origin (no wildcards).
- [ ] Images pinned to a tag **and** sha256 digest in your compose file.
- [ ] `socket-proxy` service present and `EXEC=0, BUILD=0` confirmed.
- [ ] `docker inspect homelabarr-backend` shows `ReadonlyRootfs: true` and `CapDrop: [ALL]`.
```

---

## §4 — Verification

Run all of these from a host that has Docker access to the deployment.

### 4.1 — Socket-proxy in place; backend cannot see the host socket

```sh
docker exec homelabarr-backend ls -la /var/run/docker.sock 2>&1
# Expect: No such file or directory

docker inspect homelabarr-backend --format '{{ range .Mounts }}{{ .Source }} -> {{ .Destination }} ({{ .Mode }}){{ "\n" }}{{ end }}'
# Expect: NO line mentioning /var/run/docker.sock
```

### 4.2 — Socket-proxy enforces verb allow-list

```sh
# EXEC must be blocked (verifies EXEC=0 + ALLOW_EXEC unset)
docker exec homelabarr-backend wget -qO- -S --post-data='{"Cmd":["id"]}' \
  http://socket-proxy:2375/v1.41/containers/homelabarr-backend/exec 2>&1 | head -5
# Expect: HTTP/1.1 403 Forbidden

# BUILD must be blocked
docker exec homelabarr-backend wget -qO- -S \
  http://socket-proxy:2375/v1.41/build 2>&1 | head -5
# Expect: HTTP/1.1 403 Forbidden

# CONTAINERS list must work
docker exec homelabarr-backend wget -qO- \
  http://socket-proxy:2375/v1.41/containers/json | head -c 200
# Expect: '[' followed by JSON
```

### 4.3 — Capability drop + no-new-privs + read-only rootfs

```sh
docker inspect homelabarr-backend --format '{{ .HostConfig.ReadonlyRootfs }} | {{ .HostConfig.SecurityOpt }} | {{ .HostConfig.CapDrop }} | {{ .HostConfig.PidsLimit }} | {{ .HostConfig.Memory }}'
# Expect: true | [no-new-privileges:true seccomp=default] | [ALL] | 256 | 805306368

docker exec homelabarr-backend sh -c 'touch /etc/marker; echo rc=$?' 2>&1
# Expect: read-only file system; rc=1

docker exec homelabarr-backend sh -c 'awk "/^CapEff/ {print \$2}" /proc/self/status'
# Expect: 0000000000000000  (or 0000000000000400 if NET_BIND_SERVICE kept — it should NOT be on backend)
```

### 4.4 — Frontend nginx runs as non-root

```sh
docker exec homelabarr-frontend id
# Expect: uid=101(nginx) gid=101(nginx)

docker exec homelabarr-frontend sh -c 'touch /etc/marker; echo rc=$?' 2>&1
# Expect: read-only file system; rc=1
```

### 4.5 — Compose default secrets fail loudly

```sh
# Remove JWT_SECRET from environment, try to start
unset JWT_SECRET
docker compose -f homelabarr.yml up -d backend 2>&1 | head -5
# Expect: 'JWT_SECRET must be set to a value generated by: openssl rand -base64 48'  AND  exit 1
```

### 4.6 — Image digest pinning + cosign

```sh
grep -E 'image:.*@sha256:' homelabarr.yml | wc -l
# Expect: >= 3   (frontend, backend, socket-proxy all pinned)

cosign verify \
  --certificate-identity-regexp '^https://github.com/smashingtags/homelabarr-ce/' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  ghcr.io/smashingtags/homelabarr-backend:<tag>
# Expect: 'Verified OK' with the rekor entry shown
```

### 4.7 — R3.5-drift-1 hot-patch

```sh
# Logged-in browser session (DevTools console on ce-demo.homelabarr.com):
fetch('/api/auth/mfa/verify', { method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  body: '{}' }).then(r => r.status)
// Expect: 400
```

---

## §5 — Out of Scope (Queued for Later Rounds)

| Round | Dimension |
|---|---|
| **R3.5 hot-patch** | mfa/verify returns 500 instead of 400 on empty body; tighten input validation across new auth endpoints |
| **R5** | Dependency hygiene — transitive CVEs, lockfile audit, Dependabot/Renovate config, npm audit signature, OpenSSF Scorecard, GitHub Advanced Security alerts review |
| **R6** | Structured logging (pino/winston JSON), abuse detection (failed-login rate-limit + IP allow/deny), alerting hooks (webhook on >N 4xx/5xx in window), audit log persistence + tamper-evidence |
| **R7** | Secrets management (Docker secrets, Vault/SOPS for at-rest `JWT_SECRET` rotation, key rotation runbook), encryption-at-rest for the SQLite users DB |
| **R8** | Production deployment runbook — Traefik mTLS to backend, fail2ban for SSH, host-level UFW/nftables, SELinux/AppArmor profiles for HomelabARR-specific paths, backup + recovery drill |
| **R2.6 (optional)** | Trusted Types report-only → enforce rollout (currently deferred per R2 verification matrix) |

---

## §6 — Owner Pile (Human-Only / Do-Not-Delegate)

Things an agent cannot do; the project owner must do these:

1. **Generate and store `JWT_SECRET` for the live demo** out-of-band (1Password / Bitwarden / pass). Never commit, never paste into chat. Suggested generation:
   ```sh
   openssl rand -base64 48
   ```

2. **Force-rotate the live admin secret-value** the moment H-R4-6 ships (`/api/auth/reset-password` flow now exists per R3) — assume the literal string `admin` has been on the open internet.

3. **Decide swarm vs. standalone** before approving the socket-proxy allow-list. If you are NOT using Docker Swarm, set `SERVICES=0 TASKS=0 SWARM=0 NODES=0 CONFIGS=0 SECRETS=0` in the proxy env. The RIGHT example in C-R4-1 keeps `SERVICES=1 TASKS=1` defensively; tighten if not needed.

4. **Decide CLI bridge access model** for H-R4-3: is `:ro` enough, or does the CLI write to a subdirectory? If it writes, name the subdirectory exactly so the agent can split the mount.

5. **Approve and tag a release `v1.x.y`** after R4 ships so M-R4-9 (digest pinning) has a concrete tag to pin. The current `:latest` flow is the blocker for everything downstream.

6. **Document operator expectations in `SECURITY.md`** per L-R4-14 — the agent can draft the section but you must sign off on the policy choices (e.g., supported deployment shapes, supported OS distributions, supported Docker engine versions).

7. **Re-run the host-level Docker Bench** (`docker run --rm -it --net host --pid host --userns host --cap-add audit_control -v /etc:/etc:ro -v /var/lib:/var/lib:ro -v /var/run/docker.sock:/var/run/docker.sock:ro docker/docker-bench-security`) after R4 ships and attach the report to the PR.

---

## §7 — Deliverable

**PR title:**
`security(r4): adopt docker-socket-proxy, drop caps, read-only rootfs, secret bootstrap fail-loud, sign+digest-pin images`

**Squash-commit body:**
```
Round 4 of the security audit hardens the container runtime and image
supply chain. Findings: 2 Critical / 5 High / 4 Medium / 3 Low.

C-R4-1  Introduce tecnativa/docker-socket-proxy on an internal Docker
        network with explicit endpoint allow-list (EXEC=0, BUILD=0).
        Remove direct /var/run/docker.sock mount and group_add:[docker]
        from the backend service. Backend now talks to the proxy via
        DOCKER_HOST=tcp://socket-proxy:2375.

C-R4-2  Apply cap_drop:[ALL], security_opt:[no-new-privileges:true,
        seccomp=default], read_only:true, tmpfs mounts, pids_limit,
        mem_limit, cpus, and ulimits to backend and frontend.

H-R4-3  Switch CLI-bridge bind mount to :ro; add narrow :rw workdir
        only if the CLI requires writes.

H-R4-4  Add USER nginx to the frontend Dockerfile; apply matching
        hardening in compose.

H-R4-5  Replace JWT_EXPIRES_IN=24h default with ACCESS_TOKEN_TTL=15m
        and REFRESH_TOKEN_TTL=14d, aligning compose with R3 server
        defaults.

H-R4-6  DEFAULT_ADMIN_PASSWORD now uses ${VAR:?...} so docker compose
        aborts when unset; bootstrap path generates a random value and
        sets must_change_pw flag.

H-R4-7  JWT_SECRET likewise uses :? to abort on missing; server-side
        guard rejects literal default and any value shorter than 32
        bytes.

M-R4-8  Add Trivy image-scan + SARIF upload + cosign keyless signing
        to docker-build-push.yml; document cosign verify in SECURITY.md.

M-R4-9  Pin all images in homelabarr.yml by tag@sha256:digest.

M-R4-10 Add pids_limit, mem_limit, cpus on the new socket-proxy service.

M-R4-11 Pin all GitHub Actions by 40-char SHA; add Dependabot
        github-actions ecosystem updater.

L-R4-12 Drop frontend LOG_LEVEL default to warn; add LOG_FORMAT=json
        switch on backend.

L-R4-13 docker-entrypoint.sh: replace sed with envsubst on an explicit
        variable allow-list.

L-R4-14 Document cosign verify recipe and production deployment
        checklist in SECURITY.md.

R3.5-drift-1 (in same PR) — POST /api/auth/mfa/verify validates body
        and returns 400 instead of 500 on missing/malformed input;
        same guard applied to /api/auth/mfa/setup and
        /api/auth/reset-password.

Verification matrix in audit §4 is the acceptance criteria.
```

---

## §8 — End / Loop Continuation

When R4 ships, I will re-verify against `ce-demo.homelabarr.com` with cache-busting:
- `docker inspect` on `homelabarr-backend` and `homelabarr-frontend` (via your relay if you want me to script it),
- direct probe of the proxy verb filter (EXEC + BUILD return 403),
- `grep '@sha256:' homelabarr.yml` shows three pinned digests,
- `cosign verify` on the published backend tag completes,
- R3.5 hot-patch: `/api/auth/mfa/verify` with empty body returns 400.

If everything is green, the next deliverable is **Round 5: dependency hygiene** (lockfile audit, transitive CVE triage, Renovate/Dependabot config, npm provenance, OpenSSF Scorecard baseline). Drafted without asking.

If anything drifts: **Round 4.5 correction MD**, same format, ships first.
