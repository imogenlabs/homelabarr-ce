#!/usr/bin/env bash
# Generate point-in-time evidence snapshots for compliance/evidence/
# Run nightly via CI + on every release tag + on demand.
set -e

OUT=compliance/evidence
mkdir -p "$OUT"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
HEAD=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
HOST="${EVIDENCE_HOST:-ce-demo.homelabarr.com}"
BACKEND="${EVIDENCE_BACKEND:-homelabarr-demo-backend}"

hdr() { echo "# $1"; echo "# timestamp=$TS git=$HEAD"; echo; }

echo "Collecting evidence at $TS from $HOST..."

# --- CIS Section 5 (runtime) ---
if command -v docker >/dev/null 2>&1 && docker ps -q --filter "name=$BACKEND" | grep -q .; then
  { hdr "CIS 5.1 AppArmor profile"
    docker inspect "$BACKEND" --format '{{.AppArmorProfile}}' 2>/dev/null || echo "N/A"
  } > "$OUT/CIS-5.1-apparmor.txt"

  { hdr "CIS 5.3 cap drop/add"
    docker inspect "$BACKEND" --format '{{json .HostConfig.CapDrop}} {{json .HostConfig.CapAdd}}'
  } > "$OUT/CIS-5.3-caps.txt"

  { hdr "CIS 5.12 read-only rootfs"
    docker inspect "$BACKEND" --format '{{.HostConfig.ReadonlyRootfs}}'
  } > "$OUT/CIS-5.12-rootfs.txt"

  { hdr "CIS 5.14 no-new-privileges"
    docker inspect "$BACKEND" --format '{{json .HostConfig.SecurityOpt}}'
  } > "$OUT/CIS-5.14-nnp.txt"

  { hdr "CIS 5.28 pids limit"
    docker inspect "$BACKEND" --format '{{.HostConfig.PidsLimit}}'
  } > "$OUT/CIS-5.28-pids.txt"

  { hdr "CIS 5.29 no docker.sock mount in backend"
    docker inspect "$BACKEND" --format '{{range .Mounts}}{{.Source}}->{{.Destination}} {{end}}' | grep -c docker.sock || echo "0"
  } > "$OUT/CIS-5.29-no-sock.txt"

  { hdr "CIS 5.10 memory limit"
    docker inspect "$BACKEND" --format '{{.HostConfig.Memory}}'
  } > "$OUT/CIS-5.10-memory.txt"
else
  echo "Docker not available or $BACKEND not running — skipping container evidence"
fi

# --- ASVS V4 access control ---
{ hdr "ASVS V4.1.5 fail-closed (route gating)"
  curl -sI "https://$HOST/api/health/detail" | head -1
  curl -sI "https://$HOST/api/_routes" | head -1
} > "$OUT/ASVS-V4.1.5-fail-closed.txt"

# --- R10.7 honey body-shape proof ---
{ hdr "R10.7 honey body shape (T1595.002)"
  for p in /wp-login.php /phpmyadmin /.env /.git/config /api/admin/legacy-debug; do
    BODY=$(curl -s "https://$HOST$p")
    LEN=$(printf '%s' "$BODY" | wc -c | tr -d ' ')
    echo "$p len=$LEN body=\"$BODY\""
  done
} > "$OUT/R10.7-bodyshape.txt"

# --- R9.6 route gating proof ---
{ hdr "R9.6 route gating"
  for p in /api/health/detail /api/_routes /api/internal/audit /api/auth/cli-mint; do
    S=$(curl -s -o /dev/null -w '%{http_code}' "https://$HOST$p")
    echo "$p -> $S"
  done
} > "$OUT/R9.6-route-gating.txt"

echo "Evidence collected to $OUT/ at $TS ($HEAD)"
