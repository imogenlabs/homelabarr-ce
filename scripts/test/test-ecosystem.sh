#!/bin/bash

# HomelabARR Ecosystem Integration Test Script
# Validates the complete ecosystem integration and functionality
# Tests all components and their interactions

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Function to print colored output
print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

print_failure() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
    FAILED_TESTS+=("$1")
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Function to test container status
test_container_status() {
    local container_name="$1"
    local test_name="Container $container_name is running"
    
    print_status "Testing: $test_name"
    
    if docker ps --filter "name=$container_name" --filter "status=running" --format "{{.Names}}" | grep -q "$container_name"; then
        print_success "$test_name"
        return 0
    else
        print_failure "$test_name"
        return 1
    fi
}

# Function to test container health
test_container_health() {
    local container_name="$1"
    local test_name="Container $container_name is healthy"
    
    print_status "Testing: $test_name"
    
    local health_status=$(docker inspect "$container_name" --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-health-check")
    
    if [[ "$health_status" == "healthy" ]]; then
        print_success "$test_name"
        return 0
    elif [[ "$health_status" == "no-health-check" ]]; then
        print_warning "$test_name (no health check defined)"
        return 0
    else
        print_failure "$test_name (status: $health_status)"
        return 1
    fi
}

# Function to test HTTP endpoint
test_http_endpoint() {
    local url="$1"
    local test_name="HTTP endpoint $url is accessible"
    
    print_status "Testing: $test_name"
    
    if curl -s -I "$url" > /dev/null 2>&1; then
        print_success "$test_name"
        return 0
    else
        print_failure "$test_name"
        return 1
    fi
}

# Function to test service connectivity
test_service_connectivity() {
    local container="$1"
    local target_service="$2"
    local port="$3"
    local test_name="Service connectivity from $container to $target_service:$port"
    
    print_status "Testing: $test_name"
    
    if docker exec "$container" nc -z "$target_service" "$port" 2>/dev/null; then
        print_success "$test_name"
        return 0
    else
        print_failure "$test_name"
        return 1
    fi
}

# Function to test volume persistence
test_volume_persistence() {
    local volume_name="$1"
    local expected_path="$2"
    local test_name="Volume $volume_name persists to $expected_path"
    
    print_status "Testing: $test_name"
    
    local volume_info=$(docker volume inspect "$volume_name" 2>/dev/null)
    if [[ $? -eq 0 ]]; then
        local mountpoint=$(echo "$volume_info" | jq -r '.[0].Options.mountpoint' 2>/dev/null || echo "")
        if [[ "$mountpoint" == "$expected_path" ]]; then
            print_success "$test_name"
            return 0
        else
            print_failure "$test_name (actual: $mountpoint)"
            return 1
        fi
    else
        print_failure "$test_name (volume not found)"
        return 1
    fi
}

    print_status "Testing Local Persist Plugin functionality"
    
    # Test socket existence
        print_success "Local persist socket exists"
    else
        print_failure "Local persist socket not found"
        return 1
    fi
    
    # Test volume creation
    local test_volume="test-ecosystem-volume"
    local test_path="/tmp/ecosystem-test"
    
        print_success "Local persist volume creation works"
        
        # Test volume removal
        if docker volume rm "$test_volume" > /dev/null 2>&1; then
            print_success "Local persist volume removal works"
        else
            print_failure "Local persist volume removal failed"
        fi
    else
        print_failure "Local persist volume creation failed"
        return 1
    fi
}

# Function to test network connectivity
test_network_connectivity() {
    print_status "Testing network connectivity between services"
    
    # Test proxy network
    if docker network inspect proxy > /dev/null 2>&1; then
        print_success "Proxy network exists"
    else
        print_failure "Proxy network not found"
    fi
    
    # Test homelabarr network
    if docker network inspect homelabarr > /dev/null 2>&1; then
        print_success "HomelabARR network exists"
    else
        print_failure "HomelabARR network not found"
    fi
    
    # Test inter-service connectivity (if containers are running)
    if docker ps --filter "name=homelabarr_backend" --format "{{.Names}}" | grep -q "homelabarr_backend"; then
        test_service_connectivity "homelabarr_backend" "mount-enhanced" "8080"
        test_service_connectivity "homelabarr_backend" "homelabarr-uploader" "9999"
    fi
}

# Function to test API endpoints
test_api_endpoints() {
    print_status "Testing API endpoints"
    
    # Get backend container IP or use localhost
    local backend_ip="localhost"
    local backend_port="8092"
    
    # Check if backend is running and get its port
    if docker ps --filter "name=homelabarr_backend" --format "{{.Ports}}" | grep -q "8092"; then
        # Test health endpoint
        if curl -s "http://$backend_ip:$backend_port/health" | grep -q "ok" 2>/dev/null; then
            print_success "Backend health endpoint responds"
        else
            print_failure "Backend health endpoint not responding"
        fi
        
        # Test API endpoints
        if curl -s "http://$backend_ip:$backend_port/api/containers" > /dev/null 2>&1; then
            print_success "Containers API endpoint accessible"
        else
            print_failure "Containers API endpoint not accessible"
        fi
        
        if curl -s "http://$backend_ip:$backend_port/api/applications" > /dev/null 2>&1; then
            print_success "Applications API endpoint accessible"
        else
            print_failure "Applications API endpoint not accessible"
        fi
    else
        print_warning "Backend container not running, skipping API tests"
    fi
}

# Function to test volume structure
test_volume_structure() {
    print_status "Testing volume directory structure"
    
    local base_dirs=(
        "/opt/appdata"
        "/opt/appdata/homelabarr"
        "/opt/appdata/mount-enhanced"
        "/opt/appdata/uploader"
        "/opt/appdata/system"
        "/run/docker/plugins"
        "/var/lib/docker/plugin-data"
    )
    
    for dir in "${base_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            print_success "Directory exists: $dir"
        else
            print_failure "Directory missing: $dir"
        fi
    done
}

# Function to test configuration files
test_configuration_files() {
    print_status "Testing configuration files"
    
    if [[ -f ".env" ]]; then
        print_success "Environment file exists"
        
        # Check for required variables
        local required_vars=("DOMAIN" "PUID" "PGID" "TZ")
        for var in "${required_vars[@]}"; do
            if grep -q "^$var=" .env; then
                print_success "Required variable $var is set"
            else
                print_failure "Required variable $var is missing"
            fi
        done
    else
        print_failure "Environment file (.env) not found"
    fi
    
    # Check for compose files
    local compose_files=(
        "ecosystem-integration.yml"
        "apps/system/mount-enhanced.yml"
        "apps/system/homelabarr-uploader.yml"
        "apps/system/homelabarr-web-interface.yml"
    )
    
    for file in "${compose_files[@]}"; do
        if [[ -f "$file" ]]; then
            print_success "Compose file exists: $file"
        else
            print_failure "Compose file missing: $file"
        fi
    done
}

# Main test function
run_all_tests() {
    echo "============================================================"
    echo "HomelabARR Ecosystem Integration Test Suite"
    echo "============================================================"
    echo ""
    
    # Configuration tests
    echo "--- Configuration Tests ---"
    test_configuration_files
    test_volume_structure
    echo ""
    
    # Docker tests
    echo "--- Docker Infrastructure Tests ---"
    test_network_connectivity
    echo ""
    
    # Container tests
    echo "--- Container Status Tests ---"
    
    for container in "${containers[@]}"; do
        if docker ps -a --filter "name=$container" --format "{{.Names}}" | grep -q "$container"; then
            test_container_status "$container"
            test_container_health "$container"
        else
            print_warning "Container $container not found (may not be deployed)"
        fi
    done
    echo ""
    
    # Service tests
    echo "--- Service Integration Tests ---"
    echo ""
    
    # API tests
    echo "--- API Functionality Tests ---"
    test_api_endpoints
    echo ""
    
    # Volume persistence tests
    echo "--- Volume Persistence Tests ---"
    local volumes=(
        "mount_enhanced_config:/opt/appdata/mount-enhanced/config"
        "uploader_config:/opt/appdata/uploader/config"
        "homelabarr_backend_data:/opt/appdata/homelabarr/backend/data"
    )
    
    for volume_spec in "${volumes[@]}"; do
        IFS=':' read -ra PARTS <<< "$volume_spec"
        local volume_name="${PARTS[0]}"
        local expected_path="${PARTS[1]}"
        test_volume_persistence "$volume_name" "$expected_path"
    done
    echo ""
}

# Function to show test summary
show_test_summary() {
    echo "============================================================"
    echo "Test Summary"
    echo "============================================================"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    echo ""
    
    if [[ $TESTS_FAILED -gt 0 ]]; then
        echo "Failed Tests:"
        for test in "${FAILED_TESTS[@]}"; do
            echo -e "  ${RED}✗${NC} $test"
        done
        echo ""
        echo "Troubleshooting steps:"
        echo "1. Check container logs: docker logs <container-name>"
        echo "2. Verify environment configuration: cat .env"
        echo "3. Check Docker daemon status: docker info"
        echo "4. Review integration guide: cat ECOSYSTEM_INTEGRATION_GUIDE.md"
        echo ""
        exit 1
    else
        echo -e "${GREEN}All tests passed! Ecosystem integration is successful.${NC}"
        echo ""
        echo "Access your services at:"
        if grep -q "^DOMAIN=" .env 2>/dev/null; then
            local domain=$(grep "^DOMAIN=" .env | cut -d'=' -f2)
            echo "  • Web Interface: https://homelabarr.$domain"
            echo "  • API: https://api.$domain"
            echo "  • Mount Manager: https://mount.$domain"
            echo "  • Uploader: https://uploader.$domain"
        else
            echo "  • Configure DOMAIN in .env file to access services"
        fi
        echo ""
        exit 0
    fi
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_warning "Some tests require root privileges. Run with sudo for complete testing."
fi

# Run tests
run_all_tests
show_test_summary