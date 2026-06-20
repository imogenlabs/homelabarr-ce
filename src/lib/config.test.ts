import { describe, it, expect } from 'vitest';
import { Package } from 'lucide-react';
import { getRequiredPorts, getDefaultPort, validatePortConflicts } from './config';
import type { AppTemplate } from '../types';

function makeTemplate(id: string): AppTemplate {
  return {
    id,
    name: id,
    description: '',
    category: 'media',
    logo: Package,
    deploymentModes: ['local'],
  };
}

describe('getRequiredPorts', () => {
  it('returns [] for an unknown app id', () => {
    expect(getRequiredPorts(makeTemplate('does-not-exist'))).toEqual([]);
  });

  it('uses friendly labels for web / websecure / admin services', () => {
    const labels = getRequiredPorts(makeTemplate('traefik'));
    // traefik has web (80), websecure (443), admin (8080)
    expect(labels).toContain('Web Interface');
    expect(labels).toContain('HTTPS');
    expect(labels).toContain('Admin Interface');
  });

  it('formats other services as UPPER (port)', () => {
    const labels = getRequiredPorts(makeTemplate('qbittorrent'));
    // qbittorrent: web 8080, tcp 6881, udp 6881
    expect(labels).toContain('Web Interface');
    expect(labels).toContain('TCP (6881)');
    expect(labels).toContain('UDP (6881)');
  });

  it('returns one label per defined service', () => {
    // plex has 6 services
    expect(getRequiredPorts(makeTemplate('plex'))).toHaveLength(6);
  });
});

describe('getDefaultPort', () => {
  it('returns the port number for a known app + service', () => {
    expect(getDefaultPort(makeTemplate('sonarr'), 'web')).toBe(8989);
    expect(getDefaultPort(makeTemplate('plex'), 'web')).toBe(32400);
  });

  it('returns undefined for an unknown app id', () => {
    expect(getDefaultPort(makeTemplate('nope'), 'web')).toBeUndefined();
  });

  it('returns undefined for an unknown service on a known app', () => {
    expect(getDefaultPort(makeTemplate('sonarr'), 'nope')).toBeUndefined();
  });
});

describe('validatePortConflicts', () => {
  it('returns no errors for unique, non-default ports', () => {
    const errors = validatePortConflicts(makeTemplate('sonarr'), {
      web: 19999,
      extra: 19998,
    });
    expect(errors).toEqual([]);
  });

  it('flags a duplicate port used by two services', () => {
    const errors = validatePortConflicts(makeTemplate('sonarr'), {
      web: 19999,
      extra: 19999,
    });
    expect(errors).toContain('Port 19999 is already in use by another service');
  });

  it('flags a port that collides with another app default port', () => {
    // 7878 is radarr's default web port; template is sonarr
    const errors = validatePortConflicts(makeTemplate('sonarr'), { web: 7878 });
    expect(errors).toContain('Port 7878 conflicts with default port of radarr');
  });

  it('does NOT flag conflict against the template app own default ports', () => {
    // 8989 is sonarr's own default; template IS sonarr, so it is skipped
    const errors = validatePortConflicts(makeTemplate('sonarr'), { web: 8989 });
    expect(errors).toEqual([]);
  });
});
