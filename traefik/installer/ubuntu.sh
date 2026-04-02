#!/bin/bash
set -e

# HomelabARR CE — Traefik + Authelia Setup
# Interactive wizard that configures domain, Cloudflare, Authelia, and deploys

BASEFOLDER="/opt/appdata"
HOMELABARR="/opt/homelabarr"
COMPOSE_FILE="$BASEFOLDER/compose/docker-compose.yml"
TEMPLATES="$HOMELABARR/traefik/templates"

# ─── Helpers ─────────────────────────────────────────────────────────────────

# Portable sed -i (works on macOS and Linux)
sedi() {
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

generate_secret() {
  openssl rand -hex 32
}

get_public_ip() {
  curl -s --max-time 5 ifconfig.me 2>/dev/null || echo ""
}

# ─── Setup Functions ─────────────────────────────────────────────────────────

check_existing() {
  local installed
  installed=$(docker ps -a --format '{{.Names}}' | grep -x 'traefik' || true)
  if [[ -n "$installed" ]]; then
    printf "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠️  Traefik is already deployed.

  [ Y ] Force reset (clean deploy)
  [ N ] Cancel (back to menu)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"
    read -rp "Are you sure? " choice </dev/tty
    case "$choice" in
      [Yy]) copy_templates ;;
      *) exit 0 ;;
    esac
  else
    copy_templates
  fi
}

copy_templates() {
  if ! command -v rsync &>/dev/null; then
    apt-get install -y -qq rsync >/dev/null 2>&1
  fi
  rsync -aqhv "$TEMPLATES/" "$BASEFOLDER/" --exclude='local' --exclude='installer'
  mkdir -p "$BASEFOLDER"/{authelia,traefik} "$BASEFOLDER/traefik"/{rules,acme}
  chown -R 1000:1000 "$BASEFOLDER"/{authelia,traefik}
  touch "$BASEFOLDER/traefik/acme/acme.json" "$BASEFOLDER/traefik/traefik.log" "$BASEFOLDER/authelia/authelia.log"
  chmod 600 "$BASEFOLDER/traefik/traefik.log" "$BASEFOLDER/authelia/authelia.log" "$BASEFOLDER/traefik/acme/acme.json"
  show_menu
}

prompt_domain() {
  printf "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🌐 Domain

  Note: .cf, .ga, .gq, .ml, .tk domains require manual DNS records
  in Cloudflare — the API won't add them automatically.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"
  read -rp "Enter your domain: " DOMAIN </dev/tty
  if [[ -z "$DOMAIN" ]]; then
    echo "Domain cannot be empty."
    prompt_domain
    return
  fi

  # Add to /etc/hosts if not already there
  if ! grep -q "$DOMAIN" /etc/hosts 2>/dev/null; then
    printf "127.0.0.1  *.%s\n127.0.0.1  %s\n" "$DOMAIN" "$DOMAIN" >> /etc/hosts
  fi

  if [[ "$DOMAIN" != "example.com" ]]; then
    sedi "s/example.com/$DOMAIN/g" "$BASEFOLDER/authelia/configuration.yml"
    sedi "s/example.com/$DOMAIN/g" "$BASEFOLDER/traefik/rules/middlewares.toml"
    sedi "s/example.com/$DOMAIN/g" "$BASEFOLDER/compose/.env"
  fi
  clear && show_menu
}

prompt_username() {
  printf "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  👤 Authelia Username
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"
  read -rp "Enter your username: " DISPLAYNAME </dev/tty
  if [[ -z "$DISPLAYNAME" ]]; then
    echo "Username cannot be empty."
    prompt_username
    return
  fi
  sedi "s/<DISPLAYNAME>/$DISPLAYNAME/g" "$BASEFOLDER/authelia/users_database.yml"
  sedi "s/<USERNAME>/$DISPLAYNAME/g" "$BASEFOLDER/authelia/users_database.yml"
  clear && show_menu
}

prompt_password() {
  printf "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔒 Authelia Password
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"
  read -rp "Enter a password: " PASSWORD </dev/tty
  if [[ -z "$PASSWORD" ]]; then
    echo "Password cannot be empty."
    prompt_password
    return
  fi
  docker pull authelia/authelia -q >/dev/null
  local hashed
  hashed=$(docker run --rm authelia/authelia authelia crypto hash generate argon2 --password "$PASSWORD" | sed 's/Digest: //g')
  sedi "s|<PASSWORD>|${hashed}|g" "$BASEFOLDER/authelia/users_database.yml"
  clear && show_menu
}

prompt_cf_email() {
  printf "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📧 Cloudflare Email Address
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"
  read -rp "Enter your Cloudflare email: " EMAIL </dev/tty
  if [[ -z "$EMAIL" ]]; then
    echo "Email cannot be empty."
    prompt_cf_email
    return
  fi
  sedi "s/CF-EMAIL/$EMAIL/g" "$BASEFOLDER/authelia/configuration.yml" "$BASEFOLDER/authelia/users_database.yml"
  sedi "s/CF-EMAIL/$EMAIL/g" "$BASEFOLDER/compose/.env"
  clear && show_menu
}

prompt_cf_key() {
  printf "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔑 Cloudflare Global API Key
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"
  read -rp "Enter your Cloudflare Global Key: " CFGLOBAL </dev/tty
  if [[ -z "$CFGLOBAL" ]]; then
    echo "API key cannot be empty."
    prompt_cf_key
    return
  fi
  sedi "s/CF-API-KEY/$CFGLOBAL/g" "$BASEFOLDER/authelia/configuration.yml"
  sedi "s/CF-API-KEY/$CFGLOBAL/g" "$BASEFOLDER/compose/.env"
  clear && show_menu
}

prompt_cf_zone() {
  printf "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🆔 Cloudflare Zone ID
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"
  read -rp "Enter your Cloudflare Zone ID: " CFZONEID </dev/tty
  if [[ -z "$CFZONEID" ]]; then
    echo "Zone ID cannot be empty."
    prompt_cf_zone
    return
  fi
  sedi "s/CF-ZONE_ID/$CFZONEID/g" "$BASEFOLDER/compose/.env"
  clear && show_menu
}

# ─── Deploy ──────────────────────────────────────────────────────────────────

deploy() {
  echo "🚀 Deploying Traefik + Authelia..."

  # Source env for variable access
  # shellcheck source=/dev/null
  [[ -f "$BASEFOLDER/compose/.env" ]] && source "$BASEFOLDER/compose/.env"

  # Ensure ID is set
  grep -qE '^ID=' "$BASEFOLDER/compose/.env" 2>/dev/null || echo 'ID=1000' >> "$BASEFOLDER/compose/.env"

  # Generate SSL cert
  echo "🔐 Generating SSL certificate..."
  docker pull authelia/authelia -q >/dev/null
  docker run --rm -v "$BASEFOLDER/traefik/cert:/tmp/certs" authelia/authelia \
    authelia certificates generate --host "*.$DOMAIN" --dir /tmp/certs/ >/dev/null 2>&1

  # Generate secrets
  echo "🔑 Generating secrets..."
  local jwt_token session_secret encryption_key
  jwt_token=$(generate_secret)
  session_secret=$(generate_secret)
  encryption_key=$(generate_secret)
  sedi "s/JWTTOKENID/$jwt_token/g" "$BASEFOLDER/authelia/configuration.yml"
  sedi "s/unsecure_session_secret/$session_secret/g" "$BASEFOLDER/authelia/configuration.yml"
  sedi "s/encryption_key_secret/$encryption_key/g" "$BASEFOLDER/authelia/configuration.yml"

  # Set timezone
  local tz
  tz=$(timedatectl 2>/dev/null | grep "Time zone:" | awk '{print $3}' || echo "UTC")
  if [[ -n "$tz" ]]; then
    grep -q '^TZ=' "$BASEFOLDER/compose/.env" && sedi "/^TZ=/d" "$BASEFOLDER/compose/.env"
    echo "TZ=$tz" >> "$BASEFOLDER/compose/.env"
  fi

  # Set server IP
  local server_ip
  server_ip=$(get_public_ip)
  if [[ -n "$server_ip" ]]; then
    sedi "s/SERVERIP_ID/$server_ip/g" "$BASEFOLDER/authelia/configuration.yml"
    sedi "s/SERVERIP_ID/$server_ip/g" "$BASEFOLDER/compose/.env"
  fi

  # Stop existing traefik/authelia containers
  echo "🧹 Cleaning up old containers..."
  for container in $(docker ps -a --format '{{.Names}}' | grep -E 'trae|auth|error-pag' || true); do
    docker stop "$container" >/dev/null 2>&1 || true
    docker rm "$container" >/dev/null 2>&1 || true
  done
  docker image prune -af >/dev/null 2>&1 || true

  # Validate compose
  if [[ -f "$COMPOSE_FILE" ]]; then
    echo "✅ Validating compose file..."
    if ! docker compose -f "$COMPOSE_FILE" config >/dev/null 2>&1; then
      echo "⛔ Compose validation failed. Check $COMPOSE_FILE"
      read -rp "Press [ENTER] to return to menu..." </dev/tty
      clear && show_menu
      return
    fi

    echo "📦 Pulling images..."
    if ! docker compose -f "$COMPOSE_FILE" pull >/dev/null 2>&1; then
      echo "⛔ Image pull failed."
      read -rp "Press [ENTER] to return to menu..." </dev/tty
      clear && show_menu
      return
    fi

    echo "🚀 Starting services..."
    docker compose -f "$COMPOSE_FILE" up -d --force-recreate >/dev/null 2>&1

    # shellcheck source=/dev/null
    source "$BASEFOLDER/compose/.env"
    printf "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Traefik + Authelia deployed!

  Give it a minute to start up, then access:

    Authelia:  https://authelia.${DOMAIN}
    Traefik:   https://traefik.${DOMAIN}

  All apps will be available via https://app.${DOMAIN}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"
    sleep 5
    read -rp "Press [ENTER] to continue..." </dev/tty
    clear && show_menu
  else
    echo "⛔ Compose file not found: $COMPOSE_FILE"
    read -rp "Press [ENTER] to return to menu..." </dev/tty
    clear && show_menu
  fi
}

# ─── Menu ────────────────────────────────────────────────────────────────────

show_menu() {
  # Load current values for display
  local domain="" displayname="" password="" cf_email="" cf_key="" cf_zone=""
  if [[ -f "$BASEFOLDER/compose/.env" ]]; then
    # shellcheck source=/dev/null
    source "$BASEFOLDER/compose/.env"
    domain="${DOMAIN:-not set}"
    cf_email="${CLOUDFLARE_EMAIL:-not set}"
    cf_key="${CLOUDFLARE_API_KEY:-not set}"
    cf_zone="${DOMAIN1_ZONE_ID:-not set}"
  fi

  printf "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 Traefik + Authelia Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [1] Domain                    [ ${domain} ]
  [2] Authelia Username
  [3] Authelia Password
  [4] Cloudflare Email          [ ${cf_email} ]
  [5] Cloudflare Global Key     [ ${cf_key} ]
  [6] Cloudflare Zone ID        [ ${cf_zone} ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [D] Deploy Traefik + Authelia
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [Q] Exit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"
  read -rp "↘️  Choose an option: " choice </dev/tty
  case "$choice" in
    1) prompt_domain ;;
    2) prompt_username ;;
    3) prompt_password ;;
    4) prompt_cf_email ;;
    5) prompt_cf_key ;;
    6) prompt_cf_zone ;;
    [Dd]) deploy ;;
    [Qq]|exit|EXIT|Exit|close|[Zz]) exit 0 ;;
    *) clear && show_menu ;;
  esac
}

# ─── Entry Point ─────────────────────────────────────────────────────────────

if [[ $EUID -ne 0 ]]; then
  echo "⛔ Must run as root (use sudo)"
  exit 1
fi

check_existing
