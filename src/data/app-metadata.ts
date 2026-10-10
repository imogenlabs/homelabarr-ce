import { Brain, LucideIcon } from 'lucide-react';
import {
  Video,
  Network,
  Tv2,
  Rss,
  Scan,
  Home,
  MessageSquarePlus,
  Key,
  Activity,
  FileText,
  RefreshCw,
  NotebookPen,
  Library,
  Files,
  Container as ContainerIcon,
  ScrollText,
  LayoutDashboard,
  MonitorSmartphone,
  Book,
  LineChart,
  Bell,
  BarChart2,
  Shield,
  Zap,
  Eye,
  Database,
  Wifi,
  Code2,
  Archive,
  Globe,
  Cloud,
  HardDrive,
  Settings,
  Download as DownloadIcon,
  Monitor,
  Gamepad2,
  Film,
  Music as MusicIcon,
  Search as SearchIcon,
  Package,
  MessageSquare,
  FolderOpen,
} from 'lucide-react';

// Maps CLI app names to specific Lucide icons
// Apps not in this map get the fallback icon for their category
export const APP_ICON_MAP: Record<string, LucideIcon> = {
  // Media Servers
  'plex': Video,
  'plex-test': Video,
  'plex-gluetun': Video,
  'jellyfin': Video,
  'emby': Video,
  'mstream': MusicIcon,

  // Media Management
  'sonarr': Tv2,
  'radarr': Film,
  'movviz': Film,
  'lidarr': MusicIcon,
  'readarr': Book,
  'bazarr': FileText,
  'prowlarr': SearchIcon,
  'tautulli': BarChart2,
  'kometa': Library,
  'traktarr': Tv2,
  'calibre-web': Book,
  'komga': Book,
  'lazylibrarian': Book,

  // Download Clients
  'qbittorrent': DownloadIcon,
  'qbittorrent-gluetun': DownloadIcon,
  'qbittorrentvpn': DownloadIcon,
  'sabnzbd': DownloadIcon,
  'nzbget': DownloadIcon,
  'deluge': DownloadIcon,
  'aria': DownloadIcon,
  'jackett': SearchIcon,
  'nzbhydra': SearchIcon,
  'flaresolverr': Shield,
  'youtubedl-material': Video,
  'tubesync': Video,
  'davos': RefreshCw,
  'filezilla': Files,

  // Request Management
  'overseerr': MessageSquarePlus,
  'petio': SearchIcon,
  'conreq': MessageSquarePlus,

  // Addons & Utilities
  'autoscan': Scan,
  'cloudcmd': Files,
  'cloudflare-ddns': Cloud,
  'dashmachine': LayoutDashboard,
  'dashy': LayoutDashboard,
  'deemix': MusicIcon,
  'diun': Bell,
  'dozzle': ScrollText,
  'fenrus': LayoutDashboard,
  'gluetun': Shield,
  'gluetun-socks5': Shield,
  'homepage': LayoutDashboard,
  'kitana': Settings,
  'krusader': Files,
  'mariadb': Database,
  'mount-enhanced': HardDrive,
  'n8n': Zap,
  'n8n-mcp': Zap,
  'nabarr': Bell,
  'netdata': Activity,
  'notifiarr': Bell,
  'olivetin': Settings,
  'portainer': ContainerIcon,
  'recyclarr': RefreshCw,
  'remmina': MonitorSmartphone,
  'speedtest': Zap,
  'sui': Home,
  'tauticord': MessageSquare,
  'vnstat': Network,
  'yacht': ContainerIcon,

  // Monitoring
  'grafana': LineChart,
  'prometheus': BarChart2,
  'uptime-kuma': Activity,
  'statping': Activity,
  'glances': Eye,

  // Backup
  'duplicati': Archive,
  'restic': Archive,
  'rsnapshot': Archive,

  // Self-hosted
  'alltube': Video,
  'bitwarden': Key,
  'bliss': MusicIcon,
  'changedetection': Eye,
  'cloudbeaver': Database,
  'cloudflared': Cloud,
  'comixed': Book,
  'crewlink': Gamepad2,
  'fail2ban': Shield,
  'ferdi': MessageSquare,
  'freshrss': Rss,
  'gotify': Bell,
  'guacamole': MonitorSmartphone,
  'homeassistant': Home,
  'iobroker': Home,
  'joplin-server': NotebookPen,
  'moviematch': Film,
  'muximux': LayoutDashboard,
  'netbox': Network,
  'nowshowing': Monitor,
  'organizr': LayoutDashboard,
  'pihole': Shield,
  'recipes': Book,
  'snapdrop': Files,
  'teamspeak': MessageSquare,
  'unbound': Network,
  'unifi-controller': Wifi,
  'webtop': Monitor,
  'wg-easy': Shield,
  'wg-manager': Shield,
  'whoogle': SearchIcon,
  'wireguard': Shield,
  'wordpress': Globe,
  // coding
  'coder': Code2,
  // encoder
  'handbrake': Film,
  'makemkv': Film,
  'striparr': Film,
  'tdarr': Film,
  'unmanic': Film,
  // kasmworkspace
  'chrome': Monitor,
  'discord': MessageSquare,
  'firefox': Monitor,
  'kasmdesktop': Monitor,
  'onlyoffice': FileText,
  'signal': MessageSquare,
  'steam': Gamepad2,
  'telegram': MessageSquare,
  'tor': Shield,
  'vlc': Video,
  // monitoring
  'grafana-loki-prometheus': BarChart2,
  // share
  'filerun': Files,
  'projectsend': Files,
  // system
  'dockupdater': RefreshCw,
  'endlessh': Shield,
  'homelabarr-uploader': Zap,
  'homelabarr-web-interface': LayoutDashboard,
  'mount': HardDrive,
  'rclone-gui': Cloud,
  'wiki': Book,
};

// Maps CLI categories to display categories
// Multiple CLI categories can map to the same display category
export interface DisplayCategory {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  cliCategories: string[]; // Which CLI categories roll up into this display category
}

export const DISPLAY_CATEGORIES: DisplayCategory[] = [
  {
    id: 'media',
    name: 'Media & Entertainment',
    description: 'Media servers, management tools, and entertainment applications',
    icon: Film,
    color: 'from-purple-500 to-pink-500',
    cliCategories: ['media-servers', 'media-management', 'transcoding'],
  },
  {
    id: 'downloads',
    name: 'Downloads & Automation',
    description: 'Download clients, indexers, and automation tools',
    icon: DownloadIcon,
    color: 'from-blue-500 to-cyan-500',
    cliCategories: ['downloads'],
  },
  {
    id: 'monitoring',
    name: 'Monitoring & Analytics',
    description: 'System monitoring, analytics, and observability tools',
    icon: LineChart,
    color: 'from-green-500 to-emerald-500',
    cliCategories: ['monitoring'],
  },
  {
    id: 'development',
    name: 'Virtual Desktops',
    description: 'Code editors, development tools, and AI utilities',
    icon: Code2,
    color: 'from-indigo-500 to-purple-500',
    cliCategories: ['virtual-desktops'],
  },
  {
    id: 'backup',
    name: 'Backup & Storage',
    description: 'Backup solutions, file management, and cloud storage',
    icon: Archive,
    color: 'from-gray-500 to-slate-500',
    cliCategories: ['backup'],
  },
  {
    id: 'system',
    name: 'System & Utilities',
    description: 'Container management, system tools, add-ons, and utilities',
    icon: Settings,
    color: 'from-yellow-500 to-orange-500',
    cliCategories: ['system'],
  },
  {
    id: 'selfhosted',
    name: 'Self-hosted',
    description: 'Self-hosted services, dashboards, and productivity tools',
    icon: Globe,
    color: 'from-teal-500 to-cyan-500',
    cliCategories: ['self-hosted'],
  },
  {
    id: 'ai',
    name: 'AI & Machine Learning',
    description: 'Local LLMs, image generation, speech-to-text, and AI infrastructure',
    icon: Brain,
    color: 'from-rose-500 to-orange-500',
    cliCategories: ['ai'],
  },
  {
    id: 'myapps',
    name: 'My Apps',
    description: 'Your custom application templates',
    icon: FolderOpen,
    color: 'from-orange-500 to-red-500',
    cliCategories: ['myapps'],
  },
];

// Lookup: CLI category → display category ID
const cliCategoryToDisplayId: Record<string, string> = {};
DISPLAY_CATEGORIES.forEach(dc => {
  dc.cliCategories.forEach(cli => {
    cliCategoryToDisplayId[cli] = dc.id;
  });
});

// Get the display category ID for a CLI category. Falls back to 'system'.
export function getDisplayCategoryId(cliCategory: string): string {
  return cliCategoryToDisplayId[cliCategory] || 'system';
}

// Get the Lucide icon for an app by name. Falls back to the category default icon.
export function getAppIcon(appName: string, cliCategory: string): LucideIcon {
  if (APP_ICON_MAP[appName]) {
    return APP_ICON_MAP[appName];
  }
  // Fallback: use the display category's icon
  const displayCatId = getDisplayCategoryId(cliCategory);
  const displayCat = DISPLAY_CATEGORIES.find(dc => dc.id === displayCatId);
  return displayCat?.icon || Package;
}

// Get a display category by its ID
export function getDisplayCategory(id: string): DisplayCategory | undefined {
  return DISPLAY_CATEGORIES.find(dc => dc.id === id);
}
