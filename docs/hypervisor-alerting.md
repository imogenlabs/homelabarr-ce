# Hypervisor alerting

Covers the two faults that took the public demo down for sixteen days in July 2026:
the hypervisor's root filesystem filled, QEMU paused every guest with I/O errors, and a
paused domain answered no ping and no SSH — which looks exactly like dead hardware.
Nothing alerted, so nobody knew.

Runs on **`eightly-t320-b` (192.168.1.73)**, the hypervisor hosting the CE VMs.

This is the in-homelab layer. External uptime checking is separate and deliberately
lives outside the homelab, on GitHub's infrastructure — see `.github/workflows/uptime.yml`.
A checker inside the homelab dies with the homelab.

## What it is

| Piece | Path on the host |
|---|---|
| Script | `/usr/local/bin/homelabarr-host-alert` |
| Config (delivery) | `/etc/homelabarr/host-alert.env`, mode 600 |
| State | `/var/lib/homelabarr/host-alert.state` |
| Unit | `/etc/systemd/system/homelabarr-host-alert.service` |
| Timer | `/etc/systemd/system/homelabarr-host-alert.timer`, every 5 min |

Sources of truth are in this repo under `scripts/host-alert/`.

## Why it is standalone

`192.168.1.73` already runs Prometheus, Alertmanager, Grafana, node-exporter and cAdvisor
— but **that stack belongs to Eight.ly OS**, not to HomelabARR. It is installed and
reconciled by the `eightly` binary:

- `docker-compose.monitoring.yml` carries an `eightly-monitoring-schema:` marker. If the
  file's digest matches a version Eight.ly shipped, a newer binary **replaces it**. If you
  edit it, the box reads as operator-modified and stops receiving Eight.ly fixes
  altogether. So the compose file is off-limits, which rules out node-exporter's textfile
  collector for the paused-domain signal.
- The box is on schema 5 while the installed binary ships schema 7, so it has not
  converged — another reason not to build HomelabARR alerting on top of it.

Hence: this alerting owns nothing of theirs and they own nothing of it. It needs only
`df`, `virsh`, `curl` and `python3`.

Worth knowing separately: that Alertmanager's only receiver is `default` with **no
integrations at all**, so anything it fires today goes nowhere. That is an Eight.ly OS
issue, not this one, but do not mistake its presence for coverage.

## What it checks

| Condition | Threshold | Why |
|---|---|---|
| Root filesystem usage | `>= 85%` | The July outage started here. `ce-prod.qcow2` is 61G and grows. |
| Paused libvirt domains | any | A paused domain is indistinguishable from a dead box until you ask for the reason. |

It is **silent while healthy**. It alerts once when a condition starts and once more when
it clears — it does not re-post every five minutes.

## It fails loudly on purpose

A notifier that quietly posts into the void is worse than no notifier. Five separate
silent failures were found on 2026-08-11, including a Discord webhook dead since February
whose failure was swallowed by `>/dev/null`. So:

- No destination configured → exit **78** on **every** run, healthy or not, so the unit
  sits in `systemctl list-units --failed` until it is fixed. This is checked up front on
  purpose: checking it only when there was something to send meant a healthy host exited
  0 without ever touching the destination, leaving an unconfigured notifier invisible
  until the outage it was installed to report.
- A destination rejects the message (SMTP refuses, or Discord answers `404 Unknown
  Webhook`) → exit **1**, the error and the undelivered alert are logged, and **state is
  not recorded** so the next run retries instead of going quiet.
- If more than one destination is configured, **every** one of them must accept the
  message. A partial delivery still fails the unit — silently dropping one channel is
  exactly how a dead webhook went unnoticed from February to August.

State is only written after a delivery actually succeeded.

## How it delivers: email

`/etc/homelabarr/host-alert.env` (mode 600, root-only) holds:

```bash
SMTP_URL='smtp://<user>:<app-password>@smtp.gmail.com:587'
ALERT_EMAIL_TO='michael@mjashley.com'
```

Alerts arrive as mail in the inbox. **Discord was the original plan and it is still
supported** — set `WEBHOOK_URL` and it will post there too — but Discord was the reason
this alerted nobody for six weeks: it needed a webhook that had to be created by hand,
and until that happened the unit just sat in `failed`. Mail needed no new account, no new
credential and no setup: `SMTP_URL` is the identity the estate already sends mail with,
copied from `/opt/eightly-updates/.env` on the VPS.

Email also has a property a webhook does not: **you can prove it arrived.** A Discord
webhook returning HTTP 204 tells you the request was accepted, not that anyone will ever
see it. A message in the inbox is the delivery itself.

`SMTP_URL` is parsed with `urllib.parse`, not `cut` — the username is percent-encoded
(`michael%40mjashley.com`) and the password can contain URL-significant characters.
`curl --ssl-reqd` forces STARTTLS, so the credential is never sent in the clear.

Until a destination here is real, the unit fails every five minutes by design.

## Verifying it — fire it, do not read it

```bash
# Healthy: silent, exit 0
/usr/local/bin/homelabarr-host-alert; echo $?

# Force the disk rule without filling the disk
DISK_THRESHOLD=50 /usr/local/bin/homelabarr-host-alert

# Prove paused-domain detection against a real pause
virsh suspend web-dev
virsh domstate web-dev --reason        # expect: paused (user)
/usr/local/bin/homelabarr-host-alert
virsh resume web-dev
virsh domstate web-dev --reason        # expect: running (unpaused)

# Prove it still fails loudly when the destination is broken
printf "SMTP_URL=smtp://u:p@127.0.0.1:9/\n" > /tmp/broken.env
HOMELABARR_ALERT_ENV=/tmp/broken.env HOMELABARR_ALERT_STATE=/tmp/s DISK_THRESHOLD=50 \
  /usr/local/bin/homelabarr-host-alert; echo $?   # expect 1, and /tmp/s must not exist

# Prove an unconfigured host fails every run
HOMELABARR_ALERT_ENV=/dev/null /usr/local/bin/homelabarr-host-alert; echo $?   # expect 78
```

Use a dev domain (`web-dev`, `eightly-dev`) — never `ce-prod`. `web-dev` serves
`dev.mjashley.com`; check it is back to 200 after resuming.

**"Delivered by email" in the journal is not the test.** Open the inbox and find the
message. Every silent failure this project has hit produced success-shaped output first.

## When an alert fires

### Paused domain

**Do not conclude the hardware is dead.** That misdiagnosis is why the demo stayed dark
for sixteen days.

```bash
ssh root@192.168.1.73
virsh domstate <domain> --reason     # "paused (I/O error)" means the disk filled
virsh resume <domain>
```

A resumed guest keeps a **frozen clock**, which makes TLS fail with "certificate is not
yet valid" on every registry pull. There is no QEMU guest agent installed, so
`virsh domtime --sync` errors. Fix it by hand on the guest:

```bash
sudo timedatectl set-ntp false
sudo date -u -s '<current UTC time>'
sudo timedatectl set-ntp true
```

### Disk pressure

```bash
df -h /
du -xh --max-depth=2 /var/lib/libvirt /var/lib/docker 2>/dev/null | sort -rh | head -20
```

Retiring `ce-staging` reclaimed 40G and took the host from 91% to 73% (HLCE-314). Check
for orphaned `.qcow2` images of destroyed domains before anything more drastic.

## Related

- `.github/workflows/uptime.yml` — external uptime checking (HLCE-313)
- `.github/workflows/deploy-drift.yml` — flags a demo lagging behind `main`
- HLCE-318 — this work; HLCE-310 — the environment consolidation epic
