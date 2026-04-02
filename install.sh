#!/bin/bash
set -e

# HomelabARR CE — Installer
# Detects OS, ensures Docker is installed, presents the setup menu.

INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── OS Detection ────────────────────────────────────────────────────────────

detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID="$ID"
  else
    echo "⛔ Cannot detect OS. /etc/os-release not found."
    exit 1
  fi

  case "$OS_ID" in
    ubuntu|debian|raspbian) ;;
    *)
      echo "⛔ Unsupported OS: $OS_ID"
      echo "   HomelabARR CE supports Ubuntu, Debian, and Raspberry Pi OS."
      exit 1
      ;;
  esac
}

# ─── Docker Check / Install ─────────────────────────────────────────────────

ensure_docker() {
  if command -v docker &>/dev/null; then
    return 0
  fi

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

  if ! command -v docker &>/dev/null; then
    echo "⛔ Docker installation failed."
    exit 1
  fi

  echo ""
  echo "✅ Docker $(docker --version) installed."
  echo ""
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
      1)
        if [ -f "$INSTALL_DIR/traefik/install.sh" ]; then
          cd "$INSTALL_DIR/traefik" && bash install.sh
        else
          echo "⛔ traefik/install.sh not found."
          read -rp "Press [ENTER] to continue..." </dev/tty
        fi
        ;;
      2)
        if [ -f "$INSTALL_DIR/apps/install.sh" ]; then
          cd "$INSTALL_DIR/apps" && bash install.sh
        else
          echo "⛔ apps/install.sh not found."
          read -rp "Press [ENTER] to continue..." </dev/tty
        fi
        ;;
      [Qq]|exit|EXIT|Exit|close|z|Z)
        echo "👋 Exiting."
        exit 0
        ;;
      *)
        ;;
    esac
  done
}

# ─── Run ─────────────────────────────────────────────────────────────────────

detect_os
ensure_docker
show_menu
