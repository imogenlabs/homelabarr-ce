#!/bin/bash
#####################################
# HomelabARR Security Monitor        #
# Continuous security monitoring     #
# for containerized infrastructure   #
#####################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/opt/appdata/logs/security"
ALERT_THRESHOLD_CRITICAL=1
ALERT_THRESHOLD_HIGH=10
DISCORD_WEBHOOK="${DISCORD_SECURITY_WEBHOOK:-}"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "${timestamp} [${level}] ${message}"
    
    # Ensure log directory exists
    mkdir -p "$LOG_DIR"
    echo "${timestamp} [${level}] ${message}" >> "$LOG_DIR/security-monitor.log"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }

# Check dependencies
check_dependencies() {
    local deps=("docker" "jq" "curl")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing+=("$dep")
        fi
    done
    
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing[*]}"
        log_error "Install missing dependencies and try again"
        exit 1
    fi
    
    log_info "All dependencies available"
}

# Get running containers
get_running_containers() {
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" --no-trunc
}

# Check container resource usage
monitor_container_resources() {
    log_info "Monitoring container resource usage..."
    
    local high_cpu_containers=()
    local high_memory_containers=()
    
    # Get container stats
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | tail -n +2 | while read -r line; do
        local name=$(echo "$line" | awk '{print $1}')
        local cpu=$(echo "$line" | awk '{print $2}' | sed 's/%//')
        local mem=$(echo "$line" | awk '{print $4}' | sed 's/%//')
        
        # Check CPU usage
        if (( $(echo "$cpu > 80" | bc -l) )); then
            high_cpu_containers+=("$name:$cpu%")
            log_warn "High CPU usage detected: $name ($cpu%)"
        fi
        
        # Check memory usage
        if (( $(echo "$mem > 90" | bc -l) )); then
            high_memory_containers+=("$name:$mem%")
            log_warn "High memory usage detected: $name ($mem%)"
        fi
    done
}

# Check container health status
check_container_health() {
    log_info "Checking container health status..."
    
    local unhealthy_containers=()
    
    # Get all containers with health checks
    docker ps --filter "health=unhealthy" --format "{{.Names}}" | while read -r container; do
        if [ -n "$container" ]; then
            unhealthy_containers+=("$container")
            log_error "Unhealthy container detected: $container"
            
            # Get health check logs
            docker inspect "$container" --format='{{json .State.Health.Log}}' | jq -r '.[] | "\(.Start): \(.Output)"' | tail -5 >> "$LOG_DIR/health-failures.log"
        fi
    done
}

# Monitor failed authentication attempts (Authelia)
monitor_auth_failures() {
    log_info "Monitoring authentication failures..."
    
    local authelia_log="/opt/appdata/authelia/authelia.log"
    if [ -f "$authelia_log" ]; then
        # Check for recent failed authentication attempts
        local failed_attempts=$(grep -c "Authentication failed" "$authelia_log" 2>/dev/null || echo "0")
        
        if [ "$failed_attempts" -gt 10 ]; then
            log_warn "High number of authentication failures detected: $failed_attempts"
            
            # Extract recent failed attempts with IPs
            grep "Authentication failed" "$authelia_log" | tail -10 >> "$LOG_DIR/auth-failures.log"
        fi
    fi
}

# Monitor Traefik access logs for suspicious activity
monitor_traefik_access() {
    log_info "Monitoring Traefik access patterns..."
    
    local traefik_log="/opt/appdata/traefik/traefik.log"
    if [ -f "$traefik_log" ]; then
        # Check for suspicious patterns
        local suspicious_patterns=(
            "sqlmap"
            "nikto"
            "nmap"
            "gobuster"
            "dirbuster"
            "burp"
            "\.php"
            "\.asp"
            "admin.php"
            "wp-admin"
            "phpmyadmin"
        )
        
        for pattern in "${suspicious_patterns[@]}"; do
            local matches=$(grep -i "$pattern" "$traefik_log" 2>/dev/null | wc -l || echo "0")
            if [ "$matches" -gt 0 ]; then
                log_warn "Suspicious pattern detected: $pattern ($matches occurrences)"
                grep -i "$pattern" "$traefik_log" | tail -5 >> "$LOG_DIR/suspicious-access.log"
            fi
        done
        
        # Check for excessive 404s from same IP (potential scanning)
        awk '$9 == 404 {print $1}' "$traefik_log" 2>/dev/null | sort | uniq -c | awk '$1 > 50 {print $2 " - " $1 " 404s"}' | while read -r suspicious_ip; do
            if [ -n "$suspicious_ip" ]; then
                log_warn "Potential scanning activity: $suspicious_ip"
                echo "$(date '+%Y-%m-%d %H:%M:%S') $suspicious_ip" >> "$LOG_DIR/scanning-activity.log"
            fi
        done
    fi
}

# Check for security updates
check_security_updates() {
    log_info "Checking for security updates..."
    
    # Check if system has security updates available
    if command -v apt &> /dev/null; then
        local security_updates=$(apt list --upgradable 2>/dev/null | grep -i security | wc -l)
        if [ "$security_updates" -gt 0 ]; then
            log_warn "Security updates available: $security_updates packages"
            apt list --upgradable 2>/dev/null | grep -i security >> "$LOG_DIR/security-updates.log"
        fi
    fi
}

# Monitor disk space
monitor_disk_space() {
    log_info "Monitoring disk space..."
    
    # Check critical mount points
    local critical_mounts=("/" "/opt" "/mnt" "/var/lib/docker")
    
    for mount in "${critical_mounts[@]}"; do
        if mountpoint -q "$mount" 2>/dev/null || [ "$mount" = "/" ]; then
            local usage=$(df "$mount" | awk 'NR==2 {print $5}' | sed 's/%//')
            if [ "$usage" -gt 90 ]; then
                log_error "Critical disk space warning: $mount at ${usage}%"
            elif [ "$usage" -gt 80 ]; then
                log_warn "High disk space usage: $mount at ${usage}%"
            fi
        fi
    done
}

# Check Docker daemon security
check_docker_security() {
    log_info "Checking Docker daemon security..."
    
    # Check if Docker socket is exposed
    if [ -S "/var/run/docker.sock" ]; then
        local socket_perms=$(stat -c "%a" /var/run/docker.sock)
        if [ "$socket_perms" != "660" ] && [ "$socket_perms" != "600" ]; then
            log_warn "Docker socket permissions may be too permissive: $socket_perms"
        fi
    fi
    
    # Check for containers running as root
    docker ps --format "{{.Names}}" | while read -r container; do
        local user=$(docker inspect "$container" --format='{{.Config.User}}' 2>/dev/null || echo "")
        if [ -z "$user" ] || [ "$user" = "0" ] || [ "$user" = "root" ]; then
            log_warn "Container running as root: $container"
            echo "$(date '+%Y-%m-%d %H:%M:%S') $container" >> "$LOG_DIR/root-containers.log"
        fi
    done
}

# Send Discord notification
send_discord_alert() {
    local title="$1"
    local description="$2"
    local color="$3"  # decimal color
    
    if [ -z "$DISCORD_WEBHOOK" ]; then
        log_warn "Discord webhook not configured, skipping notification"
        return
    fi
    
    local json_payload=$(cat <<EOF
{
    "username": "HomelabARR Security Monitor",
    "embeds": [
        {
            "title": "$title",
            "description": "$description",
            "color": $color,
            "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
            "footer": {
                "text": "HomelabARR Security Monitor"
            }
        }
    ]
}
EOF
)
    
    curl -H "Content-Type: application/json" \
         -d "$json_payload" \
         "$DISCORD_WEBHOOK" &>/dev/null || log_warn "Failed to send Discord notification"
}

# Generate security report
generate_security_report() {
    log_info "Generating security report..."
    
    local report_file="$LOG_DIR/security-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" <<EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
    "hostname": "$(hostname)",
    "containers": {
        "total": $(docker ps --format "{{.Names}}" | wc -l),
        "unhealthy": $(docker ps --filter "health=unhealthy" --format "{{.Names}}" | wc -l)
    },
    "disk_usage": {
        "root": "$(df / | awk 'NR==2 {print $5}')",
        "docker": "$(df /var/lib/docker 2>/dev/null | awk 'NR==2 {print $5}' || echo 'N/A')"
    },
    "security_updates": $(apt list --upgradable 2>/dev/null | grep -i security | wc -l),
    "log_files": [
        "$(ls -la $LOG_DIR/*.log 2>/dev/null | wc -l) log files"
    ]
}
EOF
    
    log_info "Security report generated: $report_file"
}

# Main monitoring function
run_security_monitor() {
    log_info "Starting HomelabARR security monitoring..."
    
    check_dependencies
    
    # Run all monitoring checks
    monitor_container_resources
    check_container_health
    monitor_auth_failures
    monitor_traefik_access
    check_security_updates
    monitor_disk_space
    check_docker_security
    
    # Generate report
    generate_security_report
    
    log_info "Security monitoring cycle completed"
}

# Cleanup old logs
cleanup_logs() {
    log_info "Cleaning up old log files..."
    
    # Remove logs older than 30 days
    find "$LOG_DIR" -name "*.log" -type f -mtime +30 -delete 2>/dev/null || true
    find "$LOG_DIR" -name "security-report-*.json" -type f -mtime +7 -delete 2>/dev/null || true
    
    log_info "Log cleanup completed"
}

# Usage information
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  --monitor     Run full security monitoring cycle"
    echo "  --cleanup     Clean up old log files"
    echo "  --report      Generate security report only"
    echo "  --help        Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  DISCORD_SECURITY_WEBHOOK  Discord webhook URL for alerts"
}

# Main script logic
main() {
    case "${1:-}" in
        --monitor)
            run_security_monitor
            ;;
        --cleanup)
            cleanup_logs
            ;;
        --report)
            generate_security_report
            ;;
        --help)
            usage
            ;;
        "")
            run_security_monitor
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
