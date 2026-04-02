#!/bin/bash
set -e

# HomelabARR CE — Traefik + Authelia Installer
# Called from the main install.sh menu (option 1)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALLER="$SCRIPT_DIR/installer/ubuntu.sh"

# Detect OS
if [ -f /etc/os-release ]; then
  . /etc/os-release
else
  echo "⛔ Cannot detect OS."
  exit 1
fi

case "$ID" in
  ubuntu|debian|raspbian)
    if [ -f "$INSTALLER" ]; then
      bash "$INSTALLER"
    else
      echo "⛔ Installer not found: $INSTALLER"
      exit 1
    fi
    ;;
  *)
    echo "⛔ Unsupported OS: $ID (supported: Ubuntu, Debian, Raspberry Pi OS)"
    exit 1
    ;;
esac
