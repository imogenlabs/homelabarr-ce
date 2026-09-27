#!/bin/sh

# Startup script for HomelabARR backend with Docker endpoint validation
echo "🚀 Starting HomelabARR backend..."

# Check the endpoint configured for the Docker CLI before starting.
check_docker_endpoint() {
    case "${DOCKER_HOST:-unix:///var/run/docker.sock}" in
        unix://*)
            socket=${DOCKER_HOST:-unix:///var/run/docker.sock}
            socket=${socket#unix://}
            if [ -S "$socket" ]; then
                echo "✅ Docker socket found at $socket"
                return 0
            fi
            ;;
        tcp://*)
            if timeout 10 docker version >/dev/null 2>&1; then
                echo "✅ Docker endpoint reachable at $DOCKER_HOST"
                return 0
            fi
            ;;
        *)
            echo "❌ Unsupported DOCKER_HOST: $DOCKER_HOST"
            return 1
            ;;
    esac
    echo "❌ Docker endpoint not available: ${DOCKER_HOST:-unix:///var/run/docker.sock}"
    return 1
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

# Skip Docker socket wait if REQUIRE_DOCKER=false (demo/browse mode)
if [ "$REQUIRE_DOCKER" = "false" ]; then
    echo "ℹ️  REQUIRE_DOCKER=false — skipping Docker socket check (browse mode)"
else
    echo "⏳ Waiting for Docker endpoint..."
    RETRY_COUNT=0
    MAX_RETRIES=30

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if check_docker_endpoint; then
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "⏳ Waiting for Docker endpoint... (attempt $RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    done

    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo "❌ Docker endpoint not available after $MAX_RETRIES attempts"
        echo "🔧 Continuing anyway - Docker connection will be handled by the application"
    fi

    test_docker_connection || echo "⚠️  Docker connection test failed - will retry during runtime"
fi

# Ensure config directory is writable and seed files exist
echo "📁 Checking config directory..."
CONFIG_DIR="server/config"
mkdir -p "$CONFIG_DIR"
for f in users.json api-keys.json stars.json; do
  [ ! -f "$CONFIG_DIR/$f" ] && echo '{}' > "$CONFIG_DIR/$f" && echo "  Created $CONFIG_DIR/$f"
done
# Fix ownership if running as homelabarr but files are root-owned (bind mount)
if [ "$(id -u)" = "1001" ]; then
  chown -R 1001:1001 "$CONFIG_DIR" 2>/dev/null || true
fi

# Start the Node.js application
echo "🎯 Starting Node.js application..."
exec node server/index.js