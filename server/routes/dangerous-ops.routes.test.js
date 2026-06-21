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

// child_process is mocked at the module level so containers.js (execSync for
// `docker ps`, async `exec` for the per-container stats/inspect sweep — HLCE-275)
// and deploy.js (spawn) all receive the fakes. vi.mock is hoisted above imports.
// `exec` is promisified in containers.js at module load, so the mock must invoke
// its callback: `(cmd, opts, cb) => cb(null, { stdout, stderr })`.
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  exec: vi.fn(),
  spawn: vi.fn(),
}));

let request, express, cookieParser, execSync, exec, spawn;
let requireAuth, optionalAuth, generateToken;
let containerRoutes, deployRoutes, applicationRoutes;

beforeAll(async () => {
  request = (await import('supertest')).default;
  express = (await import('express')).default;
  cookieParser = (await import('cookie-parser')).default;
  ({ execSync, exec, spawn } = await import('child_process'));
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
  vi.mocked(exec).mockReset();
  vi.mocked(spawn).mockReset();
  // Reset the shared logger spies so per-test assertions on logger.info/warn/error
  // (HLCE-277 mutation-hardening) don't pick up calls from an earlier test.
  silentLogger.info.mockClear();
  silentLogger.warn.mockClear();
  silentLogger.error.mockClear();
  silentLogger.debug.mockClear();
});

// promisify(exec) in containers.js resolves `{ stdout, stderr }`; this drives the
// mock's callback so the per-container stats/inspect sweep behaves like the real
// async exec. Pass a map from a command substring to its stdout (or an Error).
function mockExecAsync(router) {
  vi.mocked(exec).mockImplementation((command, _opts, cb) => {
    const callback = typeof _opts === 'function' ? _opts : cb;
    try {
      const out = router(command);
      if (out instanceof Error) callback(out);
      else callback(null, { stdout: out, stderr: '' });
    } catch (err) {
      callback(err);
    }
  });
}

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
    logger: overrides.logger || silentLogger,
    sendError: overrides.sendError || ((res, status, message, err) => {
      if (err) silentLogger.error(message, err);
      res.status(status).json({ error: message });
    }),
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
    expect(res.body).toMatchObject({ success: true, message: 'Container removed successfully', containerId: 'deadbeefcafe' });
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
        targetName: 'deadbeefcafe',
        userId: 'u-admin',
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
    expect(res.body).toMatchObject({ success: true, source: 'cli', message: 'Application media-servers-plex removed successfully' });
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
    expect(res.body).toMatchObject({
      error: 'CLI Bridge not available',
      details: 'Cannot manage applications without CLI integration',
    });
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
    expect(res.body).toMatchObject({ success: true, source: 'cli', message: 'Application media-servers-plex stopped successfully' });
    expect(cliBridge.stopApplication).toHaveBeenCalledWith('media-servers-plex');
  });
});

describe('AC2 — POST / deploy spawns docker with an argv array (no shell)', () => {
  function fakeChild() {
    return { stdout: { on: vi.fn() }, stderr: { on: vi.fn() }, on: vi.fn(), kill: vi.fn() };
  }

  it('it-tools deploy calls spawn("docker", [argv], opts) with NO shell', async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild());
    const { app, logActivity } = buildApp({ cliBridge: null });

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
    // Mutation-hardening (HLCE-277): pin the full argv so the run/-d/--name/--restart/
    // unless-stopped/-p/image string literals are all asserted (not just `run`).
    expect(args[0]).toBe('run');
    expect(args).toContain('-d');
    expect(args).toContain('--name');
    expect(args).toContain('--restart');
    expect(args).toContain('unless-stopped');
    expect(args).toContain('-p');
    expect(args).toContain('8080:80');
    expect(args).toContain('corentinth/it-tools:latest');
    // the generated container name carries the appId prefix
    const nameArg = args[args.indexOf('--name') + 1];
    expect(nameArg).toMatch(/^homelabarr-it-tools-\d+$/);
    // critical: no shell interpretation
    expect(opts?.shell).toBeUndefined();
    expect(opts).toMatchObject({ stdio: ['pipe', 'pipe', 'pipe'] });
    // and the success body reflects the docker-cli path verbatim
    expect(res.body).toMatchObject({
      success: true,
      message: 'it-tools deployed successfully using Docker CLI',
      containerId: 'generated-by-docker',
      url: 'http://localhost:8080',
      source: 'docker-cli',
      appId: 'it-tools',
      port: 8080,
    });
    expect(res.body.containerName).toMatch(/^homelabarr-it-tools-\d+$/);
    // the startup log names the app + the mode (Template Mode here, no cliBridge) —
    // pins the L26 template string + the `cliBridge ? 'CLI Bridge' : 'Template Mode'`.
    expect(silentLogger.info).toHaveBeenCalledWith(expect.stringContaining('Starting deployment of it-tools using Template Mode'));
    // and the docker argv is echoed to the log (the dockerArgs.join(' ')) — kills L60.
    expect(silentLogger.info).toHaveBeenCalledWith(expect.stringContaining('docker run -d --name'));
    // the deploy is logged against the authed user (u-admin), proving the
    // `req.user?.id || 'anonymous'` chain resolves to the real id (kills L95/L96).
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'application_deployed', targetType: 'application', targetId: 'it-tools',
      targetName: 'it-tools', userId: 'u-admin', username: 'admin', details: { mode: 'docker-cli' },
    }));
  });

  it('it-tools deploy defaults the port to 8080 when config omits it', async () => {
    // config.port || '8080' → the default string. Kills the `|| '8080'` mutant.
    vi.mocked(spawn).mockReturnValue(fakeChild());
    const { app } = buildApp({ cliBridge: null });
    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'it-tools', config: { somethingElse: 'x' } });
    expect(res.status).toBe(200);
    const [, args] = vi.mocked(spawn).mock.calls[0];
    expect(args).toContain('8080:80');
    expect(res.body).toMatchObject({ port: 8080, url: 'http://localhost:8080' });
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

  it('rejects a missing appId with 400 (with the App ID error body) before any spawn', async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild());
    const { app } = buildApp({ cliBridge: null });

    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ config: { port: '8080' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('App ID is required');
    expect(spawn).not.toHaveBeenCalled();
  });

  it('rejects a missing config with 400 (with the Configuration error body) before any spawn', async () => {
    vi.mocked(spawn).mockReturnValue(fakeChild());
    const { app } = buildApp({ cliBridge: null });

    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'it-tools' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Configuration object is required');
    expect(spawn).not.toHaveBeenCalled();
  });

  it('rejects a NON-OBJECT config (string) with 400 — the `typeof config !== object` clause', async () => {
    // appId is present but config is a string. With the real `!config || typeof
    // config !== 'object'` this is a 400; a `||` → `&&` mutation would let it
    // through (since !config is false), so this test pins the OR.
    vi.mocked(spawn).mockReturnValue(fakeChild());
    const { app } = buildApp({ cliBridge: null });

    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'it-tools', config: 'not-an-object' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Configuration object is required');
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
    expect(res.body).toMatchObject({
      success: true,
      source: 'cli',
      appId: 'media-servers-plex',
      message: 'media-servers-plex deployed successfully using HomelabARR CLI',
      deployment: { id: 'dep-1' },
      mode: { type: 'standard' },
    });
    expect(cliBridge.deployApplication).toHaveBeenCalledWith(
      'media-servers-plex',
      { PUID: '1000' },
      // mode omitted → defaults to { type: 'standard', useAuthentik: false }
      { type: 'standard', useAuthentik: false }
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

  it('the list-stats path only ever interpolates ids from `docker ps` output (regression guard)', async () => {
    // docker ps -a (execSync) returns one container whose Id is a benign hex
    // string; the per-container stats/inspect commands (now async exec — HLCE-275)
    // must use THAT id, proving no request-controlled value reaches the shell.
    const psJson = JSON.stringify({ ID: 'abc123hex', Names: 'plex', Image: 'plex:latest', State: 'running', Status: 'Up', Ports: '', CreatedAt: '', Labels: '' });
    vi.mocked(execSync).mockImplementation((command) => command.includes('docker ps') ? psJson + '\n' : '');
    mockExecAsync((command) => {
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
    // ps via execSync; the stats/inspect sweep via async exec — both shell-out
    // only the ps-derived id, never a request value.
    expect(vi.mocked(execSync).mock.calls.some((c) => c[0].includes('docker ps'))).toBe(true);
    const statsCmds = vi.mocked(exec).mock.calls.map((c) => c[0]).filter((c) => c.includes('docker stats') || c.includes('docker inspect'));
    expect(statsCmds.length).toBeGreaterThan(0);
    for (const c of statsCmds) {
      expect(c).toContain('abc123hex');
    }
  });

  it('GET /containers?stats=true parses REAL `docker stats` CLI strings (parseBytes/parseMemoryUsage/parseNetworkUsage)', async () => {
    // Mutation-hardening (HLCE-277): feed non-zero, unit-bearing stats strings so
    // the CLI-string parsers actually transform values. The table row is
    // `CPUPerc,MemUsage,NetIO,PIDs`: 12.5%, 256MiB / 1GiB, 1.5kB / 2.0kB, 7.
    //   parseBytes: 256 MiB = 256*1048576 = 268435456; 1 GiB = 1073741824
    //   mem percentage = 268435456 / 1073741824 * 100 = 25
    //   net rx = 1.5 kB = 1500 ; tx = 2.0 kB = 2000
    const ps = JSON.stringify({ ID: 'statsid', Names: 'plex', Image: 'plex:latest', State: 'running', Status: 'Up', Ports: '', CreatedAt: '', Labels: '' });
    vi.mocked(execSync).mockImplementation((command) => command.includes('docker ps') ? ps + '\n' : '');
    const inspectJson = JSON.stringify([{ Config: { Image: 'plex' }, Mounts: [], State: { StartedAt: new Date(Date.now() - 3000).toISOString() } }]);
    mockExecAsync((command) => {
      if (command.includes('docker stats')) return 'CPU,MEM,NET,PIDS\n12.5%,256MiB / 1GiB,1.5kB / 2.0kB,7\n';
      if (command.includes('docker inspect')) return inspectJson;
      return '';
    });
    const dockerManager = dockerManagerStub();
    const { app } = buildApp({ dockerManager });

    const res = await request(app).get('/containers?stats=true').set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    const c = res.body.containers[0];
    expect(c.stats.cpu).toBeCloseTo(12.5, 5);
    expect(c.stats.memory).toMatchObject({ usage: 268435456, limit: 1073741824, percentage: 25 });
    expect(c.stats.network).toEqual({ rx: 1500, tx: 2000 });
    expect(c.stats.uptime).toBeGreaterThanOrEqual(2);
    // inspect output threads through to config + mounts
    expect(c.config).toEqual({ Image: 'plex' });
    expect(c.mounts).toEqual([]);
    // the sweep shells out via /bin/sh on this (non-win32) platform — kills the
    // `process.platform === 'win32'` ternary + shell-string mutants on the exec opts.
    const statsCall = vi.mocked(exec).mock.calls.find((cc) => cc[0].includes('docker stats'));
    expect(statsCall[1]).toMatchObject({ shell: '/bin/sh' });
  });

  it('GET /containers?stats=true falls back to zeroed stats when the CLI strings are malformed', async () => {
    // Mutation-hardening (HLCE-277): a header-only `docker stats` table (no data
    // row) and a memory/net string without the ` / ` separator drive the parser
    // guard clauses: statsLines.length>1 is false → ['0%',...] fallback; and
    // parseMemoryUsage/parseNetworkUsage return zeros when parts.length !== 2.
    const ps = JSON.stringify({ ID: 'badid', Names: 'x', Image: 'i', State: 'running', Status: 'Up', Ports: '', CreatedAt: '', Labels: '' });
    vi.mocked(execSync).mockImplementation((command) => command.includes('docker ps') ? ps + '\n' : '');
    mockExecAsync((command) => {
      if (command.includes('docker stats')) return 'ONLY-A-HEADER-NO-DATA-ROW\n';
      if (command.includes('docker inspect')) return JSON.stringify([{ Config: {}, Mounts: [], State: {} }]);
      return '';
    });
    const dockerManager = dockerManagerStub();
    const { app } = buildApp({ dockerManager });
    const res = await request(app).get('/containers?stats=true').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    const c = res.body.containers[0];
    expect(c.stats.cpu).toBe(0);
    expect(c.stats.memory).toEqual({ usage: 0, limit: 0, percentage: 0 });
    expect(c.stats.network).toEqual({ rx: 0, tx: 0 });
    // no State.StartedAt → uptime 0 (kills the calculateUptime guard mutant)
    expect(c.stats.uptime).toBe(0);
  });

  it('GET /containers?stats=true: a zero MemUsage limit yields 0% and an unparseable byte unit yields 0', async () => {
    // MemUsage '500B / 0B' → limit 0 so parseMemoryUsage's `limit > 0 ? : 0` returns
    // percentage 0 (kills the `> 0` comparison). NetIO 'bogus / nope' → parseBytes
    // can't match either token → both rx/tx are 0 (kills the regex-match guard).
    const ps = JSON.stringify({ ID: 'zid', Names: 'a', Image: 'i', State: 'running', Status: 'Up', Ports: '', CreatedAt: '', Labels: '' });
    vi.mocked(execSync).mockImplementation((command) => command.includes('docker ps') ? ps + '\n' : '');
    mockExecAsync((command) => {
      if (command.includes('docker stats')) return 'H\n5%,500B / 0B,bogus / nope,1\n';
      if (command.includes('docker inspect')) return JSON.stringify([{ Config: {}, Mounts: [], State: { StartedAt: new Date().toISOString() } }]);
      return '';
    });
    const dockerManager = dockerManagerStub();
    const { app } = buildApp({ dockerManager });
    const res = await request(app).get('/containers?stats=true').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    const c = res.body.containers[0];
    expect(c.stats.memory).toEqual({ usage: 500, limit: 0, percentage: 0 });
    expect(c.stats.network).toEqual({ rx: 0, tx: 0 });
  });

  it('GET /containers/:id/stats returns 0 cpu when stats lacks cpu_stats (guard clause)', async () => {
    // calculateCPUPercentage's `!stats || !stats.cpu_stats || !stats.precpu_stats`
    // guard returns 0; calculateNetworkUsage with no `networks` returns {} (kills L13/L36 guards).
    const container = {
      stats: vi.fn().mockResolvedValue({ memory_stats: { usage: 100, limit: 200, stats: {} } }),
      inspect: vi.fn().mockResolvedValue({ State: { StartedAt: new Date().toISOString() } }),
    };
    const dockerManager = dockerManagerStub({ container });
    const { app } = buildApp({ dockerManager });
    const res = await request(app).get('/containers/cid/stats').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(res.body.stats.cpu).toBe(0);
    expect(res.body.stats.network).toEqual({});
    // memory still computes: 100/200 = 50%
    expect(res.body.stats.memory).toMatchObject({ usage: 100, limit: 200, percentage: 50 });
  });

  it('GET /containers maps empty-valued and missing labels correctly', async () => {
    // 'k1=v1,k2=' → { k1:'v1', k2:'' }: the `value || ''` keeps an empty string,
    // and a key with no '=' contributes ''. Kills the Labels-reduce mutants.
    const ps = JSON.stringify({ ID: 'lid', Names: 'a', Image: 'i', State: 'running', Status: 'Up', Ports: '8.8.8.8:90->90/tcp', CreatedAt: '', Labels: 'k1=v1,k2=' });
    vi.mocked(execSync).mockReturnValue(ps + '\n');
    const dockerManager = dockerManagerStub();
    const { app } = buildApp({ dockerManager });
    const res = await request(app).get('/containers').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(res.body.containers[0].Labels).toEqual({ k1: 'v1', k2: '' });
    // the public-port regex pulls 90 out of the mapping string
    expect(res.body.containers[0].Ports).toEqual([{ PublicPort: '90' }]);
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
    const c = res.body.containers[0];
    // Mutation-hardening (HLCE-277): assert the full mapped shape, not just Id —
    // kills the field-rename / Names-prefix / Labels-split / Ports-regex mutants.
    expect(c.Id).toBe('id1');
    expect(c.Names).toEqual(['/app1']);
    expect(c.Image).toBe('img:latest');
    expect(c.State).toBe('running');
    expect(c.Status).toBe('Up 2h');
    // Labels 'a=b' splits into { a: 'b' }; Ports parses the public port out of the mapping
    expect(c.Labels).toEqual({ a: 'b' });
    expect(c.Ports).toEqual([{ PublicPort: '8080' }]);
    // basic (no-stats) info is zeroed and the live docker status echoes back
    expect(c.stats).toEqual({ cpu: 0, memory: { usage: 0, limit: 0, percentage: 0 }, network: {}, uptime: 0 });
    expect(res.body.docker).toMatchObject({ status: 'connected' });
  });

  it('GET /containers returns an empty list (not a crash) when `docker ps` throws', async () => {
    vi.mocked(execSync).mockImplementation(() => { throw new Error('no docker'); });
    const dockerManager = dockerManagerStub();
    const { app } = buildApp({ dockerManager });

    const res = await request(app).get('/containers').set('Cookie', adminCookie());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.containers).toEqual([]);
    // even on the empty path the CLI-status block reports back (kills the
    // success:false / docker-status mutants on the early-return branch)
    expect(res.body.docker).toMatchObject({ status: 'connected', message: 'CLI-based Docker access' });
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
      // Mutation-hardening (HLCE-277): assert the success body + activity action so
      // the per-op message string and the `container_<op>ed` action are pinned.
      const past = { start: 'started', stop: 'stopped', restart: 'restarted' }[op];
      expect(res.body).toMatchObject({ success: true, message: `Container ${past} successfully`, containerId: 'cid' });
      expect(dockerManager._docker.getContainer).toHaveBeenCalledWith('cid');
      expect(logActivity).toHaveBeenCalledWith(
        // userId comes from the authed token (u-admin), NOT the 'anonymous' fallback —
        // kills the `req.user?.id || 'anonymous'` optional-chaining/logical mutants.
        expect.objectContaining({ action: `container_${past}`, targetType: 'container', targetId: 'cid', userId: 'u-admin', username: 'admin', targetName: 'cid' })
      );
    });

    it(`POST /containers/:id/${op} returns 503 when Docker is unavailable`, async () => {
      const dockerManager = dockerManagerStub({ status: 'unavailable' });
      const { app } = buildApp({ dockerManager });
      const res = await request(app).post(`/containers/cid/${op}`).set('Cookie', adminCookie());
      expect(res.status).toBe(503);
    });
  }

  it('GET /containers/:id/logs strips the 8-byte docker stream header per line', async () => {
    // Mutation-hardening (HLCE-277): the cleaner does line.substring(8) for lines
    // longer than 8 chars, drops blank lines, and rejoins. Drive a buffer with a
    // long line (header stripped), a short line (kept verbatim), and a blank one.
    // Lines: a >8 line (header stripped), an EXACTLY-8 line ('EXACT888' → substring(8)
    // = '' → filtered, which a `>=8`/`>8` flip would change), a <8 line (kept), a blank.
    const container = {
      logs: vi.fn().mockResolvedValue(Buffer.from('HHHHHHHHvisible-tail\nEXACT888\nshort\n\n')),
    };
    const dockerManager = dockerManagerStub({ container });
    const { app } = buildApp({ dockerManager });
    const res = await request(app).get('/containers/cid/logs?tail=50').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.containerId).toBe('cid');
    // 'HHHHHHHHvisible-tail' (len>8) → substring(8) = 'visible-tail'; 'EXACT888'
    // (len==8, the `> 8` guard is FALSE) → kept whole; 'short' (<8) kept; blank
    // dropped. A `> 8` → `>= 8` flip would strip 'EXACT888' to '' and drop it,
    // changing this output — so this pins the boundary.
    expect(res.body.logs).toBe('visible-tail\nEXACT888\nshort');
    // the requested tail is forwarded to dockerode (kills the `parseInt || 100` mutant)
    expect(container.logs).toHaveBeenCalledWith(expect.objectContaining({ tail: 50, timestamps: true }));
    expect(res.body.docker).toMatchObject({ status: 'available' });
  });

  it('GET /containers/:id/stats computes EXACT cpu/mem/net/uptime figures (dockerode)', async () => {
    // Mutation-hardening (HLCE-277): the cpu/mem/net/uptime maths live in
    // module-private helpers reachable only through this route. Asserting the
    // exact numbers (not just `> 0`) kills the arithmetic / comparison / Math.min
    // mutants in calculateCPUPercentage / calculateMemoryUsage / calculateUptime.
    //   cpuDelta=100, systemDelta=1000, online_cpus=2 → (100/1000)*2*100 = 20%
    //   mem usage = 1572864 - cache 524288 = 1048576; /limit 2097152 = 50%
    //   net eth0 surfaces rx/tx verbatim; uptime = floor((now - start)/1000)
    const startedAt = new Date(Date.now() - 5000).toISOString();
    const container = {
      stats: vi.fn().mockResolvedValue({
        cpu_stats: { cpu_usage: { total_usage: 200 }, system_cpu_usage: 2000, online_cpus: 2 },
        precpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000 },
        memory_stats: { usage: 1572864, limit: 2097152, stats: { cache: 524288 } },
        networks: { eth0: { rx_bytes: 10, tx_bytes: 20 } },
      }),
      inspect: vi.fn().mockResolvedValue({ State: { StartedAt: startedAt } }),
    };
    const dockerManager = dockerManagerStub({ container });
    const { app } = buildApp({ dockerManager });
    const res = await request(app).get('/containers/cid/stats').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(res.body.stats.cpu).toBeCloseTo(20, 5);
    expect(res.body.stats.memory).toMatchObject({ usage: 1048576, limit: 2097152, percentage: 50 });
    expect(res.body.stats.network.eth0).toEqual({ rx_bytes: 10, tx_bytes: 20 });
    // uptime is ~5s (floor of elapsed seconds) — kills the *1000 / Date+start mutants
    expect(res.body.stats.uptime).toBeGreaterThanOrEqual(4);
    expect(res.body.stats.uptime).toBeLessThanOrEqual(7);
    // the response carries the live docker status, not a hardcoded blank
    expect(res.body.containerId).toBe('cid');
    expect(res.body.docker).toMatchObject({ status: 'available' });
  });

  it('GET /containers/:id/stats clamps a runaway CPU figure to cpuCount*100 (Math.min guard)', async () => {
    // systemDelta tiny vs cpuDelta huge → raw % explodes; Math.min(_, cpuCount*100)
    // must clamp to 100 (online_cpus=1). Kills the Math.min→Math.max + cpuCount*100 mutants.
    const container = {
      stats: vi.fn().mockResolvedValue({
        cpu_stats: { cpu_usage: { total_usage: 1000000 }, system_cpu_usage: 1000001, online_cpus: 1 },
        precpu_stats: { cpu_usage: { total_usage: 0 }, system_cpu_usage: 1000000 },
        memory_stats: { usage: 0, limit: 100, stats: {} },
        networks: {},
      }),
      inspect: vi.fn().mockResolvedValue({ State: { StartedAt: new Date().toISOString() } }),
    };
    const dockerManager = dockerManagerStub({ container });
    const { app } = buildApp({ dockerManager });
    const res = await request(app).get('/containers/cid/stats').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(res.body.stats.cpu).toBe(100);
  });

  it('GET /containers/:id/stats returns 0 cpu when systemDelta is non-positive (guard clause)', async () => {
    // systemDelta = 0 → the `systemDelta <= 0` guard returns 0 before dividing.
    // Kills the `<= 0` → `< 0`/`>= 0` and the guard-removal mutants.
    const container = {
      stats: vi.fn().mockResolvedValue({
        cpu_stats: { cpu_usage: { total_usage: 200 }, system_cpu_usage: 1000, online_cpus: 2 },
        precpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000 },
        memory_stats: { usage: 0, limit: 0, stats: {} },
        networks: {},
      }),
      inspect: vi.fn().mockResolvedValue({ State: { StartedAt: new Date().toISOString() } }),
    };
    const dockerManager = dockerManagerStub({ container });
    const { app } = buildApp({ dockerManager });
    const res = await request(app).get('/containers/cid/stats').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(res.body.stats.cpu).toBe(0);
    // limit defaults to 1 when 0 → percentage 0/1 = 0 (kills the `limit || 1` mutant indirectly)
    expect(res.body.stats.memory.percentage).toBe(0);
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

  it('GET /containers/:id/stats surfaces a docker failure as 500 (catch path)', async () => {
    const dockerManager = dockerManagerStub();
    dockerManager.executeWithRetry.mockRejectedValueOnce(new Error('stats boom'));
    const { app } = buildApp({ dockerManager });
    const res = await request(app).get('/containers/cid/stats').set('Cookie', adminCookie());
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('GET /containers/:id/logs surfaces a docker failure as 500 (catch path)', async () => {
    const dockerManager = dockerManagerStub();
    dockerManager.executeWithRetry.mockRejectedValueOnce(new Error('logs boom'));
    const { app } = buildApp({ dockerManager });
    const res = await request(app).get('/containers/cid/logs').set('Cookie', adminCookie());
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /containers/:id stops a running container even when inspect/stop is flaky (inner catch)', async () => {
    // inspect() rejects → the inner try/catch warns ("may already be stopped") and
    // still proceeds to remove(). Exercises the L416 stopError catch block.
    const container = {
      inspect: vi.fn().mockRejectedValue(new Error('inspect failed')),
      stop: vi.fn(),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const dockerManager = dockerManagerStub({ container });
    const { app } = buildApp({ dockerManager });
    const res = await request(app).delete('/containers/flaky').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(container.remove).toHaveBeenCalledTimes(1);
    // warned about the failed inspect, never crashed
    expect(silentLogger.warn).toHaveBeenCalled();
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
    vi.mocked(execSync).mockImplementation((command) => command.includes('docker ps') ? ps + '\n' : '');
    // The per-container stats sweep (async exec) rejects → the route degrades that
    // one container instead of crashing the whole list.
    mockExecAsync(() => new Error('stats unavailable'));
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

  it('uses the streaming CLI bridge when present, defaulting mode when omitted (no raw spawn)', async () => {
    const streamingCLIBridge = { deployApplicationWithProgress: vi.fn().mockResolvedValue({ ok: true }) };
    const { app, logActivity } = buildApp({ cliBridge: null, streamingCLIBridge });

    // NO mode in the body → the route must default it. The bridge sees
    // { type: 'standard', useAuthentik: false } and the response carries
    // { type: 'standard' }. Kills the two `mode || {...}` default mutants.
    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'media-servers-plex', config: { PUID: '1000' } });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      source: 'cli-streaming',
      appId: 'media-servers-plex',
      message: 'media-servers-plex deployment started with real-time progress tracking',
      streamEndpoint: '/stream/progress',
      mode: { type: 'standard' },
    });
    expect(res.body.deploymentId).toBeTruthy();
    // statusEndpoint embeds the generated deployment id
    expect(res.body.statusEndpoint).toBe(`/deployments/${res.body.deploymentId}/status`);
    // the streaming bridge receives appId, config, the DEFAULTED mode, and the id
    expect(streamingCLIBridge.deployApplicationWithProgress).toHaveBeenCalledTimes(1);
    expect(streamingCLIBridge.deployApplicationWithProgress).toHaveBeenCalledWith(
      'media-servers-plex',
      { PUID: '1000' },
      { type: 'standard', useAuthentik: false },
      res.body.deploymentId
    );
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'application_deployed', targetType: 'application', targetId: 'media-servers-plex', targetName: 'media-servers-plex', userId: 'u-admin' }));
    expect(spawn).not.toHaveBeenCalled();
  });

  it('streaming bridge passes an EXPLICIT mode straight through (no defaulting)', async () => {
    const streamingCLIBridge = { deployApplicationWithProgress: vi.fn().mockResolvedValue({ ok: true }) };
    const { app } = buildApp({ cliBridge: null, streamingCLIBridge });
    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'media-servers-plex', config: { PUID: '1000' }, mode: { type: 'authentik', useAuthentik: true } });
    expect(res.status).toBe(200);
    expect(res.body.mode).toEqual({ type: 'authentik', useAuthentik: true });
    expect(streamingCLIBridge.deployApplicationWithProgress).toHaveBeenCalledWith(
      'media-servers-plex', { PUID: '1000' }, { type: 'authentik', useAuthentik: true }, res.body.deploymentId
    );
  });

  it('returns 501 for an unsupported app when no bridge can handle it', async () => {
    const { app } = buildApp({ cliBridge: null, streamingCLIBridge: null });
    const res = await request(app)
      .post('/deploy')
      .set('Cookie', adminCookie())
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ appId: 'media-servers-plex', config: {} });
    expect(res.status).toBe(501);
    expect(res.body).toMatchObject({
      success: false,
      error: 'App not supported in CLI mode',
      supportedApps: ['it-tools'],
    });
    expect(res.body.details).toContain('media-servers-plex');
    // the no-path log fires before the 501 (kills the L191 'No CLI deployment...' string)
    expect(silentLogger.info).toHaveBeenCalledWith('No CLI deployment path available for', 'media-servers-plex');
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
    // the CLI failure is logged (error) then a fall-back warning is emitted before
    // the 501 — pins the two inner-catch log strings (L183/L185).
    expect(silentLogger.error).toHaveBeenCalledWith('CLI deployment failed:', 'cli failed');
    expect(silentLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Falling back to template mode'));
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
    silentLogger.info.mockClear();
    silentLogger.error.mockClear();
    // Drive the captured async callbacks the way child_process would.
    expect(() => {
      child._h.stdout.data?.(Buffer.from('container-id-output'));
      child._h.stderr.data?.(Buffer.from('a warning'));
    }).not.toThrow();
    // close(0) → success log via logger.info; close(1) → failure via logger.error.
    // Pins the `code === 0` branch + the two distinct log calls.
    child._h.proc.close?.(0);
    expect(silentLogger.info).toHaveBeenCalledWith(expect.stringContaining('deployed successfully'));
    child._h.proc.close?.(1);
    // the failure log embeds the ACCUMULATED stderr ('a warning'), proving
    // errorOutput += data.toString() ran (kills the `-=` assignment mutant).
    expect(silentLogger.error).toHaveBeenCalledWith(expect.stringContaining('Docker deployment failed with code 1: a warning'));
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
    // the streaming failure logs an error + a "Falling back to standard CLI" warning
    // before the standard bridge runs — pins the streaming inner-catch strings (L164/L165).
    expect(silentLogger.error).toHaveBeenCalledWith('Streaming CLI deployment failed:', 'stream init failed');
    expect(silentLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Falling back to standard CLI'));
  });
});

describe('AC5 — applications route supporting handlers', () => {
  it('GET /applications lists apps via the CLI bridge with flattened count + categories', async () => {
    const cliBridge = { getAvailableApplications: vi.fn().mockResolvedValue({ media: [{ id: 'plex' }, { id: 'jellyfin' }], tools: [{ id: 'it' }] }) };
    const { app } = buildApp({ cliBridge });
    const res = await request(app).get('/applications');
    expect(res.status).toBe(200);
    // totalApps = flattened length (2 + 1 = 3); categories = the object keys.
    // Kills the `.flat().length` and `Object.keys` mutants.
    expect(res.body).toMatchObject({ success: true, source: 'cli', totalApps: 3 });
    expect(res.body.categories).toEqual(['media', 'tools']);
    expect(res.body.applications).toEqual({ media: [{ id: 'plex' }, { id: 'jellyfin' }], tools: [{ id: 'it' }] });
  });

  it('GET /applications surfaces a CLI bridge failure as 500', async () => {
    const cliBridge = { getAvailableApplications: vi.fn().mockRejectedValue(new Error('list boom')) };
    const { app } = buildApp({ cliBridge });
    const res = await request(app).get('/applications');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to load applications');
  });

  it('GET /applications/:appId/logs returns logs via the CLI bridge (stdout + appId + default lines)', async () => {
    const cliBridge = { getApplicationLogs: vi.fn().mockResolvedValue({ stdout: 'log output' }) };
    const { app } = buildApp({ cliBridge });
    const res = await request(app).get('/applications/media-servers-plex/logs').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, source: 'cli', logs: 'log output', appId: 'media-servers-plex' });
    // default lines = 100 (parseInt of the `lines = 100` default)
    expect(cliBridge.getApplicationLogs).toHaveBeenCalledWith('media-servers-plex', 100);
  });

  it('GET /applications/:appId/logs honours an explicit lines query and falls back to the raw result', async () => {
    // result has no .stdout → the `result.stdout || result` fallback returns the
    // whole result. Kills the `|| result` logical mutant and the parseInt(lines).
    const cliBridge = { getApplicationLogs: vi.fn().mockResolvedValue('raw-string-logs') };
    const { app } = buildApp({ cliBridge });
    const res = await request(app).get('/applications/plex/logs?lines=25').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, logs: 'raw-string-logs', appId: 'plex' });
    expect(cliBridge.getApplicationLogs).toHaveBeenCalledWith('plex', 25);
  });

  it('GET /applications/:appId/logs surfaces a bridge failure as 500', async () => {
    const cliBridge = { getApplicationLogs: vi.fn().mockRejectedValue(new Error('logs boom')) };
    const { app } = buildApp({ cliBridge });
    const res = await request(app).get('/applications/x/logs').set('Cookie', adminCookie());
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to get application logs');
  });

  it('POST /applications/:appId/stop returns 503 without a CLI bridge', async () => {
    const { app } = buildApp({ cliBridge: null });
    const res = await request(app).post('/applications/x/stop').set('Cookie', adminCookie());
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: 'CLI Bridge not available', details: 'Cannot manage applications without CLI integration' });
  });

  it('POST /applications/:appId/stop surfaces a bridge failure as 500', async () => {
    const cliBridge = { stopApplication: vi.fn().mockRejectedValue(new Error('stop boom')) };
    const { app } = buildApp({ cliBridge });
    const res = await request(app).post('/applications/x/stop').set('Cookie', adminCookie());
    expect(res.status).toBe(500);
  });

  it('GET /applications falls back to template-dir mode and builds display names from the filenames', async () => {
    const { app } = buildApp({ cliBridge: null });
    const res = await request(app).get('/applications');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      source: 'templates',
      categories: ['templates'],
      message: 'Using template mode - CLI integration unavailable',
    });
    const templates = res.body.applications.templates;
    expect(Array.isArray(templates)).toBe(true);
    // totalApps mirrors the template count
    expect(res.body.totalApps).toBe(templates.length);
    // 'arr-tools-recyclarr' (a real template) → display name title-cased per word.
    // Pins the split('-')/map(charAt(0).toUpperCase + slice(1))/join(' ') logic +
    // the id/image/description/category fields. Kills those StringLiteral/Method mutants.
    const recyclarr = templates.find((t) => t.id === 'arr-tools-recyclarr');
    expect(recyclarr).toBeTruthy();
    expect(recyclarr).toMatchObject({
      id: 'arr-tools-recyclarr',
      name: 'arr-tools-recyclarr',
      displayName: 'Arr Tools Recyclarr',
      description: 'Docker application: arr-tools-recyclarr',
      image: 'arr-tools-recyclarr:latest',
      category: 'template',
      ports: { '80': '8080' },
      requiresTraefik: false,
      requiresAuthelia: false,
    });
    // only .yml files become templates (the .filter(endsWith('.yml'))) — none keep the extension
    expect(templates.every((t) => !t.id.endsWith('.yml'))).toBe(true);
  });

  it('GET /applications/:appId/logs returns 503 without a CLI bridge', async () => {
    const { app } = buildApp({ cliBridge: null });
    const res = await request(app).get('/applications/x/logs').set('Cookie', adminCookie());
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: 'CLI Bridge not available', details: 'Cannot retrieve logs without CLI integration' });
  });
});
