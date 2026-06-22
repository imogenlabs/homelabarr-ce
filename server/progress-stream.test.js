import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';

// progress-stream.js creates a module-level singleton at import, whose
// constructor reaches DeploymentLogger → EnvironmentManager.getConfiguration(),
// which process.exit(1)s without a valid JWT_SECRET. Set one before importing.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'x'.repeat(40);

const { ProgressStreamManager, StreamingCLIBridge, resolveAllowedOrigin } = await import('./progress-stream.js');
const { EnvironmentManager } = await import('./environment-manager.js');

// HLCE-220: SSE progress stream + StreamingCLIBridge. ProgressStreamManager
// writes SSE frames to a response object — we drive it with a fake `res`
// (EventEmitter + setHeader/write/end). StreamingCLIBridge is driven with a fake
// progressStream that records the emitted step/error/complete events.
function fakeRes() {
  const r = new EventEmitter();
  r.headers = {};
  r.setHeader = vi.fn((k, v) => { r.headers[k] = v; });
  r.end = vi.fn();
  r.write = vi.fn(() => true);
  return r;
}

// A minimal Express-like request with an Origin header and an authenticated user.
function fakeReq({ origin, userId } = {}) {
  return {
    headers: origin ? { origin } : {},
    user: userId ? { id: userId } : undefined,
  };
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('ProgressStreamManager SSE fan-out (AC1)', () => {
  it('sets SSE headers and sends a connected event on addClient', () => {
    const mgr = new ProgressStreamManager();
    const res = fakeRes();
    mgr.addClient('c1', res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.write).toHaveBeenCalledWith('event: connected\n');
    expect(mgr.getConnectedClientCount()).toBe(1);
  });

  it('broadcasts a deployment event to every subscribed client', () => {
    const mgr = new ProgressStreamManager();
    const a = fakeRes(); const b = fakeRes();
    mgr.addClient('a', a); mgr.addClient('b', b);
    mgr.subscribeToDeployment('a', 'dep1'); mgr.subscribeToDeployment('b', 'dep1');

    mgr.streamDeploymentStep('dep1', 'deploy', 'started', 'go');

    for (const res of [a, b]) {
      expect(res.write).toHaveBeenCalledWith('event: deployment-step\n');
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"step":"deploy"'));
    }
  });

  it('removes a client whose write throws and returns false from sendToClient', () => {
    const mgr = new ProgressStreamManager();
    const res = fakeRes();
    mgr.addClient('c1', res);
    res.write = vi.fn(() => { throw new Error('EPIPE'); });

    expect(mgr.sendToClient('c1', 'x', {})).toBe(false);
    expect(mgr.getConnectedClientCount()).toBe(0); // removed
  });

  it('subscribeToDeployment throws for an unknown client', () => {
    const mgr = new ProgressStreamManager();
    expect(() => mgr.subscribeToDeployment('ghost', 'dep1')).toThrow(/not found/);
  });

  // REGRESSION (HLCE-259, AC1): broadcastDeploymentProgress used to iterate the
  // LIVE subscriber array with for...of while a failing sendToClient → removeClient
  // spliced that same array, shifting indices so the client immediately after the
  // failing one was SKIPPED. The fix iterates a snapshot (`[...clients]`) so the
  // failing client is still removed but every healthy client is reached.
  it('still reaches the client after a failing one mid-broadcast (snapshot iteration)', () => {
    const mgr = new ProgressStreamManager();
    const a = fakeRes(); const bad = fakeRes(); const c = fakeRes();
    mgr.addClient('a', a); mgr.addClient('bad', bad); mgr.addClient('c', c);
    mgr.subscribeToDeployment('a', 'dep1');
    mgr.subscribeToDeployment('bad', 'dep1');
    mgr.subscribeToDeployment('c', 'dep1'); // order: [a, bad, c]

    // Count only broadcast writes (ignore connected/subscribed setup writes).
    a.write.mockClear(); bad.write.mockClear(); c.write.mockClear();
    bad.write = vi.fn(() => { throw new Error('EPIPE'); });

    mgr.streamDeploymentStep('dep1', 'deploy', 'started', 'go');

    expect(a.write).toHaveBeenCalledWith('event: deployment-step\n'); // a got it
    expect(mgr.getConnectedClientCount()).toBe(2);                    // bad removed
    // FIXED: c is no longer skipped — the splice no longer corrupts iteration.
    expect(c.write).toHaveBeenCalledWith('event: deployment-step\n');
  });

  // HLCE-284 (fix 3a): the credentialed SSE stream used to hardcode
  // Access-Control-Allow-Origin: '*', which is invalid with credentials and
  // leaks the stream to any origin. It now reflects ONLY an allowlisted origin
  // and never emits '*'.
  it('never sets a wildcard ACAO and reflects only an allowlisted origin', () => {
    vi.spyOn(EnvironmentManager, 'getConfiguration')
      .mockReturnValue({ corsOrigin: ['https://ce-demo.homelabarr.com'] });
    const mgr = new ProgressStreamManager();

    const ok = fakeRes();
    mgr.addClient('ok', ok, fakeReq({ origin: 'https://ce-demo.homelabarr.com' }));
    expect(ok.headers['Access-Control-Allow-Origin']).toBe('https://ce-demo.homelabarr.com');
    expect(ok.headers['Access-Control-Allow-Origin']).not.toBe('*');
    expect(ok.headers['Access-Control-Allow-Credentials']).toBe('true');

    const bad = fakeRes();
    mgr.addClient('bad', bad, fakeReq({ origin: 'https://evil.example.com' }));
    expect(bad.headers['Access-Control-Allow-Origin']).toBeUndefined();

    const same = fakeRes(); // same-origin: no Origin header → no ACAO at all
    mgr.addClient('same', same, fakeReq());
    expect(same.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('resolveAllowedOrigin gates against the configured allowlist', () => {
    vi.spyOn(EnvironmentManager, 'getConfiguration')
      .mockReturnValue({ corsOrigin: ['https://a.test', 'https://b.test'] });
    expect(resolveAllowedOrigin('https://a.test')).toBe('https://a.test');
    expect(resolveAllowedOrigin('https://c.test')).toBeNull();
    expect(resolveAllowedOrigin(undefined)).toBeNull();
  });

  // HLCE-284 (fix 3b): per-deployment authorization. A subscribe whose requesting
  // session does not own the client must be REJECTED so a client can't subscribe
  // to another session's stream.
  it('rejects a subscribe from a session that does not own the client', () => {
    const mgr = new ProgressStreamManager();
    mgr.addClient('c-alice', fakeRes(), fakeReq({ userId: 'alice' }));

    // Bob (session 'bob') tries to subscribe Alice's client → forbidden.
    expect(() => mgr.subscribeToDeployment('c-alice', 'dep1', 'bob'))
      .toThrow(/not owned/);

    // The owning session succeeds.
    expect(() => mgr.subscribeToDeployment('c-alice', 'dep1', 'alice')).not.toThrow();
    expect(mgr.getStatistics()).toMatchObject({ activeDeployments: 1 });
  });

  it('removeClient cleans up client + deployment subscriptions; getStatistics reflects state', () => {
    const mgr = new ProgressStreamManager();
    const a = fakeRes();
    mgr.addClient('a', a);
    mgr.subscribeToDeployment('a', 'dep1');
    expect(mgr.getStatistics()).toMatchObject({ connectedClients: 1, activeDeployments: 1 });

    mgr.removeClient('a');
    expect(a.end).toHaveBeenCalled();
    expect(mgr.getStatistics()).toMatchObject({ connectedClients: 0, activeDeployments: 0 });
  });
});

describe('StreamingCLIBridge.deployApplicationWithProgress (AC2)', () => {
  function fakeStream() {
    const events = [];
    return {
      events,
      streamDeploymentStep: (_id, step, status) => events.push({ kind: 'step', step, status }),
      streamCommandOutput: () => {},
      streamError: (_id, err) => events.push({ kind: 'error', message: err.message }),
      streamDeploymentComplete: (_id, success) => events.push({ kind: 'complete', success }),
    };
  }

  function fakeCli() {
    return {
      appsPath: '/apps',
      prepareEnvironmentConfig: vi.fn().mockResolvedValue(undefined),
      deployStandard: vi.fn().mockResolvedValue({ ok: true }),
      streamProgress: vi.fn(),
    };
  }

  it('emits the full step sequence and completes successfully', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    const stream = fakeStream();
    const cli = fakeCli();
    const bridge = new StreamingCLIBridge(cli, stream);

    const result = await bridge.deployApplicationWithProgress('media-plex', {}, { type: 'standard' }, 'dep1');

    expect(result).toEqual({ ok: true });
    expect(cli.deployStandard).toHaveBeenCalled();
    const steps = stream.events.filter(e => e.kind === 'step').map(e => `${e.step}:${e.status}`);
    expect(steps).toEqual([
      'validate:started', 'validate:completed',
      'environment:started', 'environment:completed',
      'deploy:started', 'deploy:completed',
      'verify:started', 'verify:completed',
    ]);
    expect(stream.events).toContainEqual({ kind: 'complete', success: true });
    expect(bridge.getDeploymentStatus('dep1')).toMatchObject({ status: 'completed' });
  });

  it('emits an error + failed completion and rethrows when the app is missing', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false); // app yml not found
    const stream = fakeStream();
    const bridge = new StreamingCLIBridge(fakeCli(), stream);

    await expect(
      bridge.deployApplicationWithProgress('media-ghost', {}, { type: 'standard' }, 'dep2'),
    ).rejects.toThrow(/not found/);

    expect(stream.events).toContainEqual(expect.objectContaining({ kind: 'error' }));
    expect(stream.events).toContainEqual({ kind: 'complete', success: false });
    expect(bridge.getDeploymentStatus('dep2')).toMatchObject({ status: 'failed' });
  });

  // HLCE-284 (fix 4): the appId path used sanitizePathComponent (strip-not-reject),
  // which silently swallowed traversal-ish components. It now routes through the
  // strict safeJoin, which REJECTS a bad component instead of stripping it.
  it('rejects a traversal-ish appId via strict safeJoin (not silently stripped)', async () => {
    const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    const cli = { ...fakeCli(), appsPath: '/apps' };
    const bridge = new StreamingCLIBridge(cli, fakeStream());

    // parseAppId('media-../../etc/passwd') → appName '../../etc/passwd', which
    // safeJoin rejects as an invalid path component.
    await expect(
      bridge.deployApplicationWithProgress('media-../../etc/passwd', {}, { type: 'standard' }, 'dep-bad'),
    ).rejects.toThrow(/Invalid path component|Path traversal/);

    // It never even got as far as the fs existence check / deploy.
    expect(cli.deployStandard).not.toHaveBeenCalled();
    existsSpy.mockRestore();
  });

  // HLCE-284 (fix 4): the 30s post-complete cleanup setTimeout is now tracked and
  // cleared on destroy() so it can't leak / fire against a torn-down manager.
  it('tracks the 30s cleanup timer and destroy() clears it', () => {
    vi.useFakeTimers();
    try {
      const mgr = new ProgressStreamManager();
      mgr.streamDeploymentComplete('dep-x', true, {});
      expect(mgr.cleanupTimers.has('dep-x')).toBe(true);

      mgr.destroy();
      expect(mgr.cleanupTimers.size).toBe(0);
      // No pending timers remain after destroy.
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('getActiveDeployments lists tracked deployments', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    const bridge = new StreamingCLIBridge(fakeCli(), fakeStream());
    await bridge.deployApplicationWithProgress('media-plex', {}, { type: 'standard' }, 'dep3');
    const active = bridge.getActiveDeployments();
    expect(active.some(d => d.id === 'dep3')).toBe(true);
  });
});
