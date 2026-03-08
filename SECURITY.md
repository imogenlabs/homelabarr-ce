# Security Policy

## Supported Versions

Only the latest release is fully supported. The previous minor version receives security fixes only.

| Version | Supported |
|---------|-----------|
| Latest release | Yes — see [Releases](https://github.com/smashingtags/homelabarr-ce/releases/latest) |
| Previous minor | Security fixes only |
| Older versions | No |

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security issues privately:

- **Preferred:** [GitHub Security Advisory](https://github.com/smashingtags/homelabarr-ce/security/advisories/new) (private by default)
- **Email:** michael@mjashley.com
- **Subject line:** `[SECURITY] HomelabARR CE — <brief description>`

### What to include

- Description of the vulnerability
- Steps to reproduce
- Affected version(s)
- Potential impact
- Suggested fix (if you have one)

### Response timeline

- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 1 week
- **Fix (critical):** Within 72 hours of confirmation
- **Fix (high):** Within 2 weeks
- **Fix (medium/low):** Next release cycle

### What happens next

1. We confirm receipt and begin investigation
2. We work on a fix in a private branch
3. We release a patched version
4. We publicly disclose the vulnerability after the fix is available
5. We credit the reporter (unless they prefer anonymity)

## Security Best Practices for Users

### Docker Socket Access

HomelabARR CE requires access to the Docker socket to manage containers. In production:

- Mount the socket **read-only** where possible (`:ro`)
- Consider using a [Docker socket proxy](https://github.com/Tecnativa/docker-socket-proxy) to limit API access
- Run behind authentication (Authelia 2FA recommended)
- Do not expose port 8084 or 8092 to the public internet without a reverse proxy

### Authentication

- **Change the default admin password immediately** after first login
- Set a strong `JWT_SECRET` (use `openssl rand -base64 32`)
- Keep `AUTH_ENABLED=true` in production

### Network Security

- Use Traefik with SSL/TLS for any internet-facing deployment
- Keep the Docker `proxy` network isolated from host networking
- Use firewall rules (UFW) to restrict access to management ports

### Updates

- Watch this repository for new releases
- Pull updated Docker images regularly: `docker compose pull && docker compose up -d`
- Review the changelog before upgrading

## Scope

This policy covers the HomelabARR CE application code, Docker images, and official documentation. It does not cover:

- Third-party Docker images deployed through HomelabARR (report to the image maintainer)
- Your server's operating system or network configuration
- Cloudflare, Traefik, or Authelia vulnerabilities (report to their respective projects)

## Acknowledgments

We appreciate responsible disclosure and will credit security researchers who report valid vulnerabilities.
