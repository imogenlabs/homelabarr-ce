import { describe, it, expect, afterEach, vi } from 'vitest';

// HLCE-220: network configuration resolution. NetworkManager.getConfiguration()
// reaches EnvironmentManager.getConfiguration(), which process.exit(1)s without a
// valid JWT_SECRET — so set one and reset modules per case. process.exit is
// spied defensively.
const ENV_KEYS = ['NODE_ENV', 'JWT_SECRET', 'DOCKER_SOCKET', 'BIND_ADDRESS', 'FRONTEND_URL', 'DOCKER_HOST',
  'DOCKER_CONTAINER', 'EXTERNAL_HEALTH_URL', 'BACKEND_URL'];

async function loadNet(env = {}) {
  vi.resetModules();
  for (const k of ENV_KEYS) delete process.env[k];
  process.env.NODE_ENV = 'development';
  process.env.JWT_SECRET = 'x'.repeat(40);
  Object.assign(process.env, env);
  vi.spyOn(process, 'exit').mockImplementation(() => {});
  return (await import('./network-manager.js')).NetworkManager;
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const k of ENV_KEYS) delete process.env[k];
  process.env.NODE_ENV = 'test';
});

describe('socket path & bind address resolution (AC5)', () => {
  it('resolves the Docker socket path per platform', async () => {
    const NM = await loadNet();
    expect(NM.resolveDockerSocketPath('windows')).toBe('\\\\.\\pipe\\docker_engine');
    expect(NM.resolveDockerSocketPath('linux')).toBe('/var/run/docker.sock');
    expect(NM.resolveDockerSocketPath('darwin')).toBe('/var/run/docker.sock');
  });

  it('honours a DOCKER_SOCKET override', async () => {
    const NM = await loadNet({ DOCKER_SOCKET: '/custom/docker.sock' });
    expect(NM.resolveDockerSocketPath('linux')).toBe('/custom/docker.sock');
  });

  it('resolves the bind address (override vs default 0.0.0.0)', async () => {
    let NM = await loadNet({ BIND_ADDRESS: '127.0.0.1' });
    expect(NM.getBindAddress('development')).toBe('127.0.0.1');

    NM = await loadNet();
    expect(NM.getBindAddress('production')).toBe('0.0.0.0');
  });
});

describe('configuration & validation (AC5)', () => {
  it('builds a configuration with socket/bind/serviceUrls/timeouts', async () => {
    const NM = await loadNet();
    const cfg = NM.getConfiguration();
    expect(cfg).toMatchObject({
      dockerSocket: expect.any(String),
      bindAddress: expect.any(String),
    });
    expect(cfg.serviceUrls).toHaveProperty('docker');
    expect(cfg.timeouts).toHaveProperty('connection');
    expect(cfg.validation).toHaveProperty('validateServiceUrls');
  });

  it('validateNetworkConfiguration returns a structured result for a valid config', async () => {
    const NM = await loadNet();
    const result = NM.validateNetworkConfiguration();
    expect(result).toMatchObject({ isValid: expect.any(Boolean) });
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('flags an invalid service URL during validation', async () => {
    const NM = await loadNet({ FRONTEND_URL: 'not a valid url' });
    const result = NM.validateNetworkConfiguration();
    expect(result.isValid).toBe(false);
    expect(result.errors.join(' ').toLowerCase()).toMatch(/url/);
  });

  it('exposes helper getters without throwing', async () => {
    const NM = await loadNet();
    expect(typeof NM.getServiceUrl('frontend')).toBe('string');
    expect(NM.getDockerConnectionOptions()).toBeTruthy();
    const errResp = NM.createNetworkErrorResponse('connect', new Error('boom'));
    expect(errResp).toMatchObject({ error: expect.anything() });
    expect(() => NM.logNetworkInfo()).not.toThrow();
  });
});

// #621: homelabarr.yml reaches Docker over TCP through socket-proxy. There is no
// local socket file, so the validator must not report one missing.
describe('remote DOCKER_HOST (socket-proxy over TCP)', () => {
  it('skips the local socket check and accepts the tcp: protocol', async () => {
    const NM = await loadNet({ DOCKER_HOST: 'tcp://socket-proxy:2375', DOCKER_SOCKET: '/nonexistent/docker.sock' });
    const { warnings } = NM.validateNetworkConfiguration();
    expect(warnings.join('\n')).not.toMatch(/Docker socket not found/);
    expect(warnings.join('\n')).not.toMatch(/uncommon protocol: tcp:/);
    expect(NM.usesRemoteDockerHost()).toBe(true);
    expect(NM.getDockerEndpointLabel()).toBe('tcp://socket-proxy:2375');
  });

  it('still warns about a missing local socket when DOCKER_HOST is unset', async () => {
    const NM = await loadNet({ DOCKER_SOCKET: '/nonexistent/docker.sock' });
    const { warnings } = NM.validateNetworkConfiguration();
    expect(warnings.join('\n')).toMatch(/Docker socket not found at \/nonexistent\/docker.sock/);
    expect(NM.usesRemoteDockerHost()).toBe(false);
    expect(NM.getDockerEndpointLabel()).toBe('/nonexistent/docker.sock');
  });

  it('treats a unix:// DOCKER_HOST as local', async () => {
    const NM = await loadNet({ DOCKER_HOST: 'unix:///var/run/docker.sock' });
    expect(NM.usesRemoteDockerHost()).toBe(false);
  });
});

// #624: inside a container, localhost is the container itself, so the default
// external health URL must not trip the validator's own localhost warning.
describe('containerized health check URL', () => {
  it('defaults healthCheck.external to the backend service name', async () => {
    const NM = await loadNet({ DOCKER_CONTAINER: 'true' });
    const cfg = NM.getConfiguration();
    expect(cfg.serviceUrls.healthCheck.external).toBe(`http://backend:${cfg.port}/health`);
    const { warnings } = NM.validateNetworkConfiguration();
    expect(warnings.join('\n')).not.toMatch(/healthCheck\.external/);
  });

  it('honours EXTERNAL_HEALTH_URL', async () => {
    const NM = await loadNet({ DOCKER_CONTAINER: 'true', EXTERNAL_HEALTH_URL: 'https://hl.example.com/health' });
    expect(NM.getConfiguration().serviceUrls.healthCheck.external).toBe('https://hl.example.com/health');
  });
});
