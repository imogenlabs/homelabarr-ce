import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';

// progress-stream.js creates a module-level singleton at import, whose
// constructor reaches DeploymentLogger → EnvironmentManager.getConfiguration(),
// which process.exit(1)s without a valid JWT_SECRET. Set one before importing.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'x'.repeat(40);

const { ProgressStreamManager, StreamingCLIBridge } = await import('./progress-stream.js');

// HLCE-220: SSE progress stream + StreamingCLIBridge. ProgressStreamManager
// writes SSE frames to a response object — we drive it with a fake `res`
// (EventEmitter + setHeader/write/end). StreamingCLIBridge is driven with a fake
// progressStream that records the emitted step/error/complete events.
function fakeRes() {
  const r = new EventEmitter();
  r.setHeader = vi.fn();
  r.end = vi.fn();
  r.write = vi.fn(() => true);
  return r;
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

  // PINNED BUG (regression marker, AC1): broadcastDeploymentProgress iterates the
  // LIVE subscriber array with for...of while a failing sendToClient → removeClient
  // splices that same array. Splicing mid-iteration shifts the indices, so the
  // client immediately after the failing one is SKIPPED. AC1's "removed mid-
  // broadcast without corrupting iteration" is therefore NOT met. The failing
  // client IS removed, but the next client misses the event. Flip this once the
  // broadcast iterates a copy (e.g. [...clients]).
  it('skips the client after a failing one mid-broadcast (iteration-corruption bug)', () => {
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
    // BUG: c was skipped because the splice shifted iteration past it.
    expect(c.write).not.toHaveBeenCalledWith('event: deployment-step\n');
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

  it('getActiveDeployments lists tracked deployments', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    const bridge = new StreamingCLIBridge(fakeCli(), fakeStream());
    await bridge.deployApplicationWithProgress('media-plex', {}, { type: 'standard' }, 'dep3');
    const active = bridge.getActiveDeployments();
    expect(active.some(d => d.id === 'dep3')).toBe(true);
  });
});
