#!/bin/bash
#####################################
# HomelabARR CE — One-Line Installer
# Usage: sudo wget -qO- https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/install-remote.sh | sudo bash
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

# Check root
if [[ $EUID -ne 0 ]]; then
  echo "⛔ This script must be run as root (use sudo)"
  exit 1
fi

# Install git if missing
if ! command -v git &>/dev/null; then
  echo "📦 Installing git..."
  apt-get update -qq && apt-get install -y -qq git >/dev/null 2>&1
fi

# Clone or update repo
if [[ -d "$INSTALL_DIR" ]]; then
  echo "📂 Updating existing installation at $INSTALL_DIR..."
  cd "$INSTALL_DIR"
  if ! git pull --ff-only 2>&1; then
    echo "⚠️  Could not fast-forward update. You may have local changes."
    echo "    Run 'cd $INSTALL_DIR && git stash && git pull' to resolve."
  fi
else
  echo "📥 Cloning HomelabARR CE to $INSTALL_DIR..."
  git clone "$REPO" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# Clone or update community templates
if [[ -d "$TEMPLATES_DIR" ]]; then
  echo "📂 Updating community templates..."
  cd "$TEMPLATES_DIR"
  if ! git pull --ff-only 2>&1; then
    echo "⚠️  Could not update templates. Run 'cd $TEMPLATES_DIR && git pull' manually."
  fi
  cd "$INSTALL_DIR"
else
  echo "📥 Cloning community app templates..."
  git clone "$TEMPLATES_REPO" "$TEMPLATES_DIR"
fi

# Make all scripts executable
echo "🔧 Setting permissions..."
find . -name "*.sh" -exec chmod +x {} \;
chmod +x .installer/homelabber 2>/dev/null || true

# Install the CLI command system-wide
echo "🔗 Installing $BIN_NAME command..."
if ! cp .installer/homelabber /usr/local/bin/$BIN_NAME 2>/dev/null; then
  if ! cp .installer/homelabber /bin/$BIN_NAME 2>/dev/null; then
    echo "⚠️  Could not install $BIN_NAME to PATH. Run manually: cd $INSTALL_DIR && sudo ./install.sh"
  else
    chmod +x /bin/$BIN_NAME
  fi
else
  chmod +x /usr/local/bin/$BIN_NAME
  # Also install to /bin for compatibility
  cp .installer/homelabber /bin/$BIN_NAME 2>/dev/null && chmod +x /bin/$BIN_NAME 2>/dev/null
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "    ✅ HomelabARR CE installed successfully!"
echo ""
echo "    Run the installer:  sudo homelabarr-cli -i"
echo "    Or start directly:  cd $INSTALL_DIR && sudo ./install.sh"
echo ""
echo "    Wiki: https://smashingtags.github.io/homelabarr-ce/"
echo "    Discord: https://discord.gg/Pc7mXX786x"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
