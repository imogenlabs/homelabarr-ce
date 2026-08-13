# Public demo reset

Keeps `demo.homelabarr.com` usable by strangers.

The demo is deliberately open. `DEFAULT_ADMIN_PASSWORD` is `admin` and the login screen
tells visitors so (`src/components/LoginModal.tsx`). That is the point — it is the front
door for the Unraid Community Apps listing (~34k pulls) and looking around should cost
nothing.

The problem is the other half. `POST /auth/change-password` (`server/routes/auth.js`) is
guarded by `requireAuth` and **nothing else**; there is no demo-mode or read-only guard
anywhere in `server/`. So any visitor can change the admin password and lock everyone
else out — permanently, because the three demo volumes survive restarts, redeploys and
Watchtower. The same applies to junk accounts and minted API keys.

Nothing reset it before HLCE-320: no cron, no user crontab, no timer.

Runs on **`ely-prod-01` (87.99.148.9)**, the VPS hosting the demo.

## What it is

| Piece | Path on the host |
|---|---|
| Script | `/usr/local/bin/homelabarr-demo-reset` |
| Config (optional webhook) | `/etc/homelabarr/demo-reset.env`, mode 600 |
| Unit | `/etc/systemd/system/homelabarr-demo-reset.service` |
| Timer | `/etc/systemd/system/homelabarr-demo-reset.timer`, at `:07` and `:37` |

Sources of truth are in this repo under `scripts/demo-reset/`.

## ⛔ Why this script is written so defensively

**The demo shares the Compose project name `compose` with `docker-compose.sites.yml`**, in
the same directory, which runs **homelabarr.com, mjashley.com, eightly, imogenlabs,
cooper-cross, agents, InvoiceNinja and Watchtower** on this same host.

`docker compose down -v` or `--remove-orphans` in that project would take the production
websites and their data down with them. **The script never uses either**, and neither
should you when working in `/opt/appdata/compose`.

There is a real architectural tension here, and it is worth stating plainly. The demo was
moved off the homelab and denied a Docker socket (`REQUIRE_DOCKER=false`) precisely so it
could not endanger anything. A reset that runs privileged Docker commands on the box
serving production sites gives some of that back. It cannot be avoided outright —
clearing a Docker volume requires Docker — so the surface is constrained instead:

- **Nothing is selected by wildcard, label, prefix scan or "all".** Every container and
  volume is named literally.
- **Interlock 1 — the compose file.** `docker compose config --services` must return
  exactly the two demo services. Point `COMPOSE_FILE` at `sites.yml` and the script
  aborts instead of recreating production.
- **Interlock 2 — the volumes.** A volume is removed only if its name is in the expected
  list *and* `docker ps -a --filter volume=…` shows no container outside the demo
  attached to it. A name can be mistyped; an attachment cannot be faked.
- **Interlock 3 — the census.** Every non-demo container running before the reset must
  still be running after it. Collateral damage fails loudly instead of exiting 0.
- The systemd unit adds `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome` and
  `PrivateTmp`, so everything the job does not need is taken away.

## What a reset does

1. Removes the **backend** container by name.
2. Removes the three volumes by name: `compose_homelabarr-demo-{config,data,activity}`.
   `config` holds `users.json` and `api-keys.json`; that is where the credentials live.
3. `docker compose create` — makes the container and the volumes **without starting
   anything**, which is the only window in which the fresh volumes can be fixed up (see
   the landmine below).
4. Hands the fresh volumes to the uid the container declares.
5. `docker compose up -d --no-deps` the backend, then waits for it to report healthy.
6. `docker compose up -d` to reconcile the rest of the stack.
7. Waits for `https://demo.homelabarr.com/api/applications` to return `totalApps: 117`.
8. Asserts the backend logged `creating default admin user`.
9. Re-runs the census.

A full reset takes about **13 seconds**, of which only a few are `/api` downtime.

## Two landmines this uncovered

Both were found by running the thing, not by reading it. Neither was visible in any
healthy-looking output.

**The demo could never be rebuilt from empty volumes.** The image ships `/app/data` and
`/app/server/config` owned by `1001`, so Docker seeds those fresh volumes with the right
ownership. It has **no `/app/server/activity-data` directory at all**, so Docker creates
that volume owned by `root` — and the backend, which runs as `1001`, dies with
`EACCES ... audit-YYYY-MM-DD.jsonl` and crash-loops. Had the VPS ever lost these volumes,
the demo would simply not have come back. The script works around it at step 4; **the
real fix belongs in `Dockerfile.backend`** and needs its own ticket.

Worse, the failure lied about itself: the uncaught-exception handler crashed on its own
audit insert (`SqliteError: NOT NULL constraint failed: audit_events.result`,
`server/index.js:278` → `server/audit.js:148`), so the logs blamed SQLite rather than the
permission error that actually killed it. Same shape as HLCE-312, still live in 2.3.0.

**`pipefail` + `grep -q` made a passing check fail.** `docker logs … | grep -q …` exits at
the first match, `docker logs` then takes `SIGPIPE` and returns 141, and `pipefail`
reports the pipeline as failed — so the seed assertion failed *because* it matched. It is
now matched with a here-string. Worth remembering anywhere `set -o pipefail` meets an
early-exiting reader (`grep -q`, `head`).

**The frontend is deliberately left running.** It is stateless, and recreating it would
take the site fully down for the ~45s the backend needs to report healthy
(`depends_on: service_healthy`) on every cycle. Only the backend is replaced, so the site
keeps serving HTML and only `/api` blinks for a few seconds.

That same `depends_on` is why step 5 passes `--no-deps`. A plain `docker compose up -d`
evaluates the running frontend's dependency against a backend that has only just started,
finds it still in `starting`, and exits non-zero with *"dependency failed to start:
container homelabarr-demo-backend is unhealthy"* — which failed the reset on its very
first run while the demo was in fact coming up perfectly well.

## How the credentials are proven without logging in

Step 5 is the interesting one. `initializeAuth()` in `server/auth.js` only logs
`No users found, creating default admin user` when the user store is **empty**, and it
then seeds from `DEFAULT_ADMIN_PASSWORD`. Seeing that line after a reset is positive
evidence that the store was wiped and the default credentials restored — no login needed.

It is **asserted, not merely noted**: a reset that clears the volumes but fails to reseed
leaves a demo nobody can sign into, which must fail loudly.

## It fails loudly on purpose

Every failure names the step: `demo reset FAILED at: <step>`. The script exits non-zero,
so the unit lands in `systemctl list-units --failed`. It never exits 0 on a broken demo.

Two layers catch failures:

- **The demo stops answering** → `.github/workflows/uptime.yml` alerts within 5 minutes,
  from GitHub's infrastructure, independent of this host.
- **The demo stays up but the reset did not work** (a refused interlock, a missing seed
  line) → the uptime check cannot see this, so set a webhook:

  ```bash
  sudo install -d -m 755 /etc/homelabarr
  printf 'WEBHOOK_URL=https://discord.com/api/webhooks/…\n' | sudo tee /etc/homelabarr/demo-reset.env
  sudo chmod 600 /etc/homelabarr/demo-reset.env
  ```

  The webhook is optional here (unlike `host-alert`, which fails without one) because the
  uptime check already covers the loud half. Delivery problems are reported, never
  swallowed, and never mask the original failure.

## Install

```bash
sudo install -m 755 scripts/demo-reset/homelabarr-demo-reset /usr/local/bin/
sudo install -m 644 scripts/demo-reset/homelabarr-demo-reset.service /etc/systemd/system/
sudo install -m 644 scripts/demo-reset/homelabarr-demo-reset.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now homelabarr-demo-reset.timer
```

`enable` is what makes it survive a reboot. `Persistent=true` means a reset missed while
the box was down runs once on boot.

## Operating it

```bash
# Reset right now (e.g. someone reports the demo is broken)
sudo systemctl start homelabarr-demo-reset.service

# Did the last one work?
systemctl status homelabarr-demo-reset.service
journalctl -u homelabarr-demo-reset.service -n 50

# When does it run next?
systemctl list-timers homelabarr-demo-reset.timer

# Anything failing on this host?
systemctl list-units --failed
```

## Rollback

```bash
sudo systemctl disable --now homelabarr-demo-reset.timer
sudo rm -f /etc/systemd/system/homelabarr-demo-reset.{service,timer} \
           /usr/local/bin/homelabarr-demo-reset
sudo systemctl daemon-reload
```

The demo keeps running — removing the timer only stops it being reset.

## The gap this used to leave, now closed

This bounds damage; on its own it does not prevent it — a visitor who changed the admin
password still broke the demo until the next reset. That hole is now closed separately by
**`DEMO_MODE`** (HLCE-321), which makes the server refuse account changes outright:
password changes, user create/delete, API key mint/revoke and MFA setup. See
`server/demo-mode.js`.

The two are complements, not alternatives. The guard stops the lockout; this reset still
clears the junk that accumulates in a public demo and puts it back to a known state. Keep
both.

Neither is closed by changing the demo credentials or putting the demo behind auth —
being open is the point.
