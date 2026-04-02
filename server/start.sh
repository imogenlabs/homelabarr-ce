#!/bin/sh

# Startup script for HomelabARR backend with Docker socket validation
echo "🚀 Starting HomelabARR backend..."

# Function to check if Docker socket is accessible
check_docker_socket() {
    if [ -S "/var/run/docker.sock" ]; then
        echo "✅ Docker socket found at /var/run/docker.sock"
        return 0
    else
        echo "❌ Docker socket not found or not accessible"
        return 1
    fi
}

# Function to test Docker connection
test_docker_connection() {
    echo "🔍 Testing Docker connection..."
    
    # Try to connect to Docker daemon
    if timeout 10 docker version >/dev/null 2>&1; then
        echo "✅ Docker daemon is accessible"
        return 0
    else
        echo "❌ Cannot connect to Docker daemon"
        return 1
    fi
}

# Wait for Docker socket to be available
echo "⏳ Waiting for Docker socket..."
RETRY_COUNT=0
MAX_RETRIES=30

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if check_docker_socket; then
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "⏳ Waiting for Docker socket... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Docker socket not available after $MAX_RETRIES attempts"
    echo "🔧 Continuing anyway - Docker connection will be handled by the application"
fi

# Test Docker connection (non-blocking)
test_docker_connection || echo "⚠️  Docker connection test failed - will retry during runtime"

# Ensure config directory is writable and seed files exist
echo "📁 Checking config directory..."
CONFIG_DIR="server/config"
mkdir -p "$CONFIG_DIR"
for f in users.json api-keys.json stars.json; do
  [ ! -f "$CONFIG_DIR/$f" ] && echo '{}' > "$CONFIG_DIR/$f" && echo "  Created $CONFIG_DIR/$f"
done
# Fix ownership if running as homelabarr but files are root-owned (bind mount)
if [ "$(id -u)" = "1001" ]; then
  sudo chown -R 1001:1001 "$CONFIG_DIR" 2>/dev/null || true
fi

# Start the Node.js application
echo "🎯 Starting Node.js application..."
exec node server/index.js