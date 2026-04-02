#!/bin/bash
#####################################
# HomelabARR CE — One-Line Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/install-remote.sh | sudo bash
#####################################

set -e

REPO="https://github.com/smashingtags/homelabarr-ce.git"
TEMPLATES_REPO="https://github.com/smashingtags/homelabarr-templates.git"
INSTALL_DIR="/opt/homelabarr"
TEMPLATES_DIR="/opt/homelabarr/templates"
BIN_NAME="homelabarr-cli"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "    🚀 HomelabARR CE — One-Line Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ $EUID -ne 0 ]]; then
  echo "⛔ Must be run as root (use sudo)"
  exit 1
fi

# Install git if missing
if ! command -v git &>/dev/null; then
  echo "📦 Installing git..."
  apt-get update -qq && apt-get install -y -qq git >/dev/null 2>&1
fi

# Clone or update CE
if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "📂 Updating HomelabARR CE..."
  git -C "$INSTALL_DIR" pull --ff-only 2>&1 || echo "⚠️  Could not update. Run: cd $INSTALL_DIR && git stash && git pull"
else
  echo "📥 Cloning HomelabARR CE..."
  git clone "$REPO" "$INSTALL_DIR"
fi

# Clone or update templates
if [[ -d "$TEMPLATES_DIR/.git" ]]; then
  echo "📂 Updating community templates..."
  git -C "$TEMPLATES_DIR" pull --ff-only 2>&1 || echo "⚠️  Could not update templates. Run: cd $TEMPLATES_DIR && git pull"
else
  echo "📥 Cloning community app templates..."
  git clone "$TEMPLATES_REPO" "$TEMPLATES_DIR"
fi

# Set permissions on installer scripts only
chmod +x "$INSTALL_DIR/install.sh" \
         "$INSTALL_DIR/traefik/install.sh" \
         "$INSTALL_DIR/apps/install.sh" \
         "$INSTALL_DIR/.installer/homelabber" 2>/dev/null || true

# Install CLI command
echo "🔗 Installing $BIN_NAME..."
install -m 755 "$INSTALL_DIR/.installer/homelabber" "/usr/local/bin/$BIN_NAME"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "    ✅ HomelabARR CE installed!"
echo ""
echo "    Run:      sudo homelabarr-cli -i"
echo "    Or:       cd $INSTALL_DIR && sudo ./install.sh"
echo ""
echo "    Wiki:     https://wiki.homelabarr.com"
echo "    Discord:  https://discord.gg/Pc7mXX786x"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
