#!/bin/bash
set -e

# HomelabARR CE — Installer
# Detects OS, ensures Docker is installed, presents the setup menu.

INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── OS Detection ────────────────────────────────────────────────────────────

detect_os() {
  if [ ! -f /etc/os-release ]; then
    echo "⛔ Cannot detect OS. /etc/os-release not found."
    exit 1
  fi
  . /etc/os-release
  case "$ID" in
    ubuntu|debian|raspbian) ;;
    *)
      echo "⛔ Unsupported OS: $ID (supported: Ubuntu, Debian, Raspberry Pi OS)"
      exit 1
      ;;
  esac
}

# ─── Docker Check / Install ─────────────────────────────────────────────────

ensure_docker() {
  command -v docker &>/dev/null && return 0

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "    🐳 Docker not found — installing now"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  apt-get update -qq
  apt-get install -y -qq curl ca-certificates
  curl -fsSL https://get.docker.com | bash
  systemctl enable docker
  systemctl start docker

  command -v docker &>/dev/null || { echo "⛔ Docker installation failed."; exit 1; }
  echo "✅ Docker $(docker --version) installed."
}

# ─── Menu Helper ─────────────────────────────────────────────────────────────

run_installer() {
  local script="$INSTALL_DIR/$1"
  if [ -f "$script" ]; then
    bash "$script"
  else
    echo "⛔ Not found: $script"
    read -rp "Press [ENTER] to continue..." </dev/tty
  fi
}

# ─── Main Menu ───────────────────────────────────────────────────────────────

show_menu() {
  while true; do
    clear
    printf "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    🚀 HomelabARR CE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    [ 1 ] Traefik + Authelia (reverse proxy + SSO)
    [ 2 ] Applications (deploy from catalog)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    [ Q ] Exit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"
    read -rp "↘️  Choose an option: " choice </dev/tty
    case "$choice" in
      1) run_installer "traefik/install.sh" ;;
      2) run_installer "apps/install.sh" ;;
      [QqZz]|exit|EXIT|close) echo "👋 Exiting."; exit 0 ;;
      *) ;;
    esac
  done
}

detect_os
ensure_docker
show_menu
