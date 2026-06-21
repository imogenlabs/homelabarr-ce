import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// HLCE-229: integration tests for the highest-blast-radius operations —
// container delete (dockerode), deploy spawn(docker run), and the
// compose down -v removal path. These exercise the real route factories
// (containers.js, deploy.js, applications.js) and the REAL requireAuth
// middleware, with child_process (execSync/spawn) and the dockerManager /
// cliBridge collaborators mocked per the ticket Test Plan.
//
// The verb-allowlist + safeJoin path seal that backs `down -v` lives one
// layer down in cli-bridge.js and is pinned separately by
// server/regression/cli-bridge-seals.regression.test.js — here we assert the
// HTTP layer routes a removal to the right appId + removeVolumes flag.
//
// Env must be set before auth.js is imported (its key/DB init runs at import),
// so all imports are dynamic and live in beforeAll.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-dangerops-'));
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'x'.repeat(40);
process.env.DB_PATH = ':memory:';
process.env.CONFIG_DIR = tmp;
process.env.DATA_DIR = tmp;
process.env.AUDIT_DIR = path.join(tmp, 'audit');
process.env.SECRET_ROOT = path.join(tmp, 'no-secrets');
process.env.BCRYPT_COST = '4';
process.env.RATE_LIMIT_DISABLED = 'true';
delete process.env.SMTP_HOST;

// child_process is mocked at the module level so both containers.js (execSync)
// and deploy.js (spawn) receive the fakes. vi.mock is hoisted above imports.
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn(),
}));

let request, express, cookieParser, execSync, spawn;
let requireAuth, optionalAuth, generateToken;
let containerRoutes, deployRoutes, applicationRoutes;

beforeAll(async () => {
  request = (await import('supertest')).default;
  express = (await import('express')).default;
  cookieParser = (await import('cookie-parser')).default;
  ({ execSync, spawn } = await import('child_process'));
  const auth = await import('../auth.js');
  requireAuth = auth.requireAuth;
  optionalAuth = auth.optionalAuth;
  generateToken = auth.generateToken;
  containerRoutes = (await import('./containers.js')).default;
  deployRoutes = (await import('./deploy.js')).default;
  applicationRoutes = (await import('./applications.js')).default;
});

beforeEach(() => {
  vi.mocked(execSync).mockReset();
  vi.mocked(spawn).mockReset();
});

const silentLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

// A logged-in admin cookie produced by the REAL token signer, so the REAL
// requireAuth middleware accepts the request end-to-end.
function adminCookie() {
  const token = generateToken({ id: 'u-admin', username: 'admin', role: 'admin' });
  return `hl_session=${token}`;
}

// Build a fresh app mounting the dangerous-op route factories with injectable
// collaborators. requireAuth/optionalAuth are the real exports from auth.js.
function buildApp(overrides = {}) {
  const logActivity = overrides.logActivity || vi.fn();
  const deps = {
    dockerManager: overrides.dockerManager,
    cliBridge: 'cliBridge' in overrides ? overrides.cliBridge : undefined,
    streamingCLIBridge: overrides.streamingCLIBridge ?? null,
    requireAuth,
    optionalAuth,
    authEnabled: overrides.authEnabled ?? true,
    getRequestMeta: (req) => ({ ipAddress: req.ip || '', userAgent: req.headers['user-agent'] || '' }),
    logActivity,
    logger: silentLogger,
    sendError: (res, status, message, err) => {
      if (err) silentLogger.error(message, err);
      res.status(status).json({ error: message });
    },
    yaml: undefined,
  };
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(containerRoutes(deps));
  app.use(deployRoutes(deps));
  app.use(applicationRoutes(deps));
  return { app, deps, logActivity };
}

// A dockerManager double whose getContainer() returns spy-able container ops.
function dockerManagerStub({ status = 'available', container } = {}) {
  const c = container || {
    inspect: vi.fn().mockResolvedValue({ State: { Running: false } }),
    stop: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    start: vi.fn().mockResolvedValue(undefined),
    restart: vi.fn().mockResolvedValue(undefined),
    stats: vi.fn().mockResolvedValue({}),
    logs: vi.fn().mockResolvedValue(Buffer.from('ts-line-1\n')),
  };
  const docker = { getContainer: vi.fn().mockReturnValue(c) };
  return {
    _docker: docker,
    _container: c,
    getServiceStatus: vi.fn().mockReturnValue(
      status === 'available'
        ? { status: 'available', message: 'ok' }
        : { status: 'unavailable', message: 'Docker socket is not accessible' }
    ),
    executeWithRetry: vi.fn(async (op, _name, opts = {}) => {
      // Mirror the real contract: if the service is unavailable and the call
      // allows degraded mode, return the fallback instead of running the op.
      if (status === 'unavailable' && opts.allowDegraded) return opts.fallbackValue;
      return op(docker);
    }),
    createErrorResponse: vi.fn((operation, error) => ({
      success: false,
      operation,
      error: error?.message || String(error),
    })),
    destroy: vi.fn(),
  };
}

describe('AC1 — DELETE /containers/:id (container removal)', () => {
  it('rejects an unauthenticated request with 401 (real requireAuth) and never touches Docker', async () => {
    const dockerManager = dockerManagerStub();
    const { app } = buildApp({ dockerManager });

    const res = await request(app).delete('/containers/abc123');

    expect(res.status).toBe(401);
    expect(dockerManager.executeWithRetry).not.toHaveBeenCalled();
    expect(dockerManager._docker.getContainer).not.toHaveBeenCalled();
  });

  it('authenticated delete targets EXACTLY the requested id, removes it, and logs the activity', async () => {
    const dockerManager = dockerManagerStub();
    const { app, logActivity } = buildApp({ dockerManager });

    const res = await request(app)
      .delete('/containers/deadbeefcafe')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, containerId: 'deadbeefcafe' });
    // exact-target invariant: getContainer called with the requested id, nothing else
    expect(dockerManager._docker.getContainer).toHaveBeenCalledTimes(1);
    expect(dockerManager._docker.getContainer).toHaveBeenCalledWith('deadbeefcafe');
    expect(dockerManager._container.remove).toHaveBeenCalledTimes(1);
    // activity is logged with the right action + target
    expect(logActivity).toHaveBeenCalledTimes(1);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'container_deleted',
        targetType: 'container',
        targetId: 'deadbeefcafe',
        username: 'admin',
      })
    );
  });

  it('stops a running container before removing it', async () => {
    const container = {
      inspect: vi.fn().mockResolvedValue({ State: { Running: true } }),
      stop: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const dockerManager = dockerManagerStub({ container });
    const { app } = buildApp({ dockerManager });

    const res = await request(app)
      .delete('/containers/running-one')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    expect(container.stop).toHaveBeenCalledTimes(1);
    expect(container.remove).toHaveBeenCalledTimes(1);
  });

  it('returns 503 (not a crash) when Docker is unavailable, without attempting removal', async () => {
    const dockerManager = dockerManagerStub({ status: 'unavailable' });
    const { app, logActivity } = buildApp({ dockerManager });

    const res = await request(app)
      .delete('/containers/whatever')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(dockerManager.executeWithRetry).not.toHaveBeenCalled();
    expect(logActivity).not.toHaveBeenCalled();
  });

  it('treats a shell-injection container id as opaque data (dockerode arg), never building a shell command', async () => {
    const dockerManager = dockerManagerStub();
    const { app } = buildApp({ dockerManager });
    const evil = 'abc; rm -rf / #';

    const res = await request(app)
      .delete(`/containers/${encodeURIComponent(evil)}`)
      .set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    // The id flows to dockerode getContainer() verbatim — no shell, no execSync.
    expect(dockerManager._docker.getContainer).toHaveBeenCalledWith(evil);
    expect(execSync).not.toHaveBeenCalled();
  });
});

describe('AC1/AC3 — DELETE /applications/:appId (remove, optionally with volumes / down -v)', () => {
  it('rejects an unauthenticated request with 401 and never calls the bridge', async () => {
    const cliBridge = { removeApplication: vi.fn() };
    const { app } = buildApp({ cliBridge });

    const res = await request(app).delete('/applications/media-servers-plex?removeVolumes=true');

    expect(res.status).toBe(401);
    expect(cliBridge.removeApplication).not.toHaveBeenCalled();
  });

  it('removeVolumes=true routes to removeApplication(appId, true) — the down -v path', async () => {
    const cliBridge = { removeApplication: vi.fn().mockResolvedValue({ stdout: 'removed', exitCode: 0 }) };
    const { app } = buildApp({ cliBridge });

    const res = await request(app)
      .delete('/applications/media-servers-plex?removeVolumes=true')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    // resolved app id passed through untouched; volume-destroy flag set ONLY by the literal 'true'
    expect(cliBridge.removeApplication).toHaveBeenCalledTimes(1);
    expect(cliBridge.removeApplication).toHaveBeenCalledWith('media-servers-plex', true);
  });

  it('omitted/!= "true" removeVolumes routes to removeApplication(appId, false) — keeps volumes', async () => {
    const cliBridge = { removeApplication: vi.fn().mockResolvedValue({ exitCode: 0 }) };
    const { app } = buildApp({ cliBridge });

    await request(app).delete('/applications/utilities-it-tools').set('Cookie', adminCookie());
    expect(cliBridge.removeApplication).toHaveBeenLastCalledWith('utilities-it-tools', false);

    await request(app).delete('/applications/utilities-it-tools?removeVolumes=1').set('Cookie', adminCookie());
    expect(cliBridge.removeApplication).toHaveBeenLastCalledWith('utilities-it-tools', false);

    await request(app).delete('/applications/utilities-it-tools?removeVolumes=yes').set('Cookie', adminCookie());
    expect(cliBridge.removeApplication).toHaveBeenLastCalledWith('utilities-it-tools', false);
  });

  it('returns 503 when the CLI bridge is unavailable (no destructive call possible)', async () => {
    const { app } = buildApp({ cliBridge: null });

    const res = await request(app)
      .delete('/applications/media-servers-plex?removeVolumes=true')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/CLI Bridge not available/);
  });

  it('surfaces a bridge failure as 500 rather than crashing', async () => {
    const cliBridge = { removeApplication: vi.fn().mockRejectedValue(new Error('compose exploded')) };
    const { app } = buildApp({ cliBridge });

    const res = await request(app)
      .delete('/applications/media-servers-plex?removeVolumes=true')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(500);
    expect(cliBridge.removeApplication).toHaveBeenCalledWith('media-servers-plex', true);
  });

  it('POST /applications/:appId/stop routes to stopApplication(appId) (down, not down -v)', async () => {
    const cliBridge = { stopApplication: vi.fn().mockResolvedValue({ exitCode: 0 }) };
    const { app } = buildApp({ cliBridge });

    const res = await request(app)
      .post('/applications/media-servers-plex/stop')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    expect(cliBridge.stopApplication).toHaveBeenCalledWith('media-servers-plex');
  });
});

describe('AC2 — POST / deploy spawns docker with an argv array (no shell)', () => {
  function fakeChild() {
    return { stdout: { on: vi.fn() }, stderr: { on: vi.fn() }, on: vi.fn(), kill: vi.fn() };
  }

  it('it-tools deploy calls spawn("docker", [argv], opts) with NO shell', async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild());
    const { app } = buildApp({ cliBridge: null });

    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'it-tools', config: { port: '8080' } });

    expect(res.status).toBe(200);
    expect(spawn).toHaveBeenCalledTimes(1);
    const [cmd, args, opts] = vi.mocked(spawn).mock.calls[0];
    expect(cmd).toBe('docker');
    expect(Array.isArray(args)).toBe(true);
    expect(args[0]).toBe('run');
    expect(args).toContain('corentinth/it-tools:latest');
    // critical: no shell interpretation
    expect(opts?.shell).toBeUndefined();
  });

  it('a malicious port is passed as ONE literal argv element, never shell-evaluated', async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild());
    const { app } = buildApp({ cliBridge: null });
    const evilPort = '8080 && rm -rf / #';

    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'it-tools', config: { port: evilPort } });

    expect(res.status).toBe(200);
    const [, args] = vi.mocked(spawn).mock.calls[0];
    // the port mapping is exactly one element, containing the raw string verbatim
    expect(args).toContain(`${evilPort}:80`);
    // and the metacharacters were NOT split into separate argv tokens
    expect(args).not.toContain('rm');
    expect(args).not.toContain('&&');
  });

  it('rejects a missing appId with 400 before any spawn', async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild());
    const { app } = buildApp({ cliBridge: null });

    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ config: { port: '8080' } });

    expect(res.status).toBe(400);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('rejects a missing/invalid config with 400 before any spawn', async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild());
    const { app } = buildApp({ cliBridge: null });

    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'it-tools' });

    expect(res.status).toBe(400);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('non-it-tools deploy with a CLI bridge delegates to cliBridge.deployApplication (no raw spawn)', async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild());
    const cliBridge = { deployApplication: vi.fn().mockResolvedValue({ id: 'dep-1' }) };
    const { app } = buildApp({ cliBridge, streamingCLIBridge: null });

    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'media-servers-plex', config: { PUID: '1000' } });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, source: 'cli' });
    expect(cliBridge.deployApplication).toHaveBeenCalledWith(
      'media-servers-plex',
      { PUID: '1000' },
      expect.objectContaining({ type: 'standard' })
    );
    expect(spawn).not.toHaveBeenCalled();
  });
});

describe('AC4 — execSync stats/inspect path cannot be injected via container id', () => {
  it('GET /containers/:id/stats uses dockerode (getContainer), never execSync', async () => {
    const container = {
      stats: vi.fn().mockResolvedValue({}),
      inspect: vi.fn().mockResolvedValue({ State: { StartedAt: new Date(0).toISOString() } }),
    };
    const dockerManager = dockerManagerStub({ container });
    const { app } = buildApp({ dockerManager });
    const evil = '$(reboot)';

    const res = await request(app)
      .get(`/containers/${encodeURIComponent(evil)}/stats`)
      .set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    expect(dockerManager._docker.getContainer).toHaveBeenCalledWith(evil);
    expect(execSync).not.toHaveBeenCalled();
  });

  it('the list-stats execSync path only ever interpolates ids from `docker ps` output (regression guard)', async () => {
    // docker ps -a returns one container whose Id is a benign hex string;
    // the per-container stats/inspect commands must use THAT id, proving no
    // request-controlled value reaches the shelled-out execSync.
    const psJson = JSON.stringify({ ID: 'abc123hex', Names: 'plex', Image: 'plex:latest', State: 'running', Status: 'Up', Ports: '', CreatedAt: '', Labels: '' });
    vi.mocked(execSync).mockImplementation((command) => {
      if (command.includes('docker ps')) return psJson + '\n';
      if (command.includes('docker stats')) return 'HEADER\n0%,0B / 0B,0B / 0B,0\n';
      if (command.includes('docker inspect')) return JSON.stringify([{ Config: {}, Mounts: [], State: { StartedAt: new Date(0).toISOString() } }]);
      return '';
    });
    const dockerManager = dockerManagerStub();
    const { app } = buildApp({ dockerManager });

    const res = await request(app)
      .get('/containers?stats=true')
      .set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    const commands = vi.mocked(execSync).mock.calls.map((c) => c[0]);
    expect(commands.some((c) => c.includes('docker ps'))).toBe(true);
    // every stats/inspect command references only the ps-derived id
    const statsCmds = commands.filter((c) => c.includes('docker stats') || c.includes('docker inspect'));
    expect(statsCmds.length).toBeGreaterThan(0);
    for (const c of statsCmds) {
      expect(c).toContain('abc123hex');
    }
  });
});

// Broader handler coverage for the dangerous-op surface (AC5: 80%+ on these
// route files) — start/stop/restart/logs/list all share the same
// auth + 503 + dockerManager contract as delete.
describe('AC5 — supporting container lifecycle handlers (auth + 503 + happy path)', () => {
  it('GET /containers (no stats) parses `docker ps` output', async () => {
    const psJson = JSON.stringify({ ID: 'id1', Names: 'app1', Image: 'img:latest', State: 'running', Status: 'Up 2h', Ports: '0.0.0.0:8080->80/tcp', CreatedAt: '', Labels: 'a=b' });
    vi.mocked(execSync).mockReturnValue(psJson + '\n');
    const dockerManager = dockerManagerStub();
    const { app } = buildApp({ dockerManager });

    const res = await request(app).get('/containers').set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.containers).toHaveLength(1);
    expect(res.body.containers[0].Id).toBe('id1');
  });

  it('GET /containers returns an empty list (not a crash) when `docker ps` throws', async () => {
    vi.mocked(execSync).mockImplementation(() => { throw new Error('no docker'); });
    const dockerManager = dockerManagerStub();
    const { app } = buildApp({ dockerManager });

    const res = await request(app).get('/containers').set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    expect(res.body.containers).toEqual([]);
  });

  for (const op of ['start', 'stop', 'restart']) {
    it(`POST /containers/:id/${op} requires auth`, async () => {
      const { app } = buildApp({ dockerManager: dockerManagerStub() });
      const res = await request(app).post(`/containers/x/${op}`);
      expect(res.status).toBe(401);
    });

    it(`POST /containers/:id/${op} succeeds, targets the id, and logs activity`, async () => {
      const dockerManager = dockerManagerStub();
      const { app, logActivity } = buildApp({ dockerManager });
      const res = await request(app).post(`/containers/cid/${op}`).set('Cookie', adminCookie());
      expect(res.status).toBe(200);
      expect(dockerManager._docker.getContainer).toHaveBeenCalledWith('cid');
      expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ targetId: 'cid' }));
    });

    it(`POST /containers/:id/${op} returns 503 when Docker is unavailable`, async () => {
      const dockerManager = dockerManagerStub({ status: 'unavailable' });
      const { app } = buildApp({ dockerManager });
      const res = await request(app).post(`/containers/cid/${op}`).set('Cookie', adminCookie());
      expect(res.status).toBe(503);
    });
  }

  it('GET /containers/:id/logs returns cleaned logs', async () => {
    const dockerManager = dockerManagerStub();
    const { app } = buildApp({ dockerManager });
    const res = await request(app).get('/containers/cid/logs').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.containerId).toBe('cid');
  });

  it('GET /containers/:id/stats computes real cpu/mem/net figures (dockerode)', async () => {
    const container = {
      stats: vi.fn().mockResolvedValue({
        cpu_stats: { cpu_usage: { total_usage: 200 }, system_cpu_usage: 2000, online_cpus: 2 },
        precpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000 },
        memory_stats: { usage: 1048576, limit: 2097152, stats: { cache: 0 } },
        networks: { eth0: { rx_bytes: 10, tx_bytes: 20 } },
      }),
      inspect: vi.fn().mockResolvedValue({ State: { StartedAt: new Date(0).toISOString() } }),
    };
    const dockerManager = dockerManagerStub({ container });
    const { app } = buildApp({ dockerManager });
    const res = await request(app).get('/containers/cid/stats').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(res.body.stats.cpu).toBeGreaterThan(0);
    expect(res.body.stats.memory.percentage).toBeGreaterThan(0);
    expect(res.body.stats.network.eth0).toMatchObject({ rx_bytes: 10, tx_bytes: 20 });
  });

  it('GET /containers/:id/stats returns 503 when Docker is unavailable', async () => {
    const dockerManager = dockerManagerStub({ status: 'unavailable' });
    const { app } = buildApp({ dockerManager });
    const res = await request(app).get('/containers/cid/stats').set('Cookie', adminCookie());
    expect(res.status).toBe(503);
  });

  it('GET /containers/:id/logs returns 503 when Docker is unavailable', async () => {
    const dockerManager = dockerManagerStub({ status: 'unavailable' });
    const { app } = buildApp({ dockerManager });
    const res = await request(app).get('/containers/cid/logs').set('Cookie', adminCookie());
    expect(res.status).toBe(503);
  });

  for (const op of ['start', 'stop', 'restart']) {
    it(`POST /containers/:id/${op} surfaces a docker failure as 500 (not a crash)`, async () => {
      const dockerManager = dockerManagerStub();
      dockerManager.executeWithRetry.mockRejectedValueOnce(new Error('docker boom'));
      const { app } = buildApp({ dockerManager });
      const res = await request(app).post(`/containers/cid/${op}`).set('Cookie', adminCookie());
      expect(res.status).toBe(500);
    });
  }

  it('DELETE /containers/:id surfaces a removal failure as 500', async () => {
    const dockerManager = dockerManagerStub();
    dockerManager.executeWithRetry.mockRejectedValueOnce(new Error('remove failed'));
    const { app } = buildApp({ dockerManager });
    const res = await request(app).delete('/containers/cid').set('Cookie', adminCookie());
    expect(res.status).toBe(500);
  });

  it('GET /containers skips a malformed `docker ps` line instead of crashing', async () => {
    const good = JSON.stringify({ ID: 'okid', Names: 'a', Image: 'i', State: 's', Status: 'u', Ports: '', CreatedAt: '', Labels: '' });
    vi.mocked(execSync).mockReturnValue(good + '\nnot-json-here\n');
    const dockerManager = dockerManagerStub();
    const { app } = buildApp({ dockerManager });
    const res = await request(app).get('/containers').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(res.body.containers).toHaveLength(1);
  });

  it('GET /containers?stats=true degrades a single container gracefully when its stats exec throws', async () => {
    const ps = JSON.stringify({ ID: 'id1', Names: 'a', Image: 'i', State: 'running', Status: 'Up', Ports: '', CreatedAt: '', Labels: '' });
    vi.mocked(execSync).mockImplementation((command) => {
      if (command.includes('docker ps')) return ps + '\n';
      throw new Error('stats unavailable');
    });
    const dockerManager = dockerManagerStub();
    const { app } = buildApp({ dockerManager });
    const res = await request(app).get('/containers?stats=true').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(res.body.containers[0].error).toMatch(/Failed to fetch container statistics/);
  });
});

describe('AC2/AC5 — deploy: streaming bridge, unsupported app, fallback, and spawn callbacks', () => {
  function capturingChild() {
    const h = { stdout: {}, stderr: {}, proc: {} };
    return {
      _h: h,
      stdout: { on: (ev, cb) => { h.stdout[ev] = cb; } },
      stderr: { on: (ev, cb) => { h.stderr[ev] = cb; } },
      on: (ev, cb) => { h.proc[ev] = cb; },
      kill: vi.fn(),
    };
  }

  it('uses the streaming CLI bridge when present (returns a deploymentId, no raw spawn)', async () => {
    const streamingCLIBridge = { deployApplicationWithProgress: vi.fn().mockResolvedValue({ ok: true }) };
    const { app, logActivity } = buildApp({ cliBridge: null, streamingCLIBridge });

    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'media-servers-plex', config: { PUID: '1000' }, mode: { type: 'standard' } });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, source: 'cli-streaming' });
    expect(res.body.deploymentId).toBeTruthy();
    expect(streamingCLIBridge.deployApplicationWithProgress).toHaveBeenCalledTimes(1);
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'application_deployed', targetId: 'media-servers-plex' }));
    expect(spawn).not.toHaveBeenCalled();
  });

  it('returns 501 for an unsupported app when no bridge can handle it', async () => {
    const { app } = buildApp({ cliBridge: null, streamingCLIBridge: null });
    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'media-servers-plex', config: {} });
    expect(res.status).toBe(501);
    expect(res.body.error).toMatch(/not supported in CLI mode/);
  });

  it('falls through to 501 when the CLI bridge deploy throws', async () => {
    const cliBridge = { deployApplication: vi.fn().mockRejectedValue(new Error('cli failed')) };
    const { app } = buildApp({ cliBridge, streamingCLIBridge: null });
    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'media-servers-plex', config: {} });
    expect(res.status).toBe(501);
    expect(cliBridge.deployApplication).toHaveBeenCalled();
  });

  it('it-tools deploy wires stdout/stderr/close handlers that log without throwing', async () => {
    const child = capturingChild();
    vi.mocked(spawn).mockReturnValue(child);
    const { app } = buildApp({ cliBridge: null });

    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'it-tools', config: { port: '8080' } });

    expect(res.status).toBe(200);
    // Drive the captured async callbacks the way child_process would.
    expect(() => {
      child._h.stdout.data?.(Buffer.from('container-id-output'));
      child._h.stderr.data?.(Buffer.from('a warning'));
      child._h.proc.close?.(0);
      child._h.proc.close?.(1);
    }).not.toThrow();
  });

  it('rejects an unauthenticated deploy with 401 before any spawn', async () => {
    vi.mocked(spawn).mockReturnValue(capturingChild());
    const { app } = buildApp({ cliBridge: null });
    const res = await request(app).post('/deploy').send({ appId: 'it-tools', config: { port: '8080' } });
    expect(res.status).toBe(401);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('it-tools deploy surfaces a synchronous spawn failure as 500', async () => {
    vi.mocked(spawn).mockImplementation(() => { throw new Error('spawn ENOENT'); });
    const { app } = buildApp({ cliBridge: null });
    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'it-tools', config: { port: '8080' } });
    expect(res.status).toBe(500);
  });

  it('streaming deploy attaches a background rejection handler (no unhandled rejection)', async () => {
    const streamingCLIBridge = {
      deployApplicationWithProgress: vi.fn().mockRejectedValue(new Error('bg deploy failed')),
    };
    const { app } = buildApp({ cliBridge: null, streamingCLIBridge });
    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'media-servers-plex', config: {} });
    expect(res.status).toBe(200);
    // let the background .catch handler run so the rejection is consumed
    await new Promise((r) => setTimeout(r, 0));
  });

  it('falls back from a throwing streaming bridge to the standard CLI bridge', async () => {
    const streamingCLIBridge = {
      deployApplicationWithProgress: vi.fn(() => { throw new Error('stream init failed'); }),
    };
    const cliBridge = { deployApplication: vi.fn().mockResolvedValue({ id: 'dep-9' }) };
    const { app } = buildApp({ cliBridge, streamingCLIBridge });

    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'media-servers-plex', config: {} });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ source: 'cli' });
    expect(cliBridge.deployApplication).toHaveBeenCalled();
  });
});

describe('AC5 — applications route supporting handlers', () => {
  it('GET /applications lists apps via the CLI bridge', async () => {
    const cliBridge = { getAvailableApplications: vi.fn().mockResolvedValue({ media: [{ id: 'plex' }] }) };
    const { app } = buildApp({ cliBridge });
    const res = await request(app).get('/applications');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, source: 'cli', totalApps: 1 });
  });

  it('GET /applications/:appId/logs returns logs via the CLI bridge', async () => {
    const cliBridge = { getApplicationLogs: vi.fn().mockResolvedValue({ stdout: 'log output' }) };
    const { app } = buildApp({ cliBridge });
    const res = await request(app).get('/applications/media-servers-plex/logs').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, logs: 'log output' });
    expect(cliBridge.getApplicationLogs).toHaveBeenCalledWith('media-servers-plex', 100);
  });

  it('POST /applications/:appId/stop returns 503 without a CLI bridge', async () => {
    const { app } = buildApp({ cliBridge: null });
    const res = await request(app).post('/applications/x/stop').set('Cookie', adminCookie());
    expect(res.status).toBe(503);
  });

  it('POST /applications/:appId/stop surfaces a bridge failure as 500', async () => {
    const cliBridge = { stopApplication: vi.fn().mockRejectedValue(new Error('stop boom')) };
    const { app } = buildApp({ cliBridge });
    const res = await request(app).post('/applications/x/stop').set('Cookie', adminCookie());
    expect(res.status).toBe(500);
  });

  it('GET /applications falls back to template-dir mode when no CLI bridge', async () => {
    const { app } = buildApp({ cliBridge: null });
    const res = await request(app).get('/applications');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, source: 'templates' });
    expect(Array.isArray(res.body.applications.templates)).toBe(true);
  });

  it('GET /applications/:appId/logs returns 503 without a CLI bridge', async () => {
    const { app } = buildApp({ cliBridge: null });
    const res = await request(app).get('/applications/x/logs').set('Cookie', adminCookie());
    expect(res.status).toBe(503);
  });
});
