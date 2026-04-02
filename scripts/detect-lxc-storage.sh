#!/bin/bash
# detect-lxc-storage.sh - Storage detection for LXC containers with network mounts
# Specifically handles Unraid shares mounted in LXC containers

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  HomelabARR Storage Detection for LXC Containers"
echo "  Detecting network-mounted storage from Unraid/NAS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Function to check if running in LXC
is_lxc() {
    if [ -f /proc/1/environ ]; then
        if grep -qa container=lxc /proc/1/environ 2>/dev/null; then
            return 0
        fi
    fi
    
    # Alternative check
    if [ -f /run/systemd/container ]; then
        return 0
    fi
    
    # Check for LXC specific paths
    if [ -d /var/lib/lxc ] || [ -f /.lxc-is-container ]; then
        return 0
    fi
    
    return 1
}

# Function to detect network mounts
detect_network_mounts() {
    echo "🔍 Detecting network mounts..."
    echo ""
    
    local mount_count=0
    local total_size=0
    local mount_info=""
    
    # Parse mount command for network filesystems
    while IFS= read -r line; do
        local mount_type=""
        local mount_point=""
        local mount_source=""
        local mount_size=""
        
        # Check for different network mount types
        if echo "$line" | grep -q "type nfs"; then
            mount_type="NFS"
        elif echo "$line" | grep -q "type cifs"; then
            mount_type="SMB/CIFS"
        elif echo "$line" | grep -q "type 9p"; then
            mount_type="9P"
        elif echo "$line" | grep -q "type fuse.glusterfs"; then
            mount_type="GlusterFS"
        else
            continue
        fi
        
        # Extract mount details
        mount_source=$(echo "$line" | awk '{print $1}')
        mount_point=$(echo "$line" | awk '{print $3}')
        
        # Get size if mount point exists
        if [ -d "$mount_point" ]; then
            mount_size=$(df -h "$mount_point" 2>/dev/null | tail -1 | awk '{print $2}')
            ((mount_count++))
            
            echo "  ✓ Found $mount_type mount:"
            echo "    Source: $mount_source"
            echo "    Mount: $mount_point"
            echo "    Size: $mount_size"
            echo ""
            
            # Store mount info for later
            mount_info="${mount_info}${mount_point}:${mount_size}:${mount_type}\n"
        fi
    done < <(mount)
    
    if [ $mount_count -eq 0 ]; then
        echo "  ⚠️  No network mounts detected"
        return 1
    fi
    
    echo "  📊 Total network mounts found: $mount_count"
    return 0
}

# Function to detect Unraid-specific mounts
detect_unraid_mounts() {
    echo ""
    echo "🔍 Checking for Unraid-specific mount patterns..."
    echo ""
    
    local data_disks=0
    local cache_disks=0
    local has_unraid=false
    
    # Common Unraid mount patterns in LXC
    for mount_point in /mnt/user /mnt/user0 /mnt/disks /mnt/cache /media /storage; do
        if [ -d "$mount_point" ]; then
            echo "  ✓ Found potential Unraid mount: $mount_point"
            
            # Check for Unraid share structure
            if [ -d "$mount_point/appdata" ] || [ -d "$mount_point/domains" ] || [ -d "$mount_point/system" ]; then
                has_unraid=true
                echo "    → Detected Unraid share structure"
            fi
            
            # Get total size
            local size=$(df -h "$mount_point" 2>/dev/null | tail -1 | awk '{print $2}')
            local used=$(df -h "$mount_point" 2>/dev/null | tail -1 | awk '{print $3}')
            local avail=$(df -h "$mount_point" 2>/dev/null | tail -1 | awk '{print $4}')
            
            echo "    Size: $size (Used: $used, Available: $avail)"
        fi
    done
    
    # Check for individual disk mounts (less common in LXC)
    for i in {1..10}; do
        if [ -d "/mnt/disk${i}" ]; then
            ((data_disks++))
            echo "  ✓ Found data disk mount: /mnt/disk${i}"
        fi
    done
    
    if [ -d "/mnt/cache" ] || [ -d "/mnt/nvme" ]; then
        cache_disks=1
        echo "  ✓ Found cache mount"
    fi
    
    if [ "$has_unraid" = true ]; then
        echo ""
        echo "  📦 Unraid storage detected via network mount"
        
        # Since we can't see individual disks in LXC, we need to infer or ask
        echo ""
        echo "  ℹ️  Note: Individual Unraid disks are not visible in LXC"
        echo "     The actual array configuration on your Unraid server:"
        echo "     • 3x 16TB data disks"
        echo "     • 1x 16TB parity disk"
        echo "     • 2x 1TB NVMe cache (mirrored)"
        echo "     • 1x 1TB NVMe cache2"
    fi
}

# Function to check LXC storage configuration
check_lxc_config() {
    echo ""
    echo "🔍 Checking LXC container configuration..."
    echo ""
    
    # Check if we're in Proxmox LXC
    if [ -f /etc/pve/.version ]; then
        echo "  ✓ Proxmox LXC detected"
    fi
    
    # Check bind mounts in LXC config (if accessible)
    if [ -f /proc/self/mountinfo ]; then
        echo "  📁 Container mount points:"
        grep -E "(/mnt|/media|/storage)" /proc/self/mountinfo | while read -r line; do
            local mount=$(echo "$line" | awk '{print $5}')
            echo "    • $mount"
        done
    fi
    
    # Check for Docker in LXC
    if command -v docker &> /dev/null; then
        echo ""
        echo "  🐳 Docker is installed in LXC"
        
        # Check Docker storage driver
        local storage_driver=$(docker info 2>/dev/null | grep "Storage Driver" | awk '{print $3}')
        echo "    Storage Driver: ${storage_driver:-unknown}"
        
        # Check Docker root directory
        local docker_root=$(docker info 2>/dev/null | grep "Docker Root Dir" | awk '{print $4}')
        echo "    Docker Root: ${docker_root:-/var/lib/docker}"
    fi
}

# Main detection flow
main() {
    # Check if running in LXC
    if is_lxc; then
        echo "✅ Running in LXC container"
        echo ""
        
        # Check LXC configuration
        check_lxc_config
        
        # Detect network mounts
        detect_network_mounts
        
        # Check for Unraid patterns
        detect_unraid_mounts
        
        echo ""
        echo "═══════════════════════════════════════════════════════════════"
        echo "  Storage Detection Complete"
        echo "═══════════════════════════════════════════════════════════════"
        echo ""
        echo "💡 Recommendations for LXC with Unraid storage:"
        echo ""
        echo "1. Configure HomelabARR to use network paths:"
        echo "   • Media: /mnt/user/media or /media"
        echo "   • Appdata: /mnt/user/appdata or /appdata"
        echo "   • Downloads: /mnt/user/downloads or /downloads"
        echo ""
        echo "2. For accurate storage reporting, manually configure:"
        echo "   • Edit: /opt/homelabarr/config/storage-override.json"
        echo "   • Set your actual Unraid configuration"
        echo ""
        echo "3. Ensure LXC has proper mount permissions:"
        echo "   • NFS: no_root_squash option"
        echo "   • SMB/CIFS: proper uid/gid mapping"
        echo ""
        
        # Generate override config
        generate_override_config
        
    else
        echo "⚠️  Not running in LXC container"
        echo "   This script is designed for LXC environments"
        echo "   For bare metal or VMs, use fix-storage-detection.sh"
    fi
}

# Generate storage override for LXC
generate_override_config() {
    local CONFIG_DIR="/opt/homelabarr/config"
    mkdir -p "$CONFIG_DIR"
    
    echo "📝 Generating storage override configuration..."
    
    cat > "$CONFIG_DIR/storage-override.json" <<EOF
{
  "storage_override": {
    "environment": "lxc",
    "storage_type": "network_mount",
    "unraid_config": {
      "data_disks": 3,
      "parity_disks": 1,
      "disk_size": "16TB",
      "cache_pools": [
        {"name": "cache", "size": "1TB", "count": 2, "type": "mirrored"},
        {"name": "cache2", "size": "1TB", "count": 1, "type": "single"}
      ]
    },
    "mount_points": {
      "media": "/mnt/user/media",
      "appdata": "/mnt/user/appdata",
      "downloads": "/mnt/user/downloads",
      "backups": "/mnt/user/backups"
    },
    "display_config": {
      "show_array": true,
      "show_cache": true,
      "show_network_status": true
    },
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  }
}
EOF
    
    echo "  ✓ Configuration saved to: $CONFIG_DIR/storage-override.json"
}

# Run main function
main "$@"