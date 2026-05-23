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

# --- R6 audit log chain integrity (actual validator, not just tail dump) ---
if command -v docker >/dev/null 2>&1 && docker ps -q --filter "name=$BACKEND" | grep -q .; then
  { hdr "R6 audit chain integrity"
    docker exec "$BACKEND" sh -c 'node -e "
      const fs = require(\"fs\"), path = require(\"path\");
      const dir = \"/app/server/activity-data\";
      try {
        const files = fs.readdirSync(dir).filter(f => /^audit-.*\\.jsonl\$/.test(f)).sort();
        let prev = null, ok = 0, bad = 0, total = 0, first_bad = null;
        for (const f of files) {
          const lines = fs.readFileSync(path.join(dir, f), \"utf8\").split(\"\\n\").filter(Boolean);
          for (const line of lines) {
            total++;
            try {
              const e = JSON.parse(line);
              const hash = e.row_hash || e.hash || e.hash_curr;
              const ph = e.prev_hash || e.hash_prev;
              if (prev !== null && ph !== prev) {
                bad++;
                if (!first_bad) first_bad = { seq: total, expected: prev, got: ph };
              } else { ok++; }
              prev = hash;
            } catch (err) { bad++; if (!first_bad) first_bad = { seq: total, err: String(err) }; }
          }
        }
        console.log(JSON.stringify({ ok, bad, total, first_bad, files: files.length }));
      } catch (e) { console.log(JSON.stringify({ error: e.message })); }
    " 2>/dev/null || echo "{\"error\":\"audit-chain validator failed\"}"'
  } > "$OUT/R6-audit-chain.txt"
fi

# --- R5 cosign verify on latest image ---
{ hdr "R5 cosign verify"
  if command -v docker >/dev/null 2>&1; then
    IMG=$(docker inspect "$BACKEND" --format '{{.Config.Image}}' 2>/dev/null || echo "unknown")
    echo "Image: $IMG"
    echo
    if command -v cosign >/dev/null 2>&1; then
      cosign verify \
        --certificate-identity-regexp 'smashingtags' \
        --certificate-oidc-issuer https://token.actions.githubusercontent.com \
        "$IMG" 2>&1 | head -40
    else
      echo "cosign not installed on this runner"
    fi
  else
    echo "Docker not available"
  fi
} > "$OUT/R5-cosign.txt"

# --- R12 SLO snapshot ---
if command -v docker >/dev/null 2>&1 && docker ps -q --filter "name=$BACKEND" | grep -q .; then
  { hdr "R12 SLO snapshot (last 24h)"
    docker exec "$BACKEND" sh -c '
      if [ -r /var/log/nginx/access.log ]; then
        HEALTH_TOTAL=$(grep -c " /api/health " /var/log/nginx/access.log 2>/dev/null || echo 0)
        HEALTH_200=$(grep " /api/health " /var/log/nginx/access.log 2>/dev/null | grep -c " 200 " || echo 0)
        echo "{\"health_total\":${HEALTH_TOTAL},\"health_200\":${HEALTH_200},\"login_p95_seconds\":null}"
      else
        echo "{\"error\":\"nginx access log not readable from backend container\"}"
      fi
    ' 2>/dev/null || echo '{"error":"could not exec into backend"}'
  } > "$OUT/R12-slo-snapshot.txt"
else
  { hdr "R12 SLO snapshot"; echo '{"error":"docker not available or backend not running"}'; } > "$OUT/R12-slo-snapshot.txt"
fi

# --- R15 dependency staleness snapshot ---
{ hdr "R15 dependency staleness snapshot"
  if command -v gh >/dev/null 2>&1; then
    RUN_ID=$(gh run list --workflow=dependency-staleness.yml --limit=1 --json databaseId -q '.[0].databaseId' 2>/dev/null || echo "")
    if [ -n "${RUN_ID}" ]; then
      gh run view "${RUN_ID}" --log 2>/dev/null | tail -100 || echo "(could not fetch staleness log)"
    else
      echo "(no staleness runs yet)"
    fi
    gh pr list --label dependencies --state open --json number,title,createdAt 2>/dev/null || echo "[]"
  else
    echo "(gh not available; skipping)"
  fi
} > "$OUT/R15-dep-staleness.txt"

echo "Evidence collected to $OUT/ at $TS ($HEAD)"
