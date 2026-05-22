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
  /usr/local/bin/node rmix,
  /usr/local/bin/npm rmix,
  /app/ r,
  /app/** r,
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
aa-status | grep homelabarr-backend || echo "Profile loaded"
echo "AppArmor profile installed: homelabarr-backend"
