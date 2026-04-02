#!/bin/bash
# intelligent-storage-detection.sh - Smart storage detection for all environments
# Detects: LXC (privileged/unprivileged), VM, bare metal, local disks, network mounts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "═══════════════════════════════════════════════════════════════"
echo "  HomelabARR Intelligent Storage Detection v2.0"
echo "  Auto-detecting environment and storage configuration"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Global variables
ENVIRONMENT_TYPE=""
CONTAINER_TYPE=""
IS_PRIVILEGED=false
HAS_LOCAL_DISKS=false
HAS_NETWORK_MOUNTS=false
LOCAL_DISK_COUNT=0
NETWORK_MOUNT_COUNT=0
DETECTION_RESULTS=""

# Function to detect environment type
detect_environment() {
    echo -e "${BLUE}🔍 Detecting environment type...${NC}"
    
    # Check if we're in a container
    if [ -f /run/systemd/container ]; then
        ENVIRONMENT_TYPE="container"
        
        # Check container type
        if grep -qa container=lxc /proc/1/environ 2>/dev/null; then
            CONTAINER_TYPE="lxc"
        elif [ -f /.dockerenv ]; then
            CONTAINER_TYPE="docker"
        elif grep -qa container=systemd-nspawn /proc/1/environ 2>/dev/null; then
            CONTAINER_TYPE="systemd-nspawn"
        else
            CONTAINER_TYPE="unknown"
        fi
        
    elif [ -f /proc/cpuinfo ] && grep -q "hypervisor" /proc/cpuinfo; then
        ENVIRONMENT_TYPE="vm"
        
        # Detect VM type
        if dmesg | grep -q "KVM"; then
            CONTAINER_TYPE="kvm"
        elif dmesg | grep -q "VMware"; then
            CONTAINER_TYPE="vmware"
        elif dmesg | grep -q "VirtualBox"; then
            CONTAINER_TYPE="virtualbox"
        elif [ -d /proc/xen ]; then
            CONTAINER_TYPE="xen"
        else
            CONTAINER_TYPE="generic"
        fi
        
    else
        ENVIRONMENT_TYPE="baremetal"
        CONTAINER_TYPE="none"
    fi
    
    echo -e "  ${GREEN}✓${NC} Environment: ${YELLOW}$ENVIRONMENT_TYPE${NC}"
    if [ "$CONTAINER_TYPE" != "none" ]; then
        echo -e "  ${GREEN}✓${NC} Type: ${YELLOW}$CONTAINER_TYPE${NC}"
    fi
}

# Function to check LXC privileges
check_lxc_privileges() {
    if [ "$CONTAINER_TYPE" != "lxc" ]; then
        return
    fi
    
    echo -e "${BLUE}🔍 Checking LXC container privileges...${NC}"
    
    # Multiple methods to detect privileged status
    
    # Method 1: Check UID mapping
    if [ -f /proc/self/uid_map ]; then
        local uid_map=$(cat /proc/self/uid_map)
        if echo "$uid_map" | grep -q "^[[:space:]]*0[[:space:]]*0[[:space:]]*4294967295"; then
            IS_PRIVILEGED=true
        fi
    fi
    
    # Method 2: Check capabilities
    if command -v capsh &> /dev/null; then
        if capsh --print | grep -q "cap_sys_admin"; then
            IS_PRIVILEGED=true
        fi
    fi
    
    # Method 3: Check if we can access block devices
    if ls /dev/sd* &>/dev/null || ls /dev/nvme* &>/dev/null; then
        IS_PRIVILEGED=true
    fi
    
    # Method 4: Check mount capabilities
    if mount | grep -q "/dev/"; then
        IS_PRIVILEGED=true
    fi
    
    # Method 5: Check cgroup permissions
    if [ -w /sys/fs/cgroup ]; then
        IS_PRIVILEGED=true
    fi
    
    if [ "$IS_PRIVILEGED" = true ]; then
        echo -e "  ${GREEN}✓${NC} Container mode: ${YELLOW}PRIVILEGED${NC}"
        echo -e "    • Can access block devices"
        echo -e "    • Can mount filesystems"
        echo -e "    • Full hardware access"
    else
        echo -e "  ${YELLOW}⚠${NC} Container mode: ${YELLOW}UNPRIVILEGED${NC}"
        echo -e "    • Limited block device access"
        echo -e "    • Restricted mount capabilities"
        echo -e "    • Relies on bind mounts from host"
    fi
}

# Function to detect local disks
detect_local_disks() {
    echo ""
    echo -e "${BLUE}🔍 Detecting local disks...${NC}"
    
    local found_disks=""
    
    # Try lsblk first (most reliable)
    if command -v lsblk &> /dev/null; then
        # Check for actual disk devices
        while IFS= read -r line; do
            if [[ "$line" =~ ^(sd[a-z]|nvme[0-9]n[0-9]|vd[a-z]|xvd[a-z]) ]]; then
                LOCAL_DISK_COUNT=$((LOCAL_DISK_COUNT + 1))
                local device="/dev/${BASH_REMATCH[1]}"
                local size=$(lsblk -b -n -o SIZE "$device" 2>/dev/null | head -1)
                local size_human=$(numfmt --to=iec-i --suffix=B "$size" 2>/dev/null || echo "Unknown")
                
                echo -e "  ${GREEN}✓${NC} Found disk: $device (${size_human})"
                found_disks="${found_disks}${device}:${size_human}\n"
                HAS_LOCAL_DISKS=true
            fi
        done < <(lsblk -n -o NAME 2>/dev/null || true)
    fi
    
    # Fallback to /proc/partitions
    if [ $LOCAL_DISK_COUNT -eq 0 ] && [ -f /proc/partitions ]; then
        while read -r major minor blocks name; do
            if [[ "$name" =~ ^(sd[a-z]|nvme[0-9]n[0-9]|vd[a-z]|xvd[a-z])$ ]]; then
                LOCAL_DISK_COUNT=$((LOCAL_DISK_COUNT + 1))
                local device="/dev/$name"
                local size_kb=$blocks
                local size_human=$(echo "$size_kb" | awk '{printf "%.1fGB", $1/1024/1024}')
                
                echo -e "  ${GREEN}✓${NC} Found disk: $device (${size_human})"
                found_disks="${found_disks}${device}:${size_human}\n"
                HAS_LOCAL_DISKS=true
            fi
        done < <(tail -n +3 /proc/partitions 2>/dev/null || true)
    fi
    
    # Check if disks are accessible
    if [ "$HAS_LOCAL_DISKS" = true ]; then
        echo -e "  ${GREEN}✓${NC} Total local disks: ${YELLOW}$LOCAL_DISK_COUNT${NC}"
        
        # In unprivileged LXC, we might see disks but can't access them
        if [ "$CONTAINER_TYPE" = "lxc" ] && [ "$IS_PRIVILEGED" = false ]; then
            echo -e "  ${YELLOW}⚠${NC} Note: Disks visible but may not be directly accessible in unprivileged LXC"
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} No local disks detected"
        
        if [ "$CONTAINER_TYPE" = "lxc" ] && [ "$IS_PRIVILEGED" = false ]; then
            echo -e "    • This is normal for unprivileged LXC containers"
            echo -e "    • Storage should be provided via bind mounts"
        fi
    fi
}

# Function to detect network mounts
detect_network_mounts() {
    echo ""
    echo -e "${BLUE}🔍 Detecting network mounts...${NC}"
    
    local mount_details=""
    
    # Parse mount output for network filesystems
    while IFS= read -r line; do
        local fs_type=""
        local mount_point=""
        local source=""
        local detected=false
        
        # NFS mounts
        if echo "$line" | grep -q "type nfs"; then
            fs_type="NFS"
            detected=true
        # CIFS/SMB mounts
        elif echo "$line" | grep -q "type cifs"; then
            fs_type="SMB/CIFS"
            detected=true
        # 9P mounts (common in VMs/containers)
        elif echo "$line" | grep -q "type 9p"; then
            fs_type="9P"
            detected=true
        # GlusterFS
        elif echo "$line" | grep -q "type fuse.glusterfs"; then
            fs_type="GlusterFS"
            detected=true
        # SSHFS
        elif echo "$line" | grep -q "type fuse.sshfs"; then
            fs_type="SSHFS"
            detected=true
        fi
        
        if [ "$detected" = true ]; then
            source=$(echo "$line" | awk '{print $1}')
            mount_point=$(echo "$line" | awk '{print $3}')
            
            if [ -d "$mount_point" ]; then
                NETWORK_MOUNT_COUNT=$((NETWORK_MOUNT_COUNT + 1))
                HAS_NETWORK_MOUNTS=true
                
                # Get mount size
                local size=$(df -h "$mount_point" 2>/dev/null | tail -1 | awk '{print $2}')
                local used=$(df -h "$mount_point" 2>/dev/null | tail -1 | awk '{print $3}')
                local avail=$(df -h "$mount_point" 2>/dev/null | tail -1 | awk '{print $4}')
                
                echo -e "  ${GREEN}✓${NC} $fs_type mount:"
                echo -e "    • Source: ${YELLOW}$source${NC}"
                echo -e "    • Mount: ${YELLOW}$mount_point${NC}"
                echo -e "    • Size: $size (Used: $used, Available: $avail)"
                
                mount_details="${mount_details}${fs_type}:${mount_point}:${size}\n"
                
                # Check if this looks like Unraid
                if [[ "$mount_point" =~ /mnt/(user|disks|cache) ]] || [[ "$source" =~ unraid ]]; then
                    echo -e "    ${BLUE}→ Likely Unraid share${NC}"
                fi
            fi
        fi
    done < <(mount)
    
    if [ "$HAS_NETWORK_MOUNTS" = true ]; then
        echo -e "  ${GREEN}✓${NC} Total network mounts: ${YELLOW}$NETWORK_MOUNT_COUNT${NC}"
    else
        echo -e "  ${YELLOW}⚠${NC} No network mounts detected"
    fi
}

# Function to detect bind mounts (common in LXC)
detect_bind_mounts() {
    if [ "$CONTAINER_TYPE" != "lxc" ]; then
        return
    fi
    
    echo ""
    echo -e "${BLUE}🔍 Detecting LXC bind mounts...${NC}"
    
    local bind_count=0
    
    # Check for bind mounts from host
    if [ -f /proc/self/mountinfo ]; then
        while IFS= read -r line; do
            if echo "$line" | grep -q "bind" || echo "$line" | grep -E "(/mnt|/media|/storage)" | grep -qv "type"; then
                local mount_point=$(echo "$line" | awk '{print $5}')
                
                # Skip system mounts
                if [[ "$mount_point" =~ ^/(proc|sys|dev|run) ]]; then
                    continue
                fi
                
                if [ -d "$mount_point" ] && [[ "$mount_point" =~ (/mnt|/media|/storage) ]]; then
                    bind_count=$((bind_count + 1))
                    local size=$(df -h "$mount_point" 2>/dev/null | tail -1 | awk '{print $2}')
                    echo -e "  ${GREEN}✓${NC} Bind mount: ${YELLOW}$mount_point${NC} ($size)"
                fi
            fi
        done < /proc/self/mountinfo
    fi
    
    if [ $bind_count -gt 0 ]; then
        echo -e "  ${GREEN}✓${NC} Total bind mounts: ${YELLOW}$bind_count${NC}"
    fi
}

# Function to generate intelligent recommendation
generate_recommendation() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${GREEN}📊 Storage Detection Summary${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    echo -e "Environment: ${YELLOW}$ENVIRONMENT_TYPE${NC}"
    if [ "$CONTAINER_TYPE" != "none" ]; then
        echo -e "Container Type: ${YELLOW}$CONTAINER_TYPE${NC}"
        if [ "$CONTAINER_TYPE" = "lxc" ]; then
            echo -e "LXC Mode: ${YELLOW}$([ "$IS_PRIVILEGED" = true ] && echo "Privileged" || echo "Unprivileged")${NC}"
        fi
    fi
    echo ""
    
    echo -e "Storage Detection Results:"
    echo -e "  • Local Disks: ${YELLOW}$LOCAL_DISK_COUNT${NC} $([ "$HAS_LOCAL_DISKS" = true ] && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}")"
    echo -e "  • Network Mounts: ${YELLOW}$NETWORK_MOUNT_COUNT${NC} $([ "$HAS_NETWORK_MOUNTS" = true ] && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}")"
    
    echo ""
    echo -e "${BLUE}💡 Recommendations:${NC}"
    
    # Environment-specific recommendations
    case "$ENVIRONMENT_TYPE" in
        "container")
            if [ "$CONTAINER_TYPE" = "lxc" ]; then
                if [ "$IS_PRIVILEGED" = true ]; then
                    echo "  • Privileged LXC detected - can access local storage"
                    echo "  • Consider using bind mounts for better performance"
                    if [ "$HAS_NETWORK_MOUNTS" = true ]; then
                        echo "  • Network mounts detected - good for shared storage"
                    fi
                else
                    echo "  • Unprivileged LXC - limited direct disk access"
                    echo "  • Use bind mounts from host for local storage"
                    echo "  • Network mounts are your primary storage option"
                    if [ "$HAS_NETWORK_MOUNTS" = false ]; then
                        echo -e "  ${YELLOW}⚠ No network mounts detected - configure NFS/SMB shares${NC}"
                    fi
                fi
            fi
            ;;
        "vm")
            echo "  • Virtual Machine detected"
            if [ "$HAS_LOCAL_DISKS" = true ]; then
                echo "  • Local disks available - good for performance"
            fi
            if [ "$HAS_NETWORK_MOUNTS" = true ]; then
                echo "  • Network storage also available for shared data"
            fi
            ;;
        "baremetal")
            echo "  • Bare metal installation - full hardware access"
            echo "  • Best performance with local disks"
            if [ "$HAS_NETWORK_MOUNTS" = true ]; then
                echo "  • Network mounts can supplement local storage"
            fi
            ;;
    esac
    
    # Storage configuration recommendation
    echo ""
    echo -e "${BLUE}📝 Configuration Strategy:${NC}"
    
    if [ "$HAS_LOCAL_DISKS" = true ] && [ "$HAS_NETWORK_MOUNTS" = true ]; then
        echo "  • Hybrid storage detected"
        echo "  • Use local disks for: Docker, cache, databases"
        echo "  • Use network mounts for: Media, backups, shared data"
    elif [ "$HAS_LOCAL_DISKS" = true ]; then
        echo "  • Local storage only configuration"
        echo "  • All data stored on local disks"
        echo "  • Consider adding network storage for backups"
    elif [ "$HAS_NETWORK_MOUNTS" = true ]; then
        echo "  • Network storage only configuration"
        echo "  • All data on network shares"
        echo "  • Ensure reliable network connection"
        echo "  • Consider local cache for performance"
    else
        echo -e "  ${RED}⚠ No storage detected!${NC}"
        echo "  • Check mount permissions"
        echo "  • Verify network connectivity"
        echo "  • Ensure proper container configuration"
    fi
}

# Function to save detection results
save_detection_results() {
    local CONFIG_DIR="/opt/homelabarr/config"
    mkdir -p "$CONFIG_DIR"
    
    echo ""
    echo -e "${BLUE}💾 Saving detection results...${NC}"
    
    cat > "$CONFIG_DIR/storage-detection.json" <<EOF
{
  "detection_timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": {
    "type": "$ENVIRONMENT_TYPE",
    "container_type": "$CONTAINER_TYPE",
    "is_privileged": $([[ "$IS_PRIVILEGED" = true ]] && echo "true" || echo "false")
  },
  "storage": {
    "local_disks": {
      "detected": $([[ "$HAS_LOCAL_DISKS" = true ]] && echo "true" || echo "false"),
      "count": $LOCAL_DISK_COUNT
    },
    "network_mounts": {
      "detected": $([[ "$HAS_NETWORK_MOUNTS" = true ]] && echo "true" || echo "false"),
      "count": $NETWORK_MOUNT_COUNT
    }
  },
  "recommendations": {
    "primary_storage": "$([[ "$HAS_LOCAL_DISKS" = true ]] && echo "local" || echo "network")",
    "needs_configuration": $([[ $LOCAL_DISK_COUNT -eq 0 && $NETWORK_MOUNT_COUNT -eq 0 ]] && echo "true" || echo "false")
  }
}
EOF
    
    echo -e "  ${GREEN}✓${NC} Results saved to: $CONFIG_DIR/storage-detection.json"
}

# Main execution
main() {
    # Run detection steps
    detect_environment
    check_lxc_privileges
    detect_local_disks
    detect_network_mounts
    detect_bind_mounts
    
    # Generate recommendations
    generate_recommendation
    
    # Save results
    save_detection_results
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${GREEN}✅ Detection Complete${NC}"
    echo "═══════════════════════════════════════════════════════════════"
}

# Run main function
main "$@"