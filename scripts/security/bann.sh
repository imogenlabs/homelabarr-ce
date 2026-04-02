#!/bin/bash
#####################################
# HomelabARR CE Security Hardening  #
# IP banning and fail2ban config    #
#####################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}HomelabARR CE Security Hardening${NC}"

# Install dependencies
if command -v apt-get &>/dev/null; then
    apt-get -yqq install iptables ipset fail2ban 2>/dev/null || true
fi

# Set up IP blocklist via ipset
if command -v ipset &>/dev/null; then
    echo "Setting up IP blocklist..."
    ipset -q flush ips 2>/dev/null || true
    ipset -q create ips hash:net 2>/dev/null || true

    # Download community IP blocklist
    BLOCKLIST_URL="https://raw.githubusercontent.com/scriptzteam/IP-BlockList-v4/master/ips.txt"
    if curl -sf --compressed "$BLOCKLIST_URL" 2>/dev/null | grep -v "#" | grep -v -E "\s[1-2]$" | cut -f 1 | while read -r ip; do
        ipset add ips "$ip" 2>/dev/null || true
    done; then
        iptables -C INPUT -m set --match-set ips src -j DROP 2>/dev/null || \
            iptables -I INPUT -m set --match-set ips src -j DROP
        echo -e "${GREEN}IP blocklist applied${NC}"
    else
        echo -e "${RED}Failed to download blocklist (non-critical)${NC}"
    fi
fi

# Configure fail2ban for log4j/JNDI attacks
if [ -d /etc/fail2ban/filter.d ]; then
    echo "Configuring fail2ban filters..."

    cat > /etc/fail2ban/filter.d/log4j-jndi.conf << 'FILTER'
# Log4j JNDI attack filter
# Based on https://jay.gooby.org/2021/12/13/a-fail2ban-filter-for-the-log4j-cve-2021-44228
[Definition]
failregex = (?i)^<HOST> .* ".*\$.*(7B|\{).*(lower:)?.*j.*n.*d.*i.*:.*".*?$
FILTER

    # Authelia brute force protection
    if [ -f /opt/appdata/authelia/authelia.log ]; then
        cat > /etc/fail2ban/jail.d/authelia.conf << 'JAIL'
[authelia]
enabled = true
port = http,https,9091
filter = authelia
logpath = /opt/appdata/authelia/authelia.log
maxretry = 2
bantime = 90d
findtime = 7d
chain = DOCKER-USER
JAIL
    fi

    # Traefik log4j protection
    if [ -f /opt/appdata/traefik/traefik.log ]; then
        cat > /etc/fail2ban/jail.d/log4j.conf << 'JAIL'
[log4j-jndi]
enabled = true
maxretry = 1
port = 80,443
logpath = /opt/appdata/traefik/traefik.log
bantime = 365d
findtime = 1d
JAIL
    fi

    systemctl restart fail2ban 2>/dev/null || true
    echo -e "${GREEN}fail2ban configured${NC}"
fi

# Start Traefik log monitor in background if traefik log exists
TRAEFIK_LOG="/opt/appdata/traefik/traefik.log"
if [ -f "$TRAEFIK_LOG" ] && [ -f "$(dirname "$0")/traefik-bann.sh" ]; then
    if command -v screen &>/dev/null || apt-get install -yqq screen 2>/dev/null; then
        screen -S bannbadips -dm bash "$(dirname "$0")/traefik-bann.sh"
        echo -e "${GREEN}Traefik log monitor started${NC}"
    fi
fi

echo -e "${GREEN}Security hardening complete${NC}"
