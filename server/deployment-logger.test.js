import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// EnvironmentManager.getConfiguration() (reached lazily by DeploymentLogger)
// validates JWT_SECRET and process.exit(1)s if it's missing/short, so set a
// valid one before importing.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(40);

const { DeploymentLogger } = await import('./deployment-logger.js');

// HLCE-221: DeploymentLogger builds structured log entries and writes them to
// the console. Console output is silenced; assertions target the returned
// entry shape (AC5). State is reset between tests via the built-in test hook.
beforeEach(() => {
  DeploymentLogger._resetForTesting();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function expectEntry(entry, { component, level }) {
  expect(entry).toMatchObject({ component, level });
  expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(entry).toHaveProperty('platform');
  expect(entry).toHaveProperty('environment');
  expect(entry.processId).toBe(process.pid);
}

describe('DeploymentLogger structured entries (AC5)', () => {
  it('logStartupInfo returns a populated startup entry', () => {
    const entry = DeploymentLogger.logStartupInfo();
    expectEntry(entry, { component: 'DeploymentStartup', level: 'INFO' });
    expect(entry.startup).toMatchObject({ nodeVersion: process.version });
    expect(entry.startup.platform).toHaveProperty('arch');
    expect(entry.startup.validation).toHaveProperty('environment');
  });

  it('logNetworkActivity is INFO normally and ERROR with classification on failure', () => {
    const ok = DeploymentLogger.logNetworkActivity('connect');
    expectEntry(ok, { component: 'NetworkActivity', level: 'INFO' });
    expect(ok.network.operation).toBe('connect');

    const failed = DeploymentLogger.logNetworkActivity('connect', {
      error: { message: 'ECONNREFUSED', code: 'ECONNREFUSED', type: 'docker_error' },
    });
    expectEntry(failed, { component: 'NetworkActivity', level: 'ERROR' });
    expect(failed.network.error).toMatchObject({ code: 'ECONNREFUSED', type: 'docker_error' });
  });

  it('logDockerStateChange reflects the transition and severity', () => {
    const connected = DeploymentLogger.logDockerStateChange('disconnected', 'connected');
    expectEntry(connected, { component: 'DockerConnection', level: 'INFO' });
    expect(connected.docker.stateTransition).toMatchObject({ from: 'disconnected', to: 'connected' });

    const failed = DeploymentLogger.logDockerStateChange('connected', 'error');
    expect(failed.level).toBe('ERROR');
  });

  it('logDockerRetry and logDockerOperationFailed carry retry/error context', () => {
    const retry = DeploymentLogger.logDockerRetry(1, 3, 1000, { message: 'boom', code: 'EAGAIN' });
    expectEntry(retry, { component: 'DockerRetry', level: 'WARN' });
    expect(retry.docker.retry).toMatchObject({ attempt: 1, maxAttempts: 3, progress: '1/3' });

    const failed = DeploymentLogger.logDockerOperationFailed('containers.list', { message: 'nope' });
    expectEntry(failed, { component: 'DockerOperation', level: 'ERROR' });
    expect(Array.isArray(failed.docker.troubleshooting.possibleCauses)).toBe(true);
    expect(failed.docker.troubleshooting.suggestedActions.length).toBeGreaterThan(0);
  });

  it('logConfigurationSummary and logPerformanceMetrics return entries', () => {
    expectEntry(DeploymentLogger.logConfigurationSummary(), { component: 'Configuration', level: 'INFO' });
    expectEntry(DeploymentLogger.logPerformanceMetrics({ note: 'x' }), { component: 'Performance', level: 'DEBUG' });
  });

  it('createCorsLoggingMiddleware returns a middleware and logCorsActivity no-ops outside development', () => {
    const mw = DeploymentLogger.createCorsLoggingMiddleware();
    expect(typeof mw).toBe('function');
    let nexted = false;
    mw({ method: 'GET', url: '/', headers: {} }, {}, () => { nexted = true; });
    expect(nexted).toBe(true);

    // Outside development, CORS activity logging is suppressed (returns null).
    expect(DeploymentLogger.logCorsActivity({ method: 'GET', url: '/', headers: {} }, null)).toBeNull();
  });
});
