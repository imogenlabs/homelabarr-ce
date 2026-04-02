# Traefik & Domain Setup

This guide is for when you're ready to go from `http://server-ip:PORT` to `https://plex.yourdomain.com` with automatic SSL certificates.

!!! info "This is optional"
    Traefik is completely optional. If you just want to deploy apps and access them by IP and port, skip this entirely and come back when you want custom domains.

!!! warning "Exposing services to the internet"
    If you make apps accessible outside your home network, use TLS (HTTPS) and enable authentication. Traefik + Authelia mode is the recommended setup for any internet-facing app. Don't expose an unauthenticated dashboard to the public internet.

---

## What You Need

- **A domain name** — around $10/year from Cloudflare, Namecheap, Google Domains, etc.
- **Cloudflare account** — free tier, manages your DNS (other providers work but Cloudflare is easiest for the DNS challenge)
- **Your server's public IP** — or use Cloudflare Tunnel if your ISP blocks ports

---

## How It Works

```
Someone types plex.yourdomain.com
→ Cloudflare DNS points to your server
→ Traefik (on your server) catches the request
→ Traefik routes it to the right container
→ SSL certificate handled automatically by Let's Encrypt
```

Set it up once — every new app you deploy in Traefik mode gets its own URL automatically.

---

## Step 1: Create the Docker Network

Traefik and your apps need to share a network:

```bash
docker network create proxy
```

One command, one time only.

## Step 2: Set Up Cloudflare DNS

1. Log in to [Cloudflare](https://dash.cloudflare.com) and select your domain
2. Create an **API token**: My Profile → API Tokens → Create Token → "Edit zone DNS" template
3. Save the token — you'll need it below

For DNS records, wildcard is easiest — one record covers all subdomains:

| Type | Name | Content | Proxy status |
|------|------|---------|-------|
| A | `*` | Your server's public IP | ✅ Proxied |
| A | `@` | Your server's public IP | ✅ Proxied |

## Step 3: Install Traefik

Create the config directory:

```bash
mkdir -p /opt/appdata/traefik
touch /opt/appdata/traefik/acme.json
chmod 600 /opt/appdata/traefik/acme.json
```

Create `traefik-compose.yml` — store your Cloudflare credentials as environment variables, not hardcoded in the file:

```bash
# Set these in your shell or .env file — don't put real values in the YAML
export CF_API_EMAIL=your@email.com
export CF_DNS_API_TOKEN=your-cloudflare-api-token
```

```yaml
# traefik-compose.yml
services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    ports:
      - 80:80
      - 443:443
    environment:
      - CF_API_EMAIL=${CF_API_EMAIL}
      - CF_DNS_API_TOKEN=${CF_DNS_API_TOKEN}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /opt/appdata/traefik/acme.json:/acme.json
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80
      - --entrypoints.https.address=:443
      - --entrypoints.web.http.redirections.entrypoint.to=https
      - --certificatesresolvers.dns-cloudflare.acme.dnschallenge=true
      - --certificatesresolvers.dns-cloudflare.acme.dnschallenge.provider=cloudflare
      - --certificatesresolvers.dns-cloudflare.acme.email=${CF_API_EMAIL}
      - --certificatesresolvers.dns-cloudflare.acme.storage=/acme.json
    networks:
      - proxy

networks:
  proxy:
    external: true
```

!!! warning "Keep secrets out of version control"
    Use environment variables or a `.env` file for `CF_API_EMAIL` and `CF_DNS_API_TOKEN`. Never paste real credentials directly into a YAML file you might commit to git.

Start Traefik:

```bash
docker compose -f traefik-compose.yml up -d
```

## Step 4: Deploy Apps with Traefik Mode

In the HomelabARR dashboard:

1. Click **Deploy** on any app
2. Choose **Traefik** as the deployment mode
3. Enter your domain name when prompted (e.g., `yourdomain.com`)
4. Click Deploy

Traefik automatically detects the new container, requests an SSL certificate from Let's Encrypt, and starts routing `https://appname.yourdomain.com` to it. No manual config needed.

---

## Adding Authelia (Recommended for Internet-Facing Apps)

Authelia puts a login page in front of your apps. Instead of anyone being able to hit `https://radarr.yourdomain.com`, they have to authenticate first — with optional two-factor authentication.

### Quick setup

Add Authelia to your `traefik-compose.yml` as a separate service:

```yaml
  authelia:
    image: authelia/authelia:latest
    container_name: authelia
    restart: unless-stopped
    volumes:
      - /opt/appdata/authelia:/config
    environment:
      - TZ=${TZ}
    labels:
      - traefik.enable=true
      - traefik.http.routers.authelia.rule=Host(`auth.${DOMAIN}`)
      - traefik.http.routers.authelia.entrypoints=https
      - traefik.http.routers.authelia.tls.certresolver=dns-cloudflare
      - traefik.http.middlewares.chain-authelia.forwardauth.address=http://authelia:9091/api/verify?rd=https://auth.${DOMAIN}
      - traefik.http.middlewares.chain-authelia.forwardauth.trustForwardHeader=true
      - traefik.http.middlewares.chain-authelia.forwardauth.authResponseHeaders=Remote-User,Remote-Groups,Remote-Name,Remote-Email
    networks:
      - proxy
```

The key piece is the `chain-authelia` middleware definition. HomelabARR's **Traefik + Authelia** deploy mode automatically attaches this middleware to any app you deploy — that's what locks it behind the login screen.

Authelia's own configuration (users, MFA method, session settings) lives in `/opt/appdata/authelia/configuration.yml`. See the [Authelia Traefik integration docs](https://www.authelia.com/integration/proxies/traefik/) for the full configuration reference.

### How it hooks into HomelabARR

Once Authelia is running, deploying any app with **Traefik + Authelia** mode automatically adds:

```yaml
traefik.http.routers.<app>.middlewares: chain-authelia@docker
```

to the container's labels. No manual config per app — HomelabARR handles it.

---

## CF Companion (Auto DNS)

Manually adding Cloudflare DNS records every time you deploy gets old fast. Deploy **CF Companion** from the **System & Utilities** category — it watches for new containers with Traefik labels and automatically creates the DNS records. Set it once and forget it.

---

## No Public IP? No Problem

- **Cloudflare Tunnel** — in the catalog as `Cloudflared`. Creates a secure outbound tunnel through Cloudflare so you don't need to open any ports. Works even with CGNAT.
- **Tailscale / WireGuard** — access your server over a VPN from anywhere without exposing it publicly.
