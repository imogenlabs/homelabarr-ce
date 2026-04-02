#!/usr/bin/with-contenv bash
# shellcheck shell=bash
#####################################
# HomelabARR CLI Preinstall Script  #
# Installs Docker and dependencies  #
#####################################

preinstall() {
printf "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    🚀 HomelabARR CLI - System Preparation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This will install:
- Docker CE
- Docker Compose
- Required system dependencies

Press [ENTER] to continue or Ctrl+C to exit...
"
read -r

echo "📦 Updating system packages..."
apt-get update -qq

echo "📦 Installing dependencies..."
apt-get install -y -qq \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common

echo "🐳 Installing Docker..."
if [[ ! -x $(command -v docker) ]]; then
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker
    systemctl start docker
fi

echo "🐳 Installing Docker Compose..."
if [[ ! -x $(command -v docker-compose) ]]; then
    # Install Docker Compose V2 as plugin
    DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
    mkdir -p $DOCKER_CONFIG/cli-plugins
    curl -SL https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-linux-x86_64 -o $DOCKER_CONFIG/cli-plugins/docker-compose
    chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose
    
    # Also install standalone for compatibility
    curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo "🔧 Creating required directories..."
mkdir -p /opt/appdata
mkdir -p /opt/homelabarr

echo "🔧 Setting permissions..."
chown -R 1000:1000 /opt/appdata
chown -R 1000:1000 /opt/homelabarr

printf "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Preinstallation Complete!

Docker version: $(docker --version)
Docker Compose version: $(docker-compose --version)

You can now proceed with installing Traefik or Applications.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"

echo "Press [ENTER] to return to the main menu..."
read -r

# Exit back to main installer (don't call install.sh again)
exit 0
}

# Run preinstall
preinstall