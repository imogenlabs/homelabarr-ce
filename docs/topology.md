# Deployment Topologies

## Topology A — Single Host (default)

All containers on one Docker host behind Traefik. The `homelabarr-internal` bridge network is the trust boundary.

```
Internet → Cloudflare → Traefik (:443) → frontend (:8080) → backend (:8092) → socket-proxy (:2375) → Docker socket (ro)
```

No mTLS required. This is the recommended setup for single-machine homelabs.

## Topology B — Split Host (edge VPS + home lab via WireGuard)

Traefik on an edge VPS terminates TLS. Backend runs on the home lab server, reachable only via WireGuard.

1. Install WireGuard on both hosts
2. On the backend host, bind the backend to the WG interface only:
   ```yaml
   ports: ["<wg-peer-ip>:8092:8092"]
   ```
3. Set host firewall to accept :8092 only from the WG peer:
   ```
   ufw allow from <wg-peer-ip> to any port 8092 proto tcp
   ```
4. Configure Traefik on the VPS to route to the WG address

### Optional: mTLS between Traefik and backend

For defense-in-depth on Topology B, add mTLS:

1. Generate a CA: `step ca init --name homelabarr-ca`
2. Issue a server cert for the backend
3. Issue a client cert for Traefik
4. Configure Traefik's dynamic config to present the client cert
