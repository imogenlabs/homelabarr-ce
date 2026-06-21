import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// HLCE-219: Docker connection manager. EnvironmentManager.getConfiguration()
// runs at import and process.exit(1)s without a valid JWT_SECRET, so set one
// before importing. dockerode is mocked so `new Docker()` never touches a real
// daemon. The DockerConnectionManager constructor auto-connects (after a 2s
// setTimeout) and starts health/stats intervals — fake timers keep all of that
// inert (we never advance the 2s init), and we drive the state machine by
// calling its methods directly.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'x'.repeat(40);

// Regular function impl (not an arrow) so `new Docker()` is constructable.
vi.mock('dockerode', () => ({
  default: vi.fn(function () { this.listContainers = vi.fn().mockResolvedValue([]); }),
}));

const { DockerConnectionManager, createDockerManager } = await import('./docker-manager.js');

let managers = [];
function makeManager(opts = {}) {
  const m = new DockerConnectionManager({ circuitBreakerThreshold: 3, circuitBreakerTimeout: 60000, ...opts });
  managers.push(m);
  return m;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  for (const m of managers) { try { m.destroy(); } catch { /* already destroyed */ } }
  managers = [];
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete process.env.DOCKER_HOST;
});

describe('getPlatformSpecificDockerOptions (AC1)', () => {
  it('parses a DOCKER_HOST tcp:// URL and defaults the port to 2375', () => {
    const m = makeManager();
    process.env.DOCKER_HOST = 'tcp://socket-proxy:2375';
    expect(m.getPlatformSpecificDockerOptions()).toMatchObject({
      host: 'socket-proxy', port: 2375, protocol: 'http',
    });

    process.env.DOCKER_HOST = 'tcp://socket-proxy'; // no explicit port
    expect(m.getPlatformSpecificDockerOptions().port).toBe(2375);
  });

  it('uses a unix socket on linux/darwin and a named pipe on windows', () => {
    const m = makeManager();
    delete process.env.DOCKER_HOST;

    m.config.platform = 'linux';
    m.config.socketPath = '/var/run/docker.sock';
    expect(m.getPlatformSpecificDockerOptions()).toMatchObject({
      socketPath: '/var/run/docker.sock', protocol: 'unix',
    });

    m.config.platform = 'windows';
    m.config.socketPath = '/var/run/docker.sock'; // no 'pipe' → defaulted
    const win = m.getPlatformSpecificDockerOptions();
    expect(win.protocol).toBe('npipe');
    expect(win.socketPath).toBe('\\\\.\\pipe\\docker_engine');
  });
});

describe('circuit breaker state machine (AC2)', () => {
  it('opens after the failure threshold, blocks attempts, then HALF_OPEN after the timeout, and CLOSED on success', () => {
    const m = makeManager({ circuitBreakerThreshold: 3 });

    // Below threshold: stays CLOSED and connectable.
    m.updateCircuitBreakerOnFailure();
    m.updateCircuitBreakerOnFailure();
    expect(m.circuitBreaker.state).toBe('CLOSED');
    expect(m.canAttemptConnection()).toBe(true);

    // 3rd consecutive failure trips it OPEN.
    m.updateCircuitBreakerOnFailure();
    expect(m.circuitBreaker.state).toBe('OPEN');
    expect(m.canAttemptConnection()).toBe(false); // blocked while OPEN + before timeout

    // Once the cooldown elapses, the next check transitions OPEN → HALF_OPEN.
    m.circuitBreaker.nextAttemptTime = new Date(Date.now() - 1);
    expect(m.canAttemptConnection()).toBe(true);
    expect(m.circuitBreaker.state).toBe('HALF_OPEN');

    // A failure in HALF_OPEN immediately re-opens.
    m.updateCircuitBreakerOnFailure();
    expect(m.circuitBreaker.state).toBe('OPEN');

    // A success resets everything to CLOSED.
    m.updateCircuitBreakerOnSuccess();
    expect(m.circuitBreaker.state).toBe('CLOSED');
    expect(m.circuitBreaker.consecutiveFailures).toBe(0);
    expect(m.getCircuitBreakerStatus()).toMatchObject({ state: 'CLOSED', canAttempt: true });
  });
});

describe('getServiceStatus & executeWithRetry (AC3)', () => {
  it('reports available / degraded / unavailable / unknown from connection state', () => {
    const m = makeManager();

    m.state.isConnected = true;
    expect(m.getServiceStatus().status).toBe('available');

    m.state.isConnected = false;
    m.state.isRetrying = true;
    m.state.lastError = { recoverable: true };
    expect(m.getServiceStatus().status).toBe('degraded');

    m.state.isRetrying = false;
    m.state.lastError = { recoverable: false, userMessage: 'dead' };
    expect(m.getServiceStatus().status).toBe('unavailable');

    m.state.lastError = null;
    expect(m.getServiceStatus().status).toBe('unknown');
  });

  it('runs the operation when connected and returns its result', async () => {
    const m = makeManager();
    m.state.isConnected = true;
    m.docker = { id: 'fake' };
    const op = vi.fn().mockResolvedValue(['container']);
    await expect(m.executeWithRetry(op, 'list')).resolves.toEqual(['container']);
    expect(op).toHaveBeenCalledWith(m.docker);
  });

  it('returns the fallback when disconnected and allowDegraded is set', async () => {
    const m = makeManager();
    m.state.isConnected = false;
    const op = vi.fn();
    await expect(m.executeWithRetry(op, 'list', { allowDegraded: true, fallbackValue: [] })).resolves.toEqual([]);
    expect(op).not.toHaveBeenCalled(); // skipped entirely
  });

  it('throws when disconnected and degradation is not allowed', async () => {
    const m = makeManager();
    m.state.isConnected = false;
    m.state.lastError = { recoverable: false, userMessage: 'no docker' };
    await expect(m.executeWithRetry(vi.fn(), 'list')).rejects.toThrow(/list failed/);
  });
});

describe('createDockerManager — getServiceStatus lie (AC4)', () => {
  // PINNED REGRESSION (AC4): the production CLI manager hardcodes a healthy
  // status. getServiceStatus() always returns 'available' and getConnectionState()
  // always returns isConnected:true, even though no connection test is ever run —
  // so a dead Docker socket is reported as healthy. This documents the current
  // (mis)behaviour; the fix should make these reflect a real probe.
  it('always reports available / connected regardless of real socket health', () => {
    const m = createDockerManager();
    expect(m.getServiceStatus()).toMatchObject({ status: 'available' });
    expect(m.getConnectionState()).toMatchObject({ isConnected: true });
    expect(typeof m.executeWithRetry).toBe('function');
    m.destroy();
  });

  it('executeWithRetry passes the docker client straight through (no retry/guard)', async () => {
    const m = createDockerManager();
    const op = vi.fn().mockResolvedValue('ok');
    await expect(m.executeWithRetry(op, 'ping')).resolves.toBe('ok');
    expect(op).toHaveBeenCalledWith(m.docker);
    m.destroy();
  });
});

describe('connect() (AC3)', () => {
  it('connects successfully via the mocked dockerode and resets the circuit breaker', async () => {
    const m = makeManager();
    m.circuitBreaker.consecutiveFailures = 2; // pretend prior failures
    const ok = await m.connect();
    expect(ok).toBe(true);
    expect(m.state.isConnected).toBe(true);
    expect(m.circuitBreaker.state).toBe('CLOSED');
    expect(m.circuitBreaker.consecutiveFailures).toBe(0);
    expect(m.isDockerAvailable()).toBe(true);
    expect(m.getDocker()).toBe(m.docker);
  });

  it('is blocked by an OPEN circuit breaker and returns false', async () => {
    const m = makeManager();
    m.circuitBreaker.state = 'OPEN';
    m.circuitBreaker.nextAttemptTime = new Date(Date.now() + 60000);
    expect(await m.connect()).toBe(false);
  });
});

describe('inspection helpers (AC1/AC5 coverage)', () => {
  it('getDocker throws when not connected', () => {
    const m = makeManager();
    m.state.isConnected = false;
    m.docker = null;
    expect(() => m.getDocker()).toThrow(/not available/);
  });

  it('getConnectionState and getConnectionStats expose config + circuit-breaker info', () => {
    const m = makeManager();
    const state = m.getConnectionState();
    expect(state).toHaveProperty('isConnected');
    expect(state.config).toMatchObject({ circuitBreakerThreshold: 3 });
    expect(state.circuitBreaker).toHaveProperty('state');

    const stats = m.getConnectionStats();
    expect(stats).toMatchObject({ currentState: expect.any(String) });
    expect(stats.platform).toHaveProperty('socketType');
    expect(() => m.logConnectionStats()).not.toThrow();
  });

  it('platform detail helpers reflect linux vs windows', () => {
    const m = makeManager();
    m.config.platform = 'linux';
    m.config.socketPath = '/var/run/docker.sock';
    expect(m.getDockerSocketType()).toBe('unix_socket');
    expect(m.getPlatformDetails().dockerSocketType).toBe('unix_socket');
    expect(m.getPlatformConnectionInfo().unixSocketInfo.isDefaultSocket).toBe(true);

    m.config.platform = 'windows';
    m.config.socketPath = '\\\\.\\pipe\\docker_engine';
    expect(m.getDockerSocketType()).toBe('named_pipe');
    expect(m.getPlatformDetails().dockerSocketType).toBe('named_pipe');
    expect(m.getPlatformConnectionInfo().namedPipeInfo.pipeFormat).toBe('correct');
  });

  it('calculateRetryDelay grows with retryCount but is capped at maxRetryDelay', () => {
    const m = makeManager({ retryDelay: 1000, maxRetryDelay: 5000 });
    m.state.retryCount = 0;
    const d0 = m.calculateRetryDelay();
    m.state.retryCount = 10; // would explode without the cap
    const d10 = m.calculateRetryDelay();
    expect(d0).toBeGreaterThanOrEqual(1000);
    expect(d10).toBeLessThanOrEqual(5000);
  });

  it('createErrorResponse builds a structured, classified error payload', () => {
    const m = makeManager();
    const err = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    const resp = m.createErrorResponse('listContainers', err);
    expect(resp).toMatchObject({ error: 'listContainers failed' });
    expect(resp.details).toHaveProperty('type');
    expect(resp.troubleshooting).toHaveProperty('possibleCauses');
  });
});

describe('destroy clears timers (AC5)', () => {
  it('clears the health-check and stats-log intervals', () => {
    const m = makeManager();
    expect(m.healthCheckTimer).not.toBeNull();
    expect(m.statsLogTimer).not.toBeNull();

    m.destroy();
    expect(m.healthCheckTimer).toBeNull();
    expect(m.statsLogTimer).toBeNull();
    expect(m.state.isConnected).toBe(false);
  });
});
