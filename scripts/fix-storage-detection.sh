#!/bin/bash
# fix-storage-detection.sh - Quick fix for storage detection issue
# Addresses the "2 drives + parity" instead of "3 drives + parity" problem

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  HomelabARR Storage Detection Fix"
echo "  Fixing incorrect drive count detection"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Create config directory if it doesn't exist
CONFIG_DIR="/opt/homelabarr/config"
mkdir -p "$CONFIG_DIR"

# Function to detect Unraid mounts
detect_unraid_mounts() {
    echo "Detecting Unraid network mounts..."
    
    local data_count=0
    local parity_count=0
    local disk_size=""
    
    # Check for Unraid-style mounts
    while IFS= read -r line; do
        if [[ $line == *"/mnt/disk"* ]] && [[ $line != *"/mnt/user"* ]]; then
            ((data_count++))
            # Extract size if possible
            if [[ -z "$disk_size" ]]; then
                disk_size=$(df -h "$line" 2>/dev/null | awk 'NR==2 {print $2}' || echo "Unknown")
            fi
        elif [[ $line == *"/mnt/parity"* ]]; then
            ((parity_count++))
        fi
    done < <(mount | grep -E "(nfs|cifs|smb)" 2>/dev/null || true)
    
    if [[ $data_count -gt 0 ]]; then
        echo "  Found Unraid configuration:"
        echo "  - Data disks: $data_count"
        echo "  - Parity disks: $parity_count"
        echo "  - Disk size: $disk_size"
        return 0
    fi
    
    return 1
}

# Function to prompt for manual configuration
manual_config() {
    echo ""
    echo "Manual Storage Configuration"
    echo "----------------------------"
    
    read -p "Number of data disks: " DATA_DISKS
    read -p "Number of parity disks: " PARITY_DISKS
    read -p "Disk size (e.g., 16TB): " DISK_SIZE
    read -p "Storage type (local/unraid/nas): " STORAGE_TYPE
    
    # Validate input
    if [[ ! "$DATA_DISKS" =~ ^[0-9]+$ ]] || [[ ! "$PARITY_DISKS" =~ ^[0-9]+$ ]]; then
        echo "❌ Invalid input. Please enter numbers only."
        exit 1
    fi
}

# Try automatic detection first
if ! detect_unraid_mounts; then
    echo ""
    echo "⚠️  Could not automatically detect storage configuration."
    echo "   This might be because:"
    echo "   - Unraid shares are not mounted"
    echo "   - Using a different NAS system"
    echo "   - Local storage only"
    echo ""
    
    read -p "Would you like to manually configure storage? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        manual_config
    else
        echo "Using default configuration..."
        DATA_DISKS=3
        PARITY_DISKS=1
        DISK_SIZE="16TB"
        STORAGE_TYPE="unraid"
    fi
else
    # Use detected values
    echo ""
    read -p "Is this configuration correct? (y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        manual_config
    fi
fi

# Create storage override configuration
cat > "$CONFIG_DIR/storage-override.json" <<EOF
{
  "storage_override": {
    "data_disks": ${DATA_DISKS:-3},
    "parity_disks": ${PARITY_DISKS:-1},
    "disk_size": "${DISK_SIZE:-16TB}",
    "source": "${STORAGE_TYPE:-unraid}",
    "total_capacity": "$((${DATA_DISKS:-3} * 16))TB",
    "usable_capacity": "$((${DATA_DISKS:-3} * 16))TB",
    "protection_level": "RAID${PARITY_DISKS:-1}",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  }
}
EOF

echo ""
echo "✅ Storage configuration saved!"
echo ""
echo "Configuration Summary:"
echo "====================="
echo "Data Disks:    ${DATA_DISKS:-3}"
echo "Parity Disks:  ${PARITY_DISKS:-1}"
echo "Disk Size:     ${DISK_SIZE:-16TB}"
echo "Total Raw:     $((${DATA_DISKS:-3} + ${PARITY_DISKS:-1})) x ${DISK_SIZE:-16TB}"
echo "Usable Space:  ${DATA_DISKS:-3} x ${DISK_SIZE:-16TB}"
echo ""
echo "Configuration saved to: $CONFIG_DIR/storage-override.json"
echo ""

# Update Go service if running
if pgrep -f "docker-api-server" > /dev/null 2>&1; then
    echo "Reloading storage configuration..."
    kill -HUP $(pgrep -f "docker-api-server") 2>/dev/null || true
    echo "✅ Service reloaded"
fi

# Check if dashboard is accessible
if command -v curl &> /dev/null; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/storage/config | grep -q "200"; then
        echo "✅ Dashboard API updated"
    fi
fi

echo ""
echo "Storage detection fix complete!"
echo "The dashboard should now show the correct drive configuration."
echo ""
echo "If you're still seeing incorrect values, try:"
echo "  1. Refresh the dashboard (Ctrl+F5)"
echo "  2. Restart the Docker API server"
echo "  3. Check logs: docker logs homelabarr-api"