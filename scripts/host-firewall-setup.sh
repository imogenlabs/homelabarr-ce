#!/usr/bin/env bash
set -eu
[ "$EUID" -eq 0 ] || { echo "must be root"; exit 1; }
if command -v ufw >/dev/null 2>&1; then
  echo "Configuring UFW..."
  ufw --force reset
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow 22/tcp comment 'ssh'
  ufw allow 80/tcp comment 'http (traefik acme)'
  ufw allow 443/tcp comment 'https (traefik)'
  ufw deny 2375/tcp comment 'docker daemon — must not be reachable'
  ufw deny 2376/tcp comment 'docker daemon TLS — must not be reachable'
  ufw allow in on lo
  ufw --force enable
  ufw status verbose
elif command -v nft >/dev/null 2>&1; then
  echo "Configuring nftables..."
  cat >/etc/nftables.conf <<'EOF'
table inet filter {
  chain input {
    type filter hook input priority filter; policy drop;
    ct state established,related accept
    iif lo accept
    tcp dport { 22, 80, 443 } accept
    ip protocol icmp accept
    ip6 nexthdr icmpv6 accept
    tcp dport { 2375, 2376 } drop comment "docker daemon"
  }
  chain forward { type filter hook forward priority filter; policy accept; }
  chain output  { type filter hook output  priority filter; policy accept; }
}
EOF
  systemctl enable --now nftables
  nft list ruleset | head -20
else
  echo "Neither ufw nor nft found — install one and re-run"
  exit 1
fi
echo "Host firewall configured."
