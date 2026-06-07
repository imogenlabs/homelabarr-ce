# The History of HomelabARR

HomelabARR didn't appear out of nowhere. It's the product of a decade of homelab media server projects, community splits, and lessons learned. This is the real story.

## PlexGuide (2017–2018)

It started with **PlexGuide** — one of the first tools to automate deploying Plex and the *arr stack using Ansible and Docker. The original innovation was using **Amazon Cloud Drive** as unlimited backend storage. You could stream your entire media library from the cloud through Plex, with rclone handling the mount and mergerfs combining local and cloud storage into a single path.

The team included Admin9705, doob187, salty (saltydk), smashingtags (Michael Ashley), and other contributors who built and maintained the platform.

When Amazon killed their unlimited cloud storage plans, PlexGuide pivoted to Google Drive with service accounts (GDSAs) for scaling storage.

## PGBlitz (2018–2020)

PlexGuide was rebranded to **PGBlitz**. Same team, same Ansible architecture, new name. Google Drive replaced Amazon as the cloud backend. The project grew a significant community — thousands of users running media servers powered by PGBlitz's automation.

PGBlitz ultimately stalled due to a combination of **maintainer burnout** and **bottlenecked dependencies**. The project's architecture concentrated critical knowledge in a small number of contributors. When the core maintainers stepped away — as happens in many volunteer-driven open-source projects — there was no succession plan, no handoff documentation, and no path for the community to continue development independently.

By late 2020, PGBlitz was effectively unmaintained.

## The Fork Era (2020–2021)

With PGBlitz inactive, the community diverged along **shifting architectural visions** — a natural and ultimately productive evolution:

- **PTS / MHA-Team**: SamiKins, salty, and other community members forked PGBlitz as the [MHA-Team/PTS-Team](https://github.com/MHA-Team/PTS-Team). They worked to continue the Ansible-based approach, but the aging codebase made forward progress difficult.

- **Dockserver**: doob187 took a fundamentally different architectural direction with [Dockserver](https://github.com/dockserver/dockserver) — a ground-up rewrite that replaced Ansible with Docker Compose templates. It introduced Traefik v2 with Authelia for authentication and used a `local-persist` Docker volume plugin for storage management. This was the first major break from the Ansible paradigm.

- **Cloudbox / Saltbox**: A parallel lineage continued independently. [Cloudbox](https://github.com/Cloudbox/Cloudbox) was another Ansible-based media server tool (not directly from the PGBlitz tree). When Cloudbox was archived in March 2025, [Saltbox](https://github.com/saltyorg/Saltbox) — maintained by salty (saltydk), who had also contributed to the original PlexGuide — became its successor. Saltbox remains actively maintained today.

Each fork represented a legitimate technical bet: Ansible automation vs. Docker Compose simplicity vs. hybrid approaches. The divergence wasn't a failure — it was the open-source ecosystem working as designed, with different teams optimizing for different priorities.

## Sudobox — The GUI That Never Shipped (2021–2023)

While the Ansible-based projects were forking and the community was fragmenting, there was one project that promised to solve everything: **[Sudobox](https://github.com/sudobox-io)**.

Announced in January 2021 on the Plex forums, Sudobox promised what everyone had been asking for — a web GUI for managing your media server. No more Ansible playbooks, no more YAML editing, no more SSH. Just open a browser, click Deploy, and your app runs.

The community got excited. The installer repo got 23 stars from people waiting. They built a real [GitHub organization](https://github.com/sudobox-io) with a JavaScript backend, a companion service, a CLI tool, a full MkDocs documentation site, and an installer with a polished screenshot. They had demo videos on the Plex forums.

Then it stopped. The backend was last touched in March 2023. The documentation in March 2022. The installer in 2022. The website became a landing page with three words: "Working outside the box."

Sudobox was the right idea at the right time — but it never shipped. The community went back to Ansible and Docker Compose and command lines, still waiting for a GUI that would actually work.

## HomelabARR CE (2025–Present)

**Michael Ashley (smashingtags)** — who had been part of the original PlexGuide team — took Dockserver's Docker Compose foundation and built what Sudobox promised but never delivered.

HomelabARR CE is the GUI that actually shipped:

- **A web GUI** — React-based dashboard with a 157+ app catalog. No more editing YAML files or running Ansible playbooks. Browse apps, click Deploy, watch it happen.
- **A CLI menu system** — interactive terminal interface for users who prefer the command line.
- **No plugin dependencies** — removed the `local-persist` volume plugin requirement. Everything works with standard Docker out of the box.
- **Proper CI/CD** — GitHub Actions pipelines, automated Docker image builds, Dependabot updates, CodeQL security scanning.
- **Comprehensive documentation** — full wiki with migration guides for every major platform (Saltbox, Cloudbox, PGBlitz, Dockserver).
- **One-line install** — `sudo wget -qO- https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/install-remote.sh | sudo bash`

CE is free, open source, and MIT licensed. It's the community edition — designed to be the easiest way to get a media server running. Built and maintained by one person from a server rack in Georgia.

## The Thread That Connects Everything

Every project in this lineage stores app data in `/opt/appdata/`. Every one uses Docker containers. Every one manages the same apps — Plex, Sonarr, Radarr, Jellyfin, qBittorrent.

The difference is how you interact with them. PlexGuide and PGBlitz used Ansible. Dockserver used Docker Compose with no GUI. Saltbox still uses Ansible. HomelabARR CE gives you a web browser or an interactive terminal menu.

The community diverged along architectural lines. The technology evolved because of need. HomelabARR exists because the accumulated lessons from a decade of homelab infrastructure projects — what worked, what didn't, what users actually wanted — converged into a single product built by someone who was there from the beginning.

---

**Links:**

- [HomelabARR CE on GitHub](https://github.com/imogenlabs/homelabarr-ce)
- [CE Demo](https://ce-demo.homelabarr.com)
- [HomelabARR Website](https://homelabarr.com)
- [Discord](https://discord.gg/Pc7mXX786x)
- [Developer](https://mjashley.com)
- [Imogen Labs](https://imogenlabs.ai)
