#!/bin/bash
# HomelabARR CE Template Validator
# Tests every app template by pulling the image, starting the container,
# and verifying it reaches a running/healthy state.
#
# Usage:
#   ./scripts/validate-templates.sh                    # Test all templates
#   ./scripts/validate-templates.sh plex sonarr radarr # Test specific ones
#   ./scripts/validate-templates.sh --pull-only        # Just verify images exist
#   ./scripts/validate-templates.sh --fix              # Auto-fix common issues

set -euo pipefail

TEMPLATE_DIR="${TEMPLATE_DIR:-server/templates}"
RESULTS_DIR="/tmp/homelabarr-validate"
TIMEOUT=60
PULL_ONLY=false
AUTO_FIX=false
NETWORK_NAME="hla-validate"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

mkdir -p "$RESULTS_DIR"

# Parse flags
SPECIFIC_TEMPLATES=()
for arg in "$@"; do
    case "$arg" in
        --pull-only) PULL_ONLY=true ;;
        --fix) AUTO_FIX=true ;;
        *) SPECIFIC_TEMPLATES+=("$arg") ;;
    esac
done

# Create isolated network
docker network create "$NETWORK_NAME" 2>/dev/null || true

pass=0
fail=0
skip=0
fixed=0
declare -A RESULTS

cleanup_container() {
    local name="$1"
    docker stop "hla-test-${name}" 2>/dev/null || true
    docker rm -f "hla-test-${name}" 2>/dev/null || true
}

extract_image() {
    local file="$1"
    # Get the first image: line that isn't a comment
    grep -m1 '^\s*image:' "$file" | sed 's/.*image:\s*//' | sed 's/\s*$//' | tr -d '"' | tr -d "'"
}

extract_ports() {
    local file="$1"
    # Extract first host:container port mapping
    grep -A1 'ports:' "$file" | grep -oE '[0-9]+:[0-9]+' | head -1
}

check_image_exists() {
    local image="$1"
    # Skip images with unresolved variables
    if echo "$image" | grep -q '\$'; then
        echo "SKIP_VAR"
        return
    fi
    # Try to pull — if it fails, image doesn't exist
    if docker pull "$image" --quiet 2>/dev/null; then
        echo "OK"
    else
        echo "FAIL"
    fi
}

fix_template() {
    local file="$1"
    local name="$2"
    local issue="$3"
    local changed=false

    case "$issue" in
        empty_volumes)
            # Remove empty volumes: key
            sed -i '/^\s*volumes:\s*$/d' "$file"
            changed=true
            ;;
        deprecated_version)
            # Remove version: '3' — not needed for modern compose
            sed -i '/^version:/d' "$file"
            changed=true
            ;;
        external_network)
            # Replace external network with a simple bridge
            sed -i 's/external: true/external: false/' "$file"
            changed=true
            ;;
        image_not_found)
            # Try common registry prefixes
            local old_image
            old_image=$(extract_image "$file")
            local base_name
            base_name=$(echo "$old_image" | sed 's|.*/||' | sed 's/:.*$//')

            # Try linuxserver.io first (most common for homelab)
            local lsio="lscr.io/linuxserver/${base_name}:latest"
            if docker pull "$lsio" --quiet 2>/dev/null; then
                sed -i "s|image:.*${old_image}|image: ${lsio}|" "$file"
                changed=true
            fi
            ;;
    esac

    if $changed; then
        echo -e "${YELLOW}  FIXED: ${issue}${NC}"
        ((fixed++)) || true
    fi
}

validate_yaml() {
    local file="$1"
    local issues=()

    # Check for empty volumes
    if grep -q '^\s*volumes:\s*$' "$file"; then
        local next_line
        next_line=$(grep -A1 '^\s*volumes:\s*$' "$file" | tail -1)
        if echo "$next_line" | grep -qE '^\s*$|^\s*[a-z]|^$'; then
            issues+=("empty_volumes")
        fi
    fi

    # Check for deprecated version key
    if grep -q '^version:' "$file"; then
        issues+=("deprecated_version")
    fi

    # Check for external network (won't work standalone)
    if grep -q 'external: true' "$file"; then
        issues+=("external_network")
    fi

    echo "${issues[*]:-}"
}

test_template() {
    local file="$1"
    local name
    name=$(basename "$file" .yml)
    local image
    image=$(extract_image "$file")

    echo -e "\n${BLUE}[$((pass + fail + skip + 1))] Testing: ${name}${NC}"
    echo "  Image: ${image}"

    # Skip if image has unresolved variables
    if echo "$image" | grep -q '\$'; then
        echo -e "  ${YELLOW}SKIP: Image contains variables${NC}"
        RESULTS[$name]="SKIP:variable_in_image"
        ((skip++)) || true
        return
    fi

    # Validate YAML structure
    local issues
    issues=$(validate_yaml "$file")
    if [[ -n "$issues" ]]; then
        echo -e "  ${YELLOW}YAML issues: ${issues}${NC}"
        if $AUTO_FIX; then
            for issue in $issues; do
                fix_template "$file" "$name" "$issue"
            done
        fi
    fi

    # Pull image
    echo -n "  Pulling... "
    if ! docker pull "$image" --quiet 2>/dev/null; then
        echo -e "${RED}FAIL${NC}"
        RESULTS[$name]="FAIL:image_not_found:${image}"
        if $AUTO_FIX; then
            fix_template "$file" "$name" "image_not_found"
        fi
        ((fail++)) || true
        return
    fi
    echo -e "${GREEN}OK${NC}"

    if $PULL_ONLY; then
        RESULTS[$name]="PASS:pull_ok"
        ((pass++)) || true
        return
    fi

    # Start container
    cleanup_container "$name"
    echo -n "  Starting... "

    local port_map=""
    local ports
    ports=$(extract_ports "$file")
    if [[ -n "$ports" ]]; then
        # Use random high port to avoid conflicts
        local container_port
        container_port=$(echo "$ports" | cut -d: -f2)
        local host_port=$((30000 + RANDOM % 10000))
        port_map="-p ${host_port}:${container_port}"
    fi

    # Run with minimal config — just test if it starts
    if ! docker run -d \
        --name "hla-test-${name}" \
        --network "$NETWORK_NAME" \
        -e PUID=1000 -e PGID=1000 -e TZ=UTC \
        $port_map \
        --memory=512m \
        --stop-timeout=5 \
        "$image" 2>/dev/null; then
        echo -e "${RED}FAIL (could not start)${NC}"
        RESULTS[$name]="FAIL:start_failed"
        ((fail++)) || true
        cleanup_container "$name"
        return
    fi
    echo -e "${GREEN}started${NC}"

    # Wait and check if container stays running
    echo -n "  Checking health (${TIMEOUT}s)... "
    local waited=0
    local status=""
    while [[ $waited -lt $TIMEOUT ]]; do
        status=$(docker inspect --format='{{.State.Status}}' "hla-test-${name}" 2>/dev/null || echo "gone")
        if [[ "$status" == "exited" ]] || [[ "$status" == "dead" ]] || [[ "$status" == "gone" ]]; then
            local exit_code
            exit_code=$(docker inspect --format='{{.State.ExitCode}}' "hla-test-${name}" 2>/dev/null || echo "?")
            # Exit code 0 might be OK for some tools (restic, etc.)
            if [[ "$exit_code" == "0" ]]; then
                echo -e "${YELLOW}exited cleanly (code 0)${NC}"
                RESULTS[$name]="PASS:exited_clean"
                ((pass++)) || true
                cleanup_container "$name"
                return
            fi
            local logs
            logs=$(docker logs "hla-test-${name}" 2>&1 | tail -5)
            echo -e "${RED}FAIL (exited: ${exit_code})${NC}"
            echo "  Last logs: $(echo "$logs" | head -3)"
            RESULTS[$name]="FAIL:exited_${exit_code}"
            ((fail++)) || true
            cleanup_container "$name"
            return
        fi

        # If running for 10+ seconds, that's good enough
        if [[ $waited -ge 10 ]] && [[ "$status" == "running" ]]; then
            break
        fi
        sleep 2
        waited=$((waited + 2))
    done

    if [[ "$status" == "running" ]]; then
        echo -e "${GREEN}PASS (running)${NC}"

        # Try HTTP health check if we have a port
        if [[ -n "$port_map" ]]; then
            local hp
            hp=$(echo "$port_map" | grep -oE '[0-9]+:' | head -1 | tr -d ':')
            local http_code
            http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:${hp}/" 2>/dev/null || echo "000")
            if [[ "$http_code" != "000" ]]; then
                echo -e "  HTTP: ${http_code}"
            fi
        fi

        RESULTS[$name]="PASS:running"
        ((pass++)) || true
    else
        echo -e "${RED}FAIL (status: ${status})${NC}"
        RESULTS[$name]="FAIL:${status}"
        ((fail++)) || true
    fi

    cleanup_container "$name"
}

# Main
echo "============================================"
echo "  HomelabARR CE Template Validator"
echo "============================================"
echo "Templates: ${TEMPLATE_DIR}"
echo "Pull only: ${PULL_ONLY}"
echo "Auto-fix:  ${AUTO_FIX}"
echo ""

# Get template list
templates=()
if [[ ${#SPECIFIC_TEMPLATES[@]} -gt 0 ]]; then
    for t in "${SPECIFIC_TEMPLATES[@]}"; do
        templates+=("${TEMPLATE_DIR}/${t}.yml")
    done
else
    for f in "${TEMPLATE_DIR}"/*.yml; do
        templates+=("$f")
    done
fi

echo "Testing ${#templates[@]} templates..."

for file in "${templates[@]}"; do
    if [[ -f "$file" ]]; then
        test_template "$file"
    else
        echo -e "${RED}File not found: ${file}${NC}"
    fi
done

# Cleanup network
docker network rm "$NETWORK_NAME" 2>/dev/null || true

# Summary
echo ""
echo "============================================"
echo "  Results"
echo "============================================"
echo -e "  ${GREEN}PASS: ${pass}${NC}"
echo -e "  ${RED}FAIL: ${fail}${NC}"
echo -e "  ${YELLOW}SKIP: ${skip}${NC}"
if $AUTO_FIX; then
    echo -e "  ${YELLOW}FIXED: ${fixed}${NC}"
fi
echo ""

# Write detailed results
echo "# Template Validation Results - $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "${RESULTS_DIR}/results.txt"
for name in $(echo "${!RESULTS[@]}" | tr ' ' '\n' | sort); do
    echo "${name}: ${RESULTS[$name]}" >> "${RESULTS_DIR}/results.txt"
done

# Write failures only
echo "" >> "${RESULTS_DIR}/results.txt"
echo "# Failures:" >> "${RESULTS_DIR}/results.txt"
for name in $(echo "${!RESULTS[@]}" | tr ' ' '\n' | sort); do
    if [[ "${RESULTS[$name]}" == FAIL* ]]; then
        echo "  ${name}: ${RESULTS[$name]}" >> "${RESULTS_DIR}/results.txt"
    fi
done

echo "Detailed results: ${RESULTS_DIR}/results.txt"

# Exit with failure if any templates failed
if [[ $fail -gt 0 ]]; then
    exit 1
fi
