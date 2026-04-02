#!/usr/bin/env python3
"""Generate architecture diagrams for HomelabARR CE wiki.
v2 — wider cards, smaller fonts, more breathing room."""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import os

# ── Color Palette ──
BG = '#0d1117'
CARD_BG = '#161b22'
CARD_BORDER = '#30363d'
PRIMARY = '#00bfa5'
ACCENT = '#ffab00'
TEXT = '#e6edf3'
TEXT_DIM = '#8b949e'
FLOW = '#58a6ff'
GREEN = '#3fb950'
RED = '#f85149'
PURPLE = '#bc8cff'
ORANGE = '#f0883e'

OUT = os.path.dirname(os.path.abspath(__file__))


def box(ax, x, y, w, h, label, sub=None, color=PRIMARY, alpha=0.15,
        lw=2, fs=12, sub_fs=9, sub_gap=0.025):
    """Rounded box with centered label + optional subtitle."""
    p = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.015",
                       fc=color, alpha=alpha, ec=color, lw=lw)
    ax.add_patch(p)
    ty = y + h/2 + (sub_gap/2 if sub else 0)
    ax.text(x + w/2, ty, label, fontsize=fs, fontweight='bold',
            color=TEXT, ha='center', va='center', fontfamily='monospace')
    if sub:
        ax.text(x + w/2, ty - sub_gap, sub, fontsize=sub_fs,
                color=TEXT_DIM, ha='center', va='center', fontfamily='monospace')


def arrow(ax, s, e, color=FLOW, w=2, style='->', cs="arc3,rad=0.0"):
    ax.add_patch(FancyArrowPatch(s, e, arrowstyle=style,
                                 connectionstyle=cs, color=color,
                                 lw=w, mutation_scale=14))


def wm(ax):
    ax.text(0.99, 0.015, 'homelabarr.com  |  Imogen Labs',
            fontsize=7, color=TEXT_DIM, ha='right', fontfamily='monospace', alpha=0.4)


def new_fig(w, h):
    fig, ax = plt.subplots(figsize=(w, h))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis('off')
    return fig, ax


# ═══════════════════════════════════════════════════════════════
# 1. SYSTEM ARCHITECTURE
# ═══════════════════════════════════════════════════════════════
def gen_system():
    fig, ax = new_fig(20, 16)

    ax.text(0.5, 0.97, 'HOMELABARR CE  --  SYSTEM ARCHITECTURE',
            fontsize=20, fontweight='bold', color=PRIMARY, ha='center',
            fontfamily='monospace')
    ax.text(0.5, 0.955, 'How the pieces fit together',
            fontsize=11, color=TEXT_DIM, ha='center', fontfamily='monospace')

    # Docker Host boundary
    p = FancyBboxPatch((0.03, 0.03), 0.94, 0.90, boxstyle="round,pad=0.02",
                       fc=CARD_BG, alpha=0.5, ec=CARD_BORDER, lw=2, ls='--')
    ax.add_patch(p)
    ax.text(0.06, 0.915, 'DOCKER HOST', fontsize=11, fontweight='bold',
            color=TEXT_DIM, fontfamily='monospace')

    # ── Browser ──
    box(ax, 0.30, 0.83, 0.40, 0.06, 'BROWSER',
        'http://your-server:8084', color=FLOW, fs=14, sub_fs=10, sub_gap=0.02)

    # ── Frontend ── card: y=0.60 h=0.18
    box(ax, 0.04, 0.60, 0.26, 0.18, '', color=PRIMARY)
    ax.text(0.17, 0.76, 'FRONTEND', fontsize=14, fontweight='bold',
            color=TEXT, ha='center', fontfamily='monospace')
    ax.text(0.17, 0.73, ':8084 | nginx + React', fontsize=10,
            color=TEXT_DIM, ha='center', fontfamily='monospace')
    techs = ['React 19', 'shadcn/ui', 'Vite', 'Dark / Light']
    for i, t in enumerate(techs):
        ax.text(0.17, 0.69 - i*0.028, '> ' + t, fontsize=9,
                color=TEXT_DIM, ha='center', fontfamily='monospace')

    # ── Backend ── card: y=0.38 h=0.40
    box(ax, 0.36, 0.38, 0.30, 0.40, '', color=ACCENT)
    ax.text(0.51, 0.755, 'BACKEND', fontsize=15, fontweight='bold',
            color=TEXT, ha='center', fontfamily='monospace')
    ax.text(0.51, 0.725, ':8092 | Node.js + Express', fontsize=10,
            color=TEXT_DIM, ha='center', fontfamily='monospace')
    comps = [
        ('CLI Bridge', 'Reads app templates'),
        ('Docker SDK', 'Container mgmt'),
        ('JWT + API Keys', 'Authentication'),
        ('SSE Stream', 'Real-time deploy logs'),
    ]
    for i, (c, d) in enumerate(comps):
        yp = 0.68 - i * 0.06
        ax.text(0.51, yp, '> ' + c, fontsize=10, fontweight='bold',
                color=TEXT, ha='center', fontfamily='monospace')
        ax.text(0.51, yp - 0.022, d, fontsize=8,
                color=TEXT_DIM, ha='center', fontfamily='monospace')

    # ── Docker Socket ── card: y=0.29 h=0.06
    box(ax, 0.38, 0.29, 0.26, 0.06, 'DOCKER SOCKET',
        '/var/run/docker.sock', color=RED, alpha=0.12, fs=10, sub_fs=8, sub_gap=0.018)

    # ── App Templates ── card: y=0.29 h=0.22
    box(ax, 0.04, 0.29, 0.26, 0.22, '', color=PURPLE)
    ax.text(0.17, 0.49, 'APP TEMPLATES', fontsize=12, fontweight='bold',
            color=TEXT, ha='center', fontfamily='monospace')
    ax.text(0.17, 0.46, '100+ YAML files', fontsize=10,
            color=TEXT_DIM, ha='center', fontfamily='monospace')
    cats = ['ai/', 'media-servers/', 'downloads/', 'self-hosted/',
            'monitoring/', 'virtual-desktops/', 'backup/', 'system/']
    for i, c in enumerate(cats):
        col = i % 2; row = i // 2
        ax.text(0.07 + col * 0.14, 0.42 - row * 0.028, c, fontsize=8,
                color=PURPLE, ha='left', fontfamily='monospace', alpha=0.7)

    # ── Deployed Containers ── card: y=0.38 h=0.40
    box(ax, 0.72, 0.38, 0.24, 0.40, '', color=GREEN, alpha=0.12)
    ax.text(0.84, 0.755, 'DEPLOYED', fontsize=14, fontweight='bold',
            color=TEXT, ha='center', fontfamily='monospace')
    ax.text(0.84, 0.725, 'Your running apps', fontsize=10,
            color=TEXT_DIM, ha='center', fontfamily='monospace')
    apps = ['Plex', 'Radarr', 'Sonarr', 'Ollama', 'Nextcloud',
            'Grafana', 'qBittorrent', '...100+ more']
    for i, a in enumerate(apps):
        ax.text(0.84, 0.685 - i * 0.035, '[*] ' + a, fontsize=9,
                color=TEXT_DIM, ha='center', fontfamily='monospace')

    # ── Bottom row ── y=0.05 h=0.18 (much taller cards)

    # Data Storage
    box(ax, 0.04, 0.05, 0.26, 0.18, '', color='#8b949e', alpha=0.1)
    ax.text(0.17, 0.21, 'DATA STORAGE', fontsize=12, fontweight='bold',
            color=TEXT, ha='center', fontfamily='monospace')
    ax.text(0.17, 0.175, '/opt/appdata/', fontsize=10,
            color=TEXT, ha='center', fontfamily='monospace')
    ax.text(0.17, 0.145, 'plex/  radarr/  sonarr/', fontsize=9,
            color=TEXT_DIM, ha='center', fontfamily='monospace')
    ax.text(0.17, 0.115, 'homelabarr-data', fontsize=8,
            color=TEXT_DIM, ha='center', fontfamily='monospace')
    ax.text(0.17, 0.09, '(Docker volume)', fontsize=8,
            color=TEXT_DIM, ha='center', fontfamily='monospace')

    # CI/CD
    box(ax, 0.38, 0.05, 0.26, 0.18, '', color=ORANGE, alpha=0.12)
    ax.text(0.51, 0.21, 'CI / CD', fontsize=13, fontweight='bold',
            color=TEXT, ha='center', fontfamily='monospace')
    ax.text(0.51, 0.175, 'GitHub Actions', fontsize=10,
            color=TEXT, ha='center', fontfamily='monospace')
    ax.text(0.51, 0.145, 'GHCR image registry', fontsize=9,
            color=TEXT_DIM, ha='center', fontfamily='monospace')
    ax.text(0.51, 0.115, 'dev -> staging -> main', fontsize=9,
            color=ORANGE, ha='center', fontfamily='monospace')
    ax.text(0.51, 0.09, 'Watchtower auto-updates', fontsize=8,
            color=TEXT_DIM, ha='center', fontfamily='monospace')

    # Traefik
    box(ax, 0.72, 0.05, 0.24, 0.18, '', color=FLOW, alpha=0.1)
    ax.text(0.84, 0.21, 'TRAEFIK', fontsize=13, fontweight='bold',
            color=TEXT, ha='center', fontfamily='monospace')
    ax.text(0.84, 0.175, 'Reverse proxy', fontsize=10,
            color=TEXT_DIM, ha='center', fontfamily='monospace')
    ax.text(0.84, 0.145, 'SSL | Routing | Auth', fontsize=10,
            color=FLOW, ha='center', fontfamily='monospace')
    ax.text(0.84, 0.115, 'app.yourdomain.com', fontsize=9,
            color=TEXT_DIM, ha='center', fontfamily='monospace')
    ax.text(0.84, 0.09, '(optional)', fontsize=8,
            color=TEXT_DIM, ha='center', fontfamily='monospace')

    # ── Arrows ──
    arrow(ax, (0.40, 0.83), (0.26, 0.78), color=FLOW, w=2.5)
    ax.text(0.30, 0.81, 'HTTP', fontsize=9, color=FLOW, fontfamily='monospace',
            rotation=15)
    arrow(ax, (0.30, 0.69), (0.36, 0.66), color=PRIMARY, w=2.5)
    ax.text(0.31, 0.685, 'proxy', fontsize=8, color=PRIMARY, fontfamily='monospace')
    arrow(ax, (0.51, 0.38), (0.51, 0.35), color=RED, w=2)
    arrow(ax, (0.36, 0.52), (0.30, 0.51), color=PURPLE, w=2,
          cs="arc3,rad=0.05")
    ax.text(0.31, 0.53, 'reads', fontsize=8, color=PURPLE, fontfamily='monospace')
    arrow(ax, (0.64, 0.32), (0.72, 0.50), color=GREEN, w=2,
          cs="arc3,rad=-0.2")
    ax.text(0.70, 0.40, 'manages', fontsize=8, color=GREEN, fontfamily='monospace')
    arrow(ax, (0.72, 0.48), (0.30, 0.20), color='#8b949e', w=1.5,
          cs="arc3,rad=0.25")
    arrow(ax, (0.84, 0.38), (0.84, 0.23), color=FLOW, w=1.5)

    wm(ax)
    plt.tight_layout()
    plt.savefig(f'{OUT}/system-architecture.png', dpi=150, facecolor=BG,
                bbox_inches='tight', pad_inches=0.3)
    plt.close()
    print('[+] system-architecture.png')


# ═══════════════════════════════════════════════════════════════
# 2. DEPLOYMENT FLOW
# ═══════════════════════════════════════════════════════════════
def gen_deploy():
    fig, ax = new_fig(20, 10)

    ax.text(0.5, 0.96, 'DEPLOYMENT FLOW', fontsize=19,
            fontweight='bold', color=PRIMARY, ha='center', fontfamily='monospace')
    ax.text(0.5, 0.93, 'What happens when you click Deploy', fontsize=10,
            color=TEXT_DIM, ha='center', fontfamily='monospace')

    steps = [
        {'x': 0.02, 'n': '1', 'l': 'CLICK', 's': 'Pick an app\nChoose a mode', 'c': FLOW},
        {'x': 0.18, 'n': '2', 'l': 'LOAD', 's': 'Backend reads\nYAML template', 'c': PURPLE},
        {'x': 0.34, 'n': '3', 'l': 'TRANSFORM', 's': 'Apply mode\nInject config', 'c': ACCENT},
        {'x': 0.50, 'n': '4', 'l': 'COMPOSE', 's': 'docker compose\nup -d', 'c': GREEN},
        {'x': 0.66, 'n': '5', 'l': 'STREAM', 's': 'SSE events\nReal-time logs', 'c': ORANGE},
        {'x': 0.82, 'n': '6', 'l': 'RUNNING', 's': 'App is live\nAccess it now', 'c': PRIMARY},
    ]

    sy, sw, sh = 0.74, 0.14, 0.14

    for i, s in enumerate(steps):
        box(ax, s['x'], sy, sw, sh, s['l'], color=s['c'], fs=12, alpha=0.15, lw=2.5)
        # number badge
        circ = plt.Circle((s['x'] + sw/2, sy + sh - 0.02), 0.016,
                          fc=s['c'], alpha=0.35, ec=s['c'], lw=1.5)
        ax.add_patch(circ)
        ax.text(s['x'] + sw/2, sy + sh - 0.02, s['n'], fontsize=10,
                fontweight='bold', color=TEXT, ha='center', va='center',
                fontfamily='monospace')
        # subtitle
        ax.text(s['x'] + sw/2, sy + 0.03, s['s'], fontsize=8,
                color=TEXT_DIM, ha='center', va='center',
                fontfamily='monospace', linespacing=1.5)
        if i < len(steps) - 1:
            arrow(ax, (s['x'] + sw + 0.005, sy + sh/2),
                  (steps[i+1]['x'] - 0.005, sy + sh/2), color=s['c'], w=2.5)

    # ── Mode cards ──
    my, mh, mw = 0.06, 0.54, 0.30
    ax.text(0.05, my + mh + 0.03,
            'DEPLOYMENT MODES  --  What changes in step 3',
            fontsize=11, fontweight='bold', color=TEXT, fontfamily='monospace')

    modes = [
        {'x': 0.02, 'name': 'STANDARD', 'c': GREEN, 'desc': 'Direct port access',
         'tx': ['[-] Strip Traefik labels',
                '[-] Remove ext networks',
                '[~] Set network = bridge',
                '[+] Map host port'],
         'res': 'http://server:PORT'},
        {'x': 0.35, 'name': 'TRAEFIK', 'c': FLOW, 'desc': 'Reverse proxy + SSL',
         'tx': ['[+] Keep Traefik labels',
                '[+] Join proxy network',
                '[+] Auto SSL via LE',
                '[+] Route by hostname'],
         'res': 'https://app.domain.com'},
        {'x': 0.68, 'name': 'TRAEFIK + AUTHELIA', 'c': ACCENT,
         'desc': 'Proxy + Auth + MFA',
         'tx': ['[+] Keep Traefik labels',
                '[+] Join proxy network',
                '[+] Auto SSL via LE',
                '[+] Add auth middleware'],
         'res': 'https://app.domain.com [locked]'},
    ]

    for m in modes:
        # card bg
        p = FancyBboxPatch((m['x'], my), mw, mh, boxstyle="round,pad=0.015",
                           fc=CARD_BG, alpha=0.8, ec=m['c'], lw=2.5)
        ax.add_patch(p)
        # title
        ax.text(m['x'] + mw/2, my + mh - 0.04, m['name'], fontsize=13,
                fontweight='bold', color=m['c'], ha='center', fontfamily='monospace')
        ax.text(m['x'] + mw/2, my + mh - 0.075, m['desc'], fontsize=9,
                color=TEXT_DIM, ha='center', fontfamily='monospace')
        # transforms
        for i, t in enumerate(m['tx']):
            ax.text(m['x'] + 0.025, my + mh - 0.13 - i * 0.07, t,
                    fontsize=9, color=TEXT, fontfamily='monospace')
        # divider + result
        ax.plot([m['x'] + 0.025, m['x'] + mw - 0.025],
                [my + 0.10, my + 0.10], color=CARD_BORDER, lw=1)
        ax.text(m['x'] + mw/2, my + 0.06, m['res'], fontsize=10,
                fontweight='bold', color=m['c'], ha='center', fontfamily='monospace')
        ax.text(m['x'] + mw/2, my + 0.03, 'Result', fontsize=8,
                color=TEXT_DIM, ha='center', fontfamily='monospace')

    wm(ax)
    plt.tight_layout()
    plt.savefig(f'{OUT}/deployment-flow.png', dpi=150, facecolor=BG,
                bbox_inches='tight', pad_inches=0.3)
    plt.close()
    print('[+] deployment-flow.png')


# ═══════════════════════════════════════════════════════════════
# 3. NETWORK TOPOLOGY
# ═══════════════════════════════════════════════════════════════
def gen_network():
    fig, ax = new_fig(18, 12)

    ax.text(0.5, 0.97, 'NETWORK TOPOLOGY', fontsize=19,
            fontweight='bold', color=PRIMARY, ha='center', fontfamily='monospace')
    ax.text(0.5, 0.945, 'Three ways to access your apps', fontsize=10,
            color=TEXT_DIM, ha='center', fontfamily='monospace')

    # ── MODE 1 ──
    ax.text(0.04, 0.90, 'MODE 1  ==  STANDARD  (Local Network)',
            fontsize=12, fontweight='bold', color=GREEN, fontfamily='monospace')

    box(ax, 0.04, 0.77, 0.17, 0.09, 'YOU', 'Browser on LAN',
        color=GREEN, alpha=0.1, fs=12, sub_fs=8)
    arrow(ax, (0.21, 0.815), (0.28, 0.815), color=GREEN, w=3)
    ax.text(0.245, 0.84, 'http://192.168.x:PORT', fontsize=7,
            color=GREEN, ha='center', fontfamily='monospace')
    box(ax, 0.28, 0.77, 0.17, 0.09, 'SERVER', 'Direct port',
        color=GREEN, alpha=0.1, fs=12, sub_fs=8)
    arrow(ax, (0.45, 0.815), (0.52, 0.815), color=GREEN, w=2)

    for i, a in enumerate(['Plex :32400', 'Radarr :7878',
                           'Sonarr :8989', 'Portainer :9000']):
        box(ax, 0.52, 0.85 - i*0.04, 0.20, 0.032, a,
            color=GREEN, alpha=0.06, lw=1, fs=8)

    ax.text(0.80, 0.84, '+ Simple, zero setup', fontsize=9,
            color=GREEN, fontfamily='monospace')
    ax.text(0.80, 0.815, '+ Works immediately', fontsize=9,
            color=GREEN, fontfamily='monospace')
    ax.text(0.80, 0.79, '- LAN only, no SSL', fontsize=9,
            color=TEXT_DIM, fontfamily='monospace')

    # divider
    ax.plot([0.04, 0.96], [0.72, 0.72], color=CARD_BORDER, lw=1,
            ls=':', alpha=0.4)

    # ── MODE 2 ──
    ax.text(0.04, 0.68, 'MODE 2  ==  TRAEFIK  (Domain + SSL)',
            fontsize=12, fontweight='bold', color=FLOW, fontfamily='monospace')

    m2nodes = [
        (0.04, 'INTERNET', 'plex.your.com'),
        (0.24, 'CLOUDFLARE', 'DNS + CDN'),
        (0.44, 'TRAEFIK', 'SSL + Routing'),
        (0.64, 'CONTAINER', 'proxy network'),
    ]
    for x, l, s in m2nodes:
        box(ax, x, 0.50, 0.17, 0.12, l, s, color=FLOW, alpha=0.12, fs=11, sub_fs=8)
    for i in range(3):
        x1 = m2nodes[i][0] + 0.17
        x2 = m2nodes[i+1][0]
        arrow(ax, (x1 + 0.01, 0.56), (x2 - 0.01, 0.56), color=FLOW, w=2.5)

    # SSL badge
    p = FancyBboxPatch((0.46, 0.63), 0.13, 0.03, boxstyle="round,pad=0.005",
                       fc=GREEN, alpha=0.2, ec=GREEN, lw=1)
    ax.add_patch(p)
    ax.text(0.525, 0.645, 'AUTO SSL (free)', fontsize=8, fontweight='bold',
            color=GREEN, ha='center', fontfamily='monospace')

    ax.text(0.85, 0.59, '+ Custom domains', fontsize=9,
            color=FLOW, fontfamily='monospace')
    ax.text(0.85, 0.565, '+ Free SSL certs', fontsize=9,
            color=FLOW, fontfamily='monospace')
    ax.text(0.85, 0.54, '+ Remote access', fontsize=9,
            color=FLOW, fontfamily='monospace')
    ax.text(0.85, 0.515, '- Needs domain', fontsize=9,
            color=TEXT_DIM, fontfamily='monospace')

    # divider
    ax.plot([0.04, 0.96], [0.45, 0.45], color=CARD_BORDER, lw=1,
            ls=':', alpha=0.4)

    # ── MODE 3 ──
    ax.text(0.04, 0.41, 'MODE 3  ==  TRAEFIK + AUTHELIA  (Domain + SSL + Auth)',
            fontsize=12, fontweight='bold', color=ACCENT, fontfamily='monospace')

    m3nodes = [
        (0.04, 'INTERNET', 'radarr.your.com', ACCENT),
        (0.21, 'CLOUDFLARE', 'DNS + CDN', ACCENT),
        (0.38, 'TRAEFIK', 'SSL + Routing', ACCENT),
        (0.55, 'AUTHELIA', 'Login + MFA', RED),
        (0.72, 'CONTAINER', 'Protected', ACCENT),
    ]
    for x, l, s, c in m3nodes:
        box(ax, x, 0.22, 0.15, 0.12, l, s, color=c, alpha=0.12, fs=10, sub_fs=8)
    for i in range(4):
        x1 = m3nodes[i][0] + 0.15
        x2 = m3nodes[i+1][0]
        arrow(ax, (x1 + 0.005, 0.28), (x2 - 0.005, 0.28), color=ACCENT, w=2.5)

    # Auth badge
    p = FancyBboxPatch((0.56, 0.35), 0.13, 0.03, boxstyle="round,pad=0.005",
                       fc=RED, alpha=0.2, ec=RED, lw=1)
    ax.add_patch(p)
    ax.text(0.625, 0.365, 'SSO + 2FA', fontsize=8, fontweight='bold',
            color=RED, ha='center', fontfamily='monospace')

    ax.text(0.04, 0.16, '+ Everything in Mode 2, plus:', fontsize=9,
            color=ACCENT, fontfamily='monospace')
    ax.text(0.04, 0.13, '+ Single sign-on across all apps', fontsize=9,
            color=ACCENT, fontfamily='monospace')
    ax.text(0.04, 0.10, '+ Optional two-factor auth', fontsize=9,
            color=ACCENT, fontfamily='monospace')
    ax.text(0.04, 0.07, '+ Per-user access control', fontsize=9,
            color=ACCENT, fontfamily='monospace')

    wm(ax)
    plt.tight_layout()
    plt.savefig(f'{OUT}/network-topology.png', dpi=150, facecolor=BG,
                bbox_inches='tight', pad_inches=0.3)
    plt.close()
    print('[+] network-topology.png')


# ═══════════════════════════════════════════════════════════════
# 4. REQUEST LIFECYCLE
# ═══════════════════════════════════════════════════════════════
def gen_request():
    fig, ax = new_fig(18, 10)

    ax.text(0.5, 0.96, 'API REQUEST LIFECYCLE', fontsize=19,
            fontweight='bold', color=PRIMARY, ha='center', fontfamily='monospace')
    ax.text(0.5, 0.935, 'Every request through the stack', fontsize=10,
            color=TEXT_DIM, ha='center', fontfamily='monospace')

    # ── Read path ──
    ax.text(0.05, 0.88, 'READ PATH  (GET /applications)',
            fontsize=11, fontweight='bold', color=GREEN, fontfamily='monospace')

    rsteps = [
        ('Browser', 'GET /api/applications', FLOW, 0.77),
        ('nginx', 'Strip /api -> proxy to :8092', PRIMARY, 0.64),
        ('Express', 'Route -> auth (optional)', ACCENT, 0.51),
        ('CLI Bridge', 'Return cached catalog', PURPLE, 0.38),
        ('Response', '200 OK + JSON (100+ apps)', GREEN, 0.25),
    ]
    for i, (l, d, c, y) in enumerate(rsteps):
        box(ax, 0.04, y, 0.42, 0.10, '', color=c, alpha=0.12, lw=2)
        ax.text(0.07, y + 0.065, l, fontsize=11, fontweight='bold',
                color=TEXT, fontfamily='monospace')
        ax.text(0.07, y + 0.03, d, fontsize=8, color=TEXT_DIM,
                fontfamily='monospace')
        if i < len(rsteps) - 1:
            arrow(ax, (0.25, y), (0.25, y - 0.03), color=c, w=2)

    # ── Deploy path ──
    ax.text(0.55, 0.88, 'DEPLOY PATH  (POST /deploy)',
            fontsize=11, fontweight='bold', color=ORANGE, fontfamily='monospace')

    wsteps = [
        ('Browser', 'POST /api/deploy {appId, mode}', FLOW, 0.77),
        ('Express', 'Auth check -> validate', ACCENT, 0.64),
        ('CLI Bridge', 'Load YAML -> transform', PURPLE, 0.51),
        ('Docker SDK', 'docker compose up -d', RED, 0.38),
        ('SSE Stream', 'Real-time events -> browser', ORANGE, 0.25),
    ]
    for i, (l, d, c, y) in enumerate(wsteps):
        box(ax, 0.54, y, 0.42, 0.10, '', color=c, alpha=0.12, lw=2)
        ax.text(0.57, y + 0.065, l, fontsize=11, fontweight='bold',
                color=TEXT, fontfamily='monospace')
        ax.text(0.57, y + 0.03, d, fontsize=8, color=TEXT_DIM,
                fontfamily='monospace')
        if i < len(wsteps) - 1:
            arrow(ax, (0.75, y), (0.75, y - 0.03), color=c, w=2)

    # ── Auth methods ──
    ax.plot([0.04, 0.96], [0.20, 0.20], color=CARD_BORDER, lw=1, ls=':', alpha=0.4)
    ax.text(0.04, 0.165, 'AUTHENTICATION METHODS',
            fontsize=11, fontweight='bold', color=TEXT, fontfamily='monospace')

    auths = [
        ('JWT Token', 'POST /auth/login -> Bearer eyJ...', ACCENT, 0.04),
        ('API Key', 'Bearer hlr_a1b2c3... (permanent)', PURPLE, 0.36),
        ('No Auth', 'AUTH_ENABLED=false', TEXT_DIM, 0.68),
    ]
    for l, d, c, x in auths:
        box(ax, x, 0.04, 0.28, 0.10, '', color=c, alpha=0.1, lw=1.5)
        ax.text(x + 0.14, 0.11, l, fontsize=10, fontweight='bold',
                color=TEXT, ha='center', fontfamily='monospace')
        ax.text(x + 0.14, 0.07, d, fontsize=7, color=TEXT_DIM,
                ha='center', fontfamily='monospace')

    wm(ax)
    plt.tight_layout()
    plt.savefig(f'{OUT}/request-lifecycle.png', dpi=150, facecolor=BG,
                bbox_inches='tight', pad_inches=0.3)
    plt.close()
    print('[+] request-lifecycle.png')


if __name__ == '__main__':
    gen_system()
    gen_deploy()
    gen_network()
    gen_request()
    print('\nAll diagrams generated!')
