# CIS Docker Benchmark v1.6.0 — HomelabARR CE Posture

Scope: container images + runtime configuration shipped by this repo.
Out of scope: host daemon flags (Section 2), host filesystem (Section 1), registry config (Section 3) — operator responsibility.

## Section 4 — Container Images

### 4.1 Ensure a user for the container has been created [Met]
Dockerfile.backend: `USER homelabarr` (uid 1001). Dockerfile frontend: `USER homelabarr` (uid 1001).
Evidence: `evidence/CIS-4.1-USER.txt`

### 4.2 Ensure containers use only trusted base images [Met]
Base images: `node:24-alpine`, `nginx:1.27-alpine`, `lscr.io/linuxserver/socket-proxy`. All from official/verified publishers. cosign verify in CI (R5).
Evidence: `evidence/CIS-4.2-cosign.txt`

### 4.3 Ensure unnecessary packages are not installed [Met]
Alpine-based images. Build tools (`python3`, `make`, `g++`) installed only in build stage and removed via `apk del .build`.
Evidence: `evidence/CIS-4.3-package-diff.txt`

### 4.4 Ensure images are scanned for vulnerabilities [Met]
Trivy scan on pushed digest in CI. Semgrep + CodeQL on source. OSV-Scanner on lockfile. Dependabot daily/weekly per [dependency-update-policy](../docs/governance/dependency-update-policy.md). SLA breach escalates to [PB-11](../docs/ir/playbooks/PB-11-security-update-past-sla.md); disclosed vulns handled per [PB-08](../docs/ir/playbooks/PB-08-disclosed-vuln.md).
Evidence: `evidence/CIS-4.4-trivy.txt`

### 4.5 Ensure Content trust for Docker is enabled [Partial]
cosign keyless signing on every image push (R5). Docker Content Trust (DCT/Notary) not enabled. cosign provides equivalent cryptographic attestation.
Evidence: `evidence/CIS-4.5-cosign-equivalent.txt`

### 4.6 Ensure HEALTHCHECK instructions have been added [Met]
Both Dockerfiles include HEALTHCHECK directives. Compose also defines healthchecks.

### 4.7 Ensure update instructions are not used alone [Met]
`apk upgrade --no-cache` runs with package install in the same layer.

### 4.9 Ensure COPY is used instead of ADD [Met]
Zero `ADD` instructions in either Dockerfile.

### 4.10 Ensure secrets are not stored in Dockerfiles [Met]
gitleaks in CI (R5). Secrets via Docker secrets file mounts (R7), not build args or ENV.

### 4.11 Ensure only verified packages are installed [Met]
`npm ci` with lockfile. `package-lock.json` committed. Dependabot + OSV-Scanner. Governed by [dependency-update-policy](../docs/governance/dependency-update-policy.md) with SLA enforcement and license deny-list via dependency-review workflow.

## Section 5 — Container Runtime

### 5.1 Ensure AppArmor profile is enabled [Met]
`security_opt: apparmor=homelabarr-backend` in compose. Profile installed via `scripts/install-apparmor.sh`.
Evidence: `evidence/CIS-5.1-apparmor.txt`

### 5.3 Ensure Linux kernel capabilities are restricted [Met]
`cap_drop: ALL` on all services. No `cap_add` on backend.
Evidence: `evidence/CIS-5.3-caps.txt`

### 5.4 Ensure privileged containers are not used [Met]
`privileged: false` (default, not overridden). Socket proxy explicitly sets `privileged: false`.

### 5.5 Ensure sensitive host directories are not mounted [Met]
Only named volumes mounted. Docker socket mounted `:ro` only on socket-proxy (not backend).

### 5.7 Ensure privileged ports are not mapped [Met]
Published ports: 8080 (frontend). No ports < 1024.

### 5.9 Ensure host network namespace is not shared [Met]
All services on custom bridge networks (`homelabarr`, `homelabarr-internal`). None on `host` mode.

### 5.10 Ensure memory usage for container is limited [Met]
`mem_limit` set on all services (768m backend, 128m frontend, 64m proxy).
Evidence: `evidence/CIS-5.10-memory.txt`

### 5.11 Ensure CPU priority is set [Met]
`cpus` set on backend (1.5) and proxy (0.25).

### 5.12 Ensure root filesystem is mounted read-only [Met]
`read_only: true` on all services. Writable paths via tmpfs only.
Evidence: `evidence/CIS-5.12-rootfs.txt`

### 5.14 Ensure no-new-privileges is set [Met]
`security_opt: no-new-privileges:true` on all services.
Evidence: `evidence/CIS-5.14-nnp.txt`

### 5.25 Ensure container is restricted from acquiring new privileges [Met]
Same as 5.14.

### 5.28 Ensure PID cgroup limit is set [Met]
`pids_limit` set: 256 (backend), 128 (frontend), 64 (proxy).
Evidence: `evidence/CIS-5.28-pids.txt`

### 5.29 Ensure Docker socket is not mounted inside container [Met]
Backend has no docker.sock mount. Socket proxy has `:ro` mount with endpoint allowlist (EXEC=0, BUILD=0).
Evidence: `evidence/CIS-5.29-no-sock.txt`

### 5.31 Ensure docker.sock is not mounted with write permissions [Met]
Socket proxy mount is `:ro`. Backend has no socket mount at all.
