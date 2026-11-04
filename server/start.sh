#!/bin/sh

# Startup script for HomelabARR backend with Docker endpoint validation
echo "🚀 Starting HomelabARR backend..."

DATA_DIRS="/app/data /app/server/config /app/server/activity-data"

# Started as root (the Unraid template passes --user 0:0): bind-mounted appdata
# folders arrive root-owned, and the backend runs as uid 1001, so it could not
# write its config or open its database (HLCE-363). Take ownership of the data
# folders, then drop to 1001 for everything else. Compose already runs as 1001
# and never enters this branch.
if [ "$(id -u)" = "0" ]; then
  for dir in $DATA_DIRS; do
    mkdir -p "$dir"
    [ "$(stat -c %u "$dir")" = "1001" ] || chown -R 1001:1001 "$dir"
  done
  exec su-exec 1001:1001 sh "$0" "$@"
fi

for dir in $DATA_DIRS; do
  if [ -d "$dir" ] && [ ! -w "$dir" ]; then
    echo "❌ $dir is not writable by uid $(id -u). Give the host folder to 1001 (chown -R 1001:1001 <folder>),"
    echo "   or start the container as root (--user 0:0) and it will fix ownership itself."
  fi
done

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
# users.json and api-keys.json hold lists; stars.json maps user id -> app ids.
# Seeding a list file with {} made the backend warn on first boot (#623).
seed_config_file() {
  if [ ! -f "$CONFIG_DIR/$1" ]; then
    echo "$2" > "$CONFIG_DIR/$1" && echo "  Created $CONFIG_DIR/$1"
  fi
}
seed_config_file users.json '[]'
seed_config_file api-keys.json '[]'
seed_config_file stars.json '{}'

# Start the Node.js application
echo "🎯 Starting Node.js application..."
exec node server/index.js