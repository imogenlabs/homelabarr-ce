#!/bin/bash

# HomelabARR CLI Local Mode Setup Script
# This script prepares the local mode deployment environment

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "    🚀 HomelabARR CLI - Local Mode Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if running from correct directory
if [[ ! -f "install.sh" ]]; then
    echo "❌ Error: Please run this script from the HomelabARR CLI root directory"
    echo "   cd /opt/homelabarr && ./setup-local-mode.sh"
    exit 1
fi

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Run: curl -fsSL https://get.docker.com | bash"
    exit 1
fi

echo "✅ Docker detected"

# Check Docker Compose
if ! docker compose version &> /dev/null && ! docker-compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Installing..."
    sudo apt-get update && sudo apt-get install -y docker-compose-plugin
fi

echo "✅ Docker Compose detected"

# Check local-mode-apps directory
echo ""
echo "🔧 Checking local mode applications..."

if [[ -d "apps/local-mode-apps" ]]; then
    APP_COUNT=$(ls -1 apps/local-mode-apps/*.yml 2>/dev/null | wc -l)
    echo "✅ Found $APP_COUNT pre-converted applications ready to deploy"
else
    echo "❌ Error: apps/local-mode-apps directory not found"
    echo "   Please ensure you cloned the complete repository"
    exit 1
fi

# Clean up non-app files
if [[ -f "fix-local-apps.sh" ]]; then
    echo "🧹 Cleaning up non-application files..."
    chmod +x fix-local-apps.sh
    ./fix-local-apps.sh
else
    echo "🧹 Creating cleanup script..."
    cat > fix-local-apps.sh << 'EOF'
#!/bin/bash

# Clean up non-app files from local-mode-apps directory
echo "Cleaning up local-mode-apps directory..."

if [[ ! -d "/opt/homelabarr/apps/local-mode-apps" ]]; then
    if [[ ! -d "apps/local-mode-apps" ]]; then
        echo "Error: local-mode-apps directory not found!"
        exit 1
    fi
    cd apps/local-mode-apps
else
    cd /opt/homelabarr/apps/local-mode-apps
fi

echo "Before cleanup: $(ls -1 *.yml 2>/dev/null | wc -l) files"

# Remove non-app files
rm -f FUNDING.yml .yamlint.yml docker-compose*.yml sample*.yml test*.yml backup*.yml
rm -f *-backup.yml *-test.yml *-sample.yml
rm -f .*.yml  # Hidden files
rm -f yamlint.yml .yamlint* 
rm -f README.yml readme.yml
rm -f LICENSE.yml license.yml
rm -f CHANGELOG.yml changelog.yml
rm -f Dockerfile.yml dockerfile.yml
rm -f Makefile.yml makefile.yml
rm -f .gitignore.yml .dockerignore.yml

# Count remaining apps
APP_COUNT=$(ls -1 *.yml 2>/dev/null | wc -l)
echo "After cleanup: $APP_COUNT valid apps remaining"

# Show a sample of valid apps
echo ""
echo "Sample valid apps available:"
ls *.yml 2>/dev/null | grep "^[a-z]" | head -10
EOF
    chmod +x fix-local-apps.sh
    ./fix-local-apps.sh
fi

# Fix paths in deployment scripts
echo ""
echo "🔧 Fixing deployment script paths..."

# Fix the comprehensive script if it exists
if [[ -f "dev_scripts_backup_1755412048/deploy-local-comprehensive.sh" ]]; then
    # Fix the BULK_APPS_DIR path
    sed -i 's|BULK_APPS_DIR="$APPS_DIR/local-mode-apps"|BULK_APPS_DIR="/opt/homelabarr/apps/local-mode-apps"|' dev_scripts_backup_1755412048/deploy-local-comprehensive.sh
    
    # Fix the find command to only show valid apps
    sed -i 's|find "$BULK_APPS_DIR" -name "\*.yml" -not -name "\*backup\*"|find "$BULK_APPS_DIR" -name "[a-z]*.yml"|' dev_scripts_backup_1755412048/deploy-local-comprehensive.sh
    
    chmod +x dev_scripts_backup_1755412048/deploy-local-comprehensive.sh
    echo "✅ Fixed deploy-local-comprehensive.sh"
fi

# Fix the other deployment scripts
for script in homelabarr-local-deploy.sh homelabarr-local-deploy-fixed.sh; do
    if [[ -f "$script" ]]; then
        sed -i 's|BULK_APPS_DIR="/opt/homelabarr/apps/local-mode-apps"|BULK_APPS_DIR="/opt/homelabarr/apps/local-mode-apps"|' "$script"
        chmod +x "$script"
        echo "✅ Fixed $script"
    fi
done

# Create .env file if it doesn't exist
if [[ ! -f ".env" ]]; then
    echo ""
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# HomelabARR CLI Local Mode Environment Variables
PUID=1000
PGID=1000
TZ=America/New_York
USERDIR=/opt/homelabarr
DOCKERDIR=/opt/homelabarr/apps
DATADIR=/opt/homelabarr/data
EOF
    echo "✅ Created .env file (please edit with your settings)"
fi

# Final message
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "    ✅ Local Mode Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 $(ls -1 apps/local-mode-apps/*.yml 2>/dev/null | wc -l) applications are ready for deployment"
echo ""
echo "To start the local mode menu, run one of:"
echo "  ./homelabarr-local-deploy.sh"
echo "  ./homelabarr-local-deploy-fixed.sh"
echo "  ./dev_scripts_backup_1755412048/deploy-local-comprehensive.sh"
echo ""
echo "No Traefik or Authelia required - apps run on direct ports!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"