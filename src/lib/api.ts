import { DeploymentMode } from '../types';

// In production, use relative URL so requests go through nginx proxy (/api/ → backend)
// In development (npm run dev), Vite proxy handles the forwarding
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:8092' : '/api';

function getCsrfToken(): string {
  return document.cookie.match(/(?:^|; )hl_csrf=([^;]+)/)?.[1] || '';
}

function requestId(): string {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function apiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'X-Requested-With': 'XMLHttpRequest',
    ...(!extra['X-Request-Id'] ? { 'X-Request-Id': requestId() } : {}),
    ...extra,
  };
}

function mutationHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    ...apiHeaders(extra),
    'X-CSRF-Token': getCsrfToken(),
  };
}

let refreshInFlight: Promise<Response> | null = null;

export async function apiFetchRaw(path: string, init: RequestInit = {}): Promise<Response> {
  return doFetch(path, init);
}

async function doFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes((init.method || 'GET').toUpperCase());
  const headers = isMutation
    ? mutationHeaders(init.headers as Record<string, string> || {})
    : apiHeaders(init.headers as Record<string, string> || {});
  return fetch(`${API_BASE_URL}${path}`, { ...init, credentials: 'same-origin', headers });
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let res = await doFetch(path, init);
  if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
    if (!refreshInFlight) {
      refreshInFlight = doFetch('/auth/refresh', { method: 'POST' });
    }
    try {
      const refreshRes = await refreshInFlight;
      if (refreshRes.ok) {
        res = await doFetch(path, init);
      } else {
        window.dispatchEvent(new CustomEvent('hl-session-dead'));
      }
    } finally {
      refreshInFlight = null;
    }
  }
  return res;
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
    throw new Error(error.details || error.error || 'Request failed');
  }
  return response.json();
}

// Seed data shown when backend has no Docker socket (dev/staging/demo)
const DEMO_CONTAINERS = [
  {
    Id: 'demo-plex-001',
    Names: ['/plex'],
    State: 'running',
    Created: Math.floor(Date.now() / 1000) - 86400 * 3,
    Ports: '0.0.0.0:32400->32400/tcp',
    stats: { cpu: '2.4%', memory: '1.2 GiB / 16 GiB', network: '↑ 45 MB ↓ 1.8 GB' }
  },
  {
    Id: 'demo-sonarr-002',
    Names: ['/sonarr'],
    State: 'running',
    Created: Math.floor(Date.now() / 1000) - 86400 * 5,
    Ports: '0.0.0.0:8989->8989/tcp',
    stats: { cpu: '0.8%', memory: '380 MiB / 16 GiB', network: '↑ 12 MB ↓ 890 MB' }
  },
  {
    Id: 'demo-radarr-003',
    Names: ['/radarr'],
    State: 'running',
    Created: Math.floor(Date.now() / 1000) - 86400 * 5,
    Ports: '0.0.0.0:7878->7878/tcp',
    stats: { cpu: '0.5%', memory: '290 MiB / 16 GiB', network: '↑ 8 MB ↓ 620 MB' }
  },
  {
    Id: 'demo-prowlarr-004',
    Names: ['/prowlarr'],
    State: 'running',
    Created: Math.floor(Date.now() / 1000) - 86400 * 7,
    Ports: '0.0.0.0:9696->9696/tcp',
    stats: { cpu: '0.2%', memory: '180 MiB / 16 GiB', network: '↑ 5 MB ↓ 340 MB' }
  },
  {
    Id: 'demo-overseerr-005',
    Names: ['/overseerr'],
    State: 'running',
    Created: Math.floor(Date.now() / 1000) - 86400 * 2,
    Ports: '0.0.0.0:5055->5055/tcp',
    stats: { cpu: '0.3%', memory: '210 MiB / 16 GiB', network: '↑ 3 MB ↓ 150 MB' }
  },
  {
    Id: 'demo-tautulli-006',
    Names: ['/tautulli'],
    State: 'running',
    Created: Math.floor(Date.now() / 1000) - 86400 * 10,
    Ports: '0.0.0.0:8181->8181/tcp',
    stats: { cpu: '0.1%', memory: '120 MiB / 16 GiB', network: '↑ 2 MB ↓ 95 MB' }
  },
  {
    Id: 'demo-sabnzbd-007',
    Names: ['/sabnzbd'],
    State: 'stopped',
    Created: Math.floor(Date.now() / 1000) - 86400 * 12,
    Ports: '',
    stats: null
  },
  {
    Id: 'demo-portainer-008',
    Names: ['/portainer'],
    State: 'running',
    Created: Math.floor(Date.now() / 1000) - 86400 * 14,
    Ports: '0.0.0.0:9443->9443/tcp',
    stats: { cpu: '0.4%', memory: '95 MiB / 16 GiB', network: '↑ 1 MB ↓ 45 MB' }
  },
];

export async function getContainers(includeStats = false) {
  const path = includeStats ? '/containers?stats=true' : '/containers';
  try {
    const response = await apiFetch(path);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if ((!data.containers || data.containers.length === 0) && isDemoEnvironment()) {
      return { ...data, containers: DEMO_CONTAINERS };
    }
    return data;
  } catch {
    if (isDemoEnvironment()) {
      return { containers: DEMO_CONTAINERS };
    }
    return { containers: [] };
  }
}

function isDemoEnvironment(): boolean {
  const host = window.location.hostname;
  return host.includes('dev.') || host.includes('ce-dev.') ||
         host.includes('staging.') || host.includes('ce-staging.') ||
         host === 'localhost' || host === '127.0.0.1';
}

export async function getContainerStats(containerId: string) {
  const response = await apiFetch(`/containers/${containerId}/stats`);
  return handleResponse(response);
}

export async function getContainerLogs(containerId: string, tail: number = 100) {
  const response = await apiFetch(`/containers/${containerId}/logs?tail=${tail}`);
  const data = await handleResponse(response);

  // Parse the logs string into the expected format
  if (data.logs) {
    const logLines = data.logs.split('\n').filter((line: string) => line.trim());
    return logLines.map((line: string) => {
      // Try to extract timestamp if present
      const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.*)$/);
      if (timestampMatch) {
        return {
          timestamp: new Date(timestampMatch[1]).toLocaleString(),
          message: timestampMatch[2]
        };
      }

      // If no timestamp, use current time
      return {
        timestamp: new Date().toLocaleString(),
        message: line
      };
    });
  }

  return [];
}

export async function startContainer(containerId: string) {
  const response = await apiFetch(`/containers/${containerId}/start`, { method: 'POST' });
  return handleResponse(response);
}

export async function stopContainer(containerId: string) {
  const response = await apiFetch(`/containers/${containerId}/stop`, { method: 'POST' });
  return handleResponse(response);
}

export async function restartContainer(containerId: string) {
  const response = await apiFetch(`/containers/${containerId}/restart`, { method: 'POST' });
  return handleResponse(response);
}

export async function deployApp(
  appId: string,
  config: Record<string, string>,
  mode: DeploymentMode
) {
  const response = await apiFetch('/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, config, mode }),
  });
  return handleResponse(response);
}

// CLI Integration API Functions

export async function getApplicationCatalog() {
  const response = await apiFetch('/applications');
  return handleResponse(response);
}

export async function getDeploymentModes() {
  const response = await apiFetch('/deployment-modes');
  return handleResponse(response);
}

export async function stopApplication(appId: string) {
  const response = await apiFetch(`/applications/${appId}/stop`, { method: 'POST' });
  return handleResponse(response);
}

export async function removeApplication(appId: string, removeVolumes: boolean = false) {
  const response = await apiFetch(`/applications/${appId}?removeVolumes=${removeVolumes}`, { method: 'DELETE' });
  return handleResponse(response);
}

export async function getApplicationLogs(appId: string, lines: number = 100) {
  const response = await apiFetch(`/applications/${appId}/logs?lines=${lines}`);
  return handleResponse(response);
}

export async function removeContainer(containerId: string) {
  const response = await apiFetch(`/containers/${containerId}`, { method: 'DELETE' });
  return handleResponse(response);
}

export async function checkUsedPorts() {
  const response = await apiFetch('/ports/check');
  return handleResponse(response);
}

export async function findAvailablePort(startPort: number = 8000, endPort: number = 9000) {
  const response = await apiFetch(`/ports/available?start=${startPort}&end=${endPort}`);
  return handleResponse(response);
}

// Starred Apps API functions
export async function getStars(): Promise<{ stars: string[] }> {
  const response = await apiFetch('/auth/me/stars');
  return handleResponse(response);
}

export async function starApp(appId: string): Promise<{ stars: string[] }> {
  const response = await apiFetch(`/auth/me/stars/${encodeURIComponent(appId)}`, { method: 'POST' });
  return handleResponse(response);
}

export async function unstarApp(appId: string): Promise<{ stars: string[] }> {
  const response = await apiFetch(`/auth/me/stars/${encodeURIComponent(appId)}`, { method: 'DELETE' });
  return handleResponse(response);
}

// Enhanced Mount Container API functions
export async function getEnhancedMountStatus(containerId: string) {
  const response = await apiFetch(`/enhanced-mount/${containerId}/status`);
  return handleResponse(response);
}

export async function getEnhancedMountProviders(containerId: string) {
  const response = await apiFetch(`/enhanced-mount/${containerId}/providers`);
  return handleResponse(response);
}

export async function getEnhancedMountCosts(containerId: string) {
  const response = await apiFetch(`/enhanced-mount/${containerId}/costs`);
  return handleResponse(response);
}

export async function getEnhancedMountPerformance(containerId: string) {
  const response = await apiFetch(`/enhanced-mount/${containerId}/performance`);
  return handleResponse(response);
}

export async function enableEnhancedMountProvider(
  containerId: string,
  provider: string,
  config: Record<string, unknown>
) {
  const response = await apiFetch(`/enhanced-mount/${containerId}/providers/${provider}/enable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return handleResponse(response);
}

export async function disableEnhancedMountProvider(containerId: string, provider: string) {
  const response = await apiFetch(`/enhanced-mount/${containerId}/providers/${provider}/disable`, {
    method: 'POST',
  });
  return handleResponse(response);
}
