import { describe, it, expect } from 'vitest';
import yaml from 'yaml';
import { Package } from 'lucide-react';
import { generateDockerCompose } from './deployment';
import type { AppTemplate, DeploymentMode } from '../types';

function makeTemplate(overrides: Partial<AppTemplate> = {}): AppTemplate {
  return {
    id: 'sonarr',
    name: 'Sonarr',
    description: '',
    category: 'media',
    logo: Package,
    deploymentModes: ['local', 'traefik'],
    defaultPorts: { web: 8989 },
    ...overrides,
  };
}

function mode(type: DeploymentMode['type']): DeploymentMode {
  return {
    type,
    name: type,
    description: '',
    features: [],
    icon: Package,
  };
}

describe('generateDockerCompose - local mode', () => {
  it('produces parseable yaml with correct service basics', () => {
    const out = generateDockerCompose(makeTemplate(), {}, mode('local'));
    const parsed = yaml.parse(out);
    const svc = parsed.services.sonarr;
    expect(svc.image).toBe('sonarr:latest');
    expect(svc.container_name).toBe('sonarr');
    expect(svc.restart).toBe('unless-stopped');
  });

  it('maps ports as host:container using defaults when no config override', () => {
    const out = generateDockerCompose(makeTemplate(), {}, mode('local'));
    const parsed = yaml.parse(out);
    expect(parsed.services.sonarr.ports).toContain('8989:web');
  });

  it('honors a config override for a port', () => {
    const out = generateDockerCompose(makeTemplate(), { web_port: '9999' }, mode('local'));
    const parsed = yaml.parse(out);
    expect(parsed.services.sonarr.ports).toContain('9999:web');
  });

  it('does NOT emit ports in local mode when template has no defaultPorts', () => {
    const out = generateDockerCompose(
      makeTemplate({ defaultPorts: undefined }),
      {},
      mode('local'),
    );
    const parsed = yaml.parse(out);
    expect(parsed.services.sonarr.ports).toEqual([]);
  });

  it('routes path-keyed config to volumes and others to upper-cased env', () => {
    const out = generateDockerCompose(
      makeTemplate(),
      { config_path: '/host/config', timezone: 'UTC' },
      mode('local'),
    );
    const parsed = yaml.parse(out);
    // volumes are value:key
    expect(parsed.services.sonarr.volumes).toContain('/host/config:config_path');
    // non-path keys become UPPER env keys
    expect(parsed.services.sonarr.environment.TIMEZONE).toBe('UTC');
    // path key is NOT in env
    expect(parsed.services.sonarr.environment.CONFIG_PATH).toBeUndefined();
  });

  it('has no proxy network and no traefik labels in local mode', () => {
    const out = generateDockerCompose(makeTemplate(), {}, mode('local'));
    const parsed = yaml.parse(out);
    expect(parsed.networks).toBeUndefined();
    expect(parsed.services.sonarr.labels).toBeUndefined();
  });
});

describe('generateDockerCompose - traefik mode', () => {
  it('adds the external proxy network', () => {
    const out = generateDockerCompose(makeTemplate(), { domain: 'example.com' }, mode('traefik'));
    const parsed = yaml.parse(out);
    expect(parsed.networks.proxy.external).toBe(true);
  });

  it('does not emit ports in traefik mode (ports only processed for local)', () => {
    const out = generateDockerCompose(makeTemplate(), { domain: 'example.com' }, mode('traefik'));
    const parsed = yaml.parse(out);
    expect(parsed.services.sonarr.ports).toEqual([]);
  });

  it('emits traefik labels including a Host rule and loadbalancer port', () => {
    const out = generateDockerCompose(makeTemplate(), { domain: 'example.com' }, mode('traefik'));
    const parsed = yaml.parse(out);
    const labels: string[] = parsed.services.sonarr.labels;
    expect(labels).toContain('traefik.enable=true');
    expect(labels).toContain('traefik.http.routers.sonarr.rule=Host(`sonarr.example.com`)');
    // getDefaultPort(sonarr, 'web') === 8989
    expect(labels).toContain('traefik.http.services.sonarr.loadbalancer.server.port=8989');
  });

  // KNOWN BUG (HLCE-228 / HLCE-251): deployment.ts lines ~114-115 use plain
  // double-quoted strings for the entrypoints and tls.certresolver labels, so
  // `${template.id}` is emitted LITERALLY instead of being interpolated.
  // (Lines 113 and 116 use template literals/backticks and DO interpolate.)
  // These assertions lock in the CURRENT buggy behavior — do NOT "fix" them.
  it('reproduces the literal ${template.id} bug in entrypoints/certresolver labels', () => {
    const out = generateDockerCompose(makeTemplate(), { domain: 'example.com' }, mode('traefik'));
    const parsed = yaml.parse(out);
    const labels: string[] = parsed.services.sonarr.labels;

    // BUG: not interpolated — literal ${template.id}
    expect(labels).toContain('traefik.http.routers.${template.id}.entrypoints=websecure');
    expect(labels).toContain('traefik.http.routers.${template.id}.tls.certresolver=letsencrypt');

    // And the correctly-interpolated form is therefore absent
    expect(labels).not.toContain('traefik.http.routers.sonarr.entrypoints=websecure');
  });
});
