#!/usr/bin/env bash
set -eu
[ "$EUID" -eq 0 ] || { echo "must be root"; exit 1; }
if ! command -v apparmor_parser >/dev/null 2>&1; then
  echo "AppArmor not installed — skipping (SELinux hosts use a different profile)"
  exit 0
fi
cat >/etc/apparmor.d/homelabarr-backend <<'EOF'
#include <tunables/global>
profile homelabarr-backend flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  #include <abstractions/nameservice>
  network,
  /usr/bin/dumb-init ix,
  /bin/bash ix,
  /bin/sh ix,
  /bin/busybox rix,
  /app/server/start.sh r,
  /dev/tty rw,
  @{PROC}/@{pid}/cgroup r,
  /proc/version_signature r,
  /usr/bin/docker ix,
  /usr/bin/timeout ix,
  /usr/bin/sleep ix,
  /usr/bin/id ix,
  /usr/bin/mkdir ix,
  /usr/bin/chown ix,
  /usr/bin/curl ix,
  /usr/local/bin/node rmix,
  /usr/local/lib/** mr,
  /lib/** mr,
  /app/ r,
  /app/** mr,
  owner /app/data/** rwk,
  owner /app/server/config/** rwk,
  owner /app/server/activity-data/** rwk,
  owner /tmp/** rwk,
  owner /run/** rwk,
  /run/secrets/** r,
  deny /etc/** w,
  deny /var/** w,
  deny /usr/** w,
  deny /sys/** w,
  deny mount,
  deny ptrace,
}
EOF
apparmor_parser -r /etc/apparmor.d/homelabarr-backend
cat >/etc/apparmor.d/homelabarr-frontend <<'EOF'
#include <tunables/global>
profile homelabarr-frontend flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  #include <abstractions/nameservice>
  network,
  /usr/bin/dumb-init ix,
  /bin/sh ix,
  /bin/busybox rix,
  /docker-entrypoint.sh r,
  /docker-entrypoint.d/** r,
  /dev/tty rw,
  @{PROC}/@{pid}/cgroup r,
  /proc/version_signature r,
  /usr/bin/envsubst ix,
  /usr/sbin/nginx ix,
  /docker-entrypoint.sh ix,
  /usr/lib/nginx/** mr,
  /lib/** mr,
  /etc/nginx/** r,
  /usr/share/nginx/** r,
  owner /var/cache/nginx/** rwk,
  owner /var/run/** rwk,
  owner /etc/nginx/conf.d/** rwk,
  /tmp/** rwk,
  deny mount,
  deny ptrace,
}
EOF
apparmor_parser -r /etc/apparmor.d/homelabarr-frontend
aa-status | grep homelabarr-backend || echo "Profile loaded"
echo "AppArmor profiles installed: homelabarr-backend, homelabarr-frontend"

# Switch to enforce mode
systemctl reload apparmor 2>/dev/null || true

if ! aa-status 2>/dev/null | grep -E 'homelabarr-(backend|frontend)' | grep -q 'enforce'; then
  echo 'WARNING: AppArmor profile may not be in enforce mode'
fi
echo 'AppArmor: homelabarr profiles configured'
