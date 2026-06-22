import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import yaml from 'yaml';
import { fileURLToPath } from 'url';

// HLCE-273 (AC1–AC3) — argv construction, deployStandard compose rewrite, and
// the env-value character-set gate in executeDockerCompose.
//
// We mock child_process so no real docker-compose ever runs. The CLIBridge
// constructor is pointed at the repo root (which has apps/) exactly like
// cli-bridge.test.js does, so verifyCLIInstallation() passes.

vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

import { spawn } from 'child_process';
import { CLIBridge } from './cli-bridge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// A fake child process whose `close` callback can be fired synchronously to
// resolve (or reject) the promise returned by executeDockerCompose. Returns the
// child plus a `fire(event, arg)` helper.
function makeFakeChild() {
  const handlers = {};
  const child = {
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event, cb) => {
      handlers[event] = cb;
    }),
  };
  return {
    child,
    fire(event, arg) {
      handlers[event]?.(arg);
    },
  };
}

let bridge;
beforeAll(() => {
  // CLIBridge's constructor logs via DeploymentLogger -> EnvironmentManager,
  // which hard-exits unless a 32+ char JWT_SECRET is present.
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-that-is-definitely-32-plus-chars-long';
  process.env.CLI_BRIDGE_HOST_PATH = repoRoot;
  bridge = new CLIBridge();
});

beforeEach(() => {
  vi.mocked(spawn).mockReset();
});

// ---- AC1: argv per allowlisted verb (spawn-mocked) -------------------------
describe('AC1 — executeDockerCompose builds exact argv and never uses a shell', () => {
  const appPath = path.join(repoRoot, 'apps', 'whatever.yml');

  const cases = [
    ['up -d', ['-f', appPath, 'up', '-d']],
    ['down', ['-f', appPath, 'down']],
    ['down -v', ['-f', appPath, 'down', '-v']],
    ['logs --tail=50', ['-f', appPath, 'logs', '--tail=50']],
    ['logs', ['-f', appPath, 'logs', '--tail=100']], // bare logs defaults to 100
  ];

  for (const [command, expectedArgs] of cases) {
    it(`spawns docker-compose with ${JSON.stringify(expectedArgs)} for "${command}"`, async () => {
      const { child, fire } = makeFakeChild();
      vi.mocked(spawn).mockReturnValue(child);

      const p = bridge.executeDockerCompose(appPath, command, {});
      fire('close', 0);
      await expect(p).resolves.toMatchObject({ exitCode: 0 });

      expect(spawn).toHaveBeenCalledTimes(1);
      const [bin, args, options] = vi.mocked(spawn).mock.calls[0];
      expect(bin).toBe('docker-compose');
      expect(args).toEqual(expectedArgs);
      // No shell — the value safety relies on argv-based spawn, never a shell.
      expect(options).not.toHaveProperty('shell');
    });
  }

  it('throws "Unsupported compose command" and never spawns for a disallowed verb', async () => {
    vi.mocked(spawn).mockReturnValue(makeFakeChild().child);
    await expect(
      bridge.executeDockerCompose(appPath, 'rm -rf /', {})
    ).rejects.toThrow(/Unsupported compose command/);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('rejects with the exit-code message when the child closes non-zero', async () => {
    const { child, fire } = makeFakeChild();
    vi.mocked(spawn).mockReturnValue(child);

    const p = bridge.executeDockerCompose(appPath, 'up -d', {});
    fire('close', 1);
    await expect(p).rejects.toThrow(/failed with exit code 1/);
  });

  it('rejects when the child emits an error event', async () => {
    const { child, fire } = makeFakeChild();
    vi.mocked(spawn).mockReturnValue(child);

    const p = bridge.executeDockerCompose(appPath, 'up -d', {});
    fire('error', new Error('spawn ENOENT'));
    await expect(p).rejects.toThrow(/spawn ENOENT/);
  });
});

// ---- AC2: deployStandard rewrites the compose file ------------------------
describe('AC2 — deployStandard strips external networks, security_opt, traefik/dockupdater labels', () => {
  let inputPath;
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-273-'));
    inputPath = path.join(tmpDir, 'sampleapp.yml');
    const input = {
      networks: {
        proxy: { external: true },
        internal: {},
      },
      services: {
        app: {
          image: 'lscr.io/linuxserver/sampleapp:latest',
          ports: ['8080:80'],
          environment: ['PUID=1000', 'TZ=UTC'],
          networks: ['proxy', 'internal'],
          security_opt: ['no-new-privileges:true'],
          labels: [
            'traefik.enable=true',
            'dockupdater.enable=true',
            'com.example=keep',
          ],
        },
      },
    };
    fs.writeFileSync(inputPath, yaml.stringify(input));
  });

  it('rewrites the compose doc and deploys it with up -d + DOCKERNETWORK=bridge', async () => {
    let written;
    const execSpy = vi
      .spyOn(bridge, 'executeDockerCompose')
      .mockImplementation(async (tmpPath) => {
        // Capture the rewritten file BEFORE deployStandard's finally unlinks it.
        written = fs.readFileSync(tmpPath, 'utf8');
        return { stdout: '', stderr: '', exitCode: 0 };
      });

    await bridge.deployStandard(inputPath, { PUID: '1000' });

    // Parse the ACTUAL rewritten file (not a stub) to assert on its structure.
    expect(written).toBeTruthy();
    const doc = yaml.parse(written);

    // External network removed; the non-external one survives.
    expect(doc.networks).toBeDefined();
    expect(doc.networks.proxy).toBeUndefined();
    expect(doc.networks.internal).toBeDefined();

    const svc = doc.services.app;
    // Per-service networks stripped; security_opt REPLACED with the hardening
    // default (HLCE-281 AC2 — standard mode must not silently un-harden).
    expect(svc.networks).toBeUndefined();
    expect(svc.security_opt).toEqual(['no-new-privileges:true']);

    // traefik + dockupdater labels removed, benign label retained.
    expect(svc.labels).toEqual(['com.example=keep']);

    // image / ports / environment retained unchanged.
    expect(svc.image).toBe('lscr.io/linuxserver/sampleapp:latest');
    expect(svc.ports).toEqual(['8080:80']);
    expect(svc.environment).toEqual(['PUID=1000', 'TZ=UTC']);

    // executeDockerCompose invoked with up -d and the merged config.
    expect(execSpy).toHaveBeenCalledTimes(1);
    const [, cmd, env] = execSpy.mock.calls[0];
    expect(cmd).toBe('up -d');
    expect(env).toMatchObject({ DOCKERNETWORK: 'bridge', PUID: '1000' });

    execSpy.mockRestore();
  });

  it('drops the networks key entirely when every network is external', async () => {
    const allExternalPath = path.join(tmpDir, 'allext.yml');
    fs.writeFileSync(
      allExternalPath,
      yaml.stringify({
        networks: { proxy: { external: true } },
        services: { app: { image: 'busybox' } },
      })
    );

    let written;
    const execSpy = vi
      .spyOn(bridge, 'executeDockerCompose')
      .mockImplementation(async (tmpPath) => {
        written = fs.readFileSync(tmpPath, 'utf8');
        return { stdout: '', stderr: '', exitCode: 0 };
      });

    await bridge.deployStandard(allExternalPath, {});
    const doc = yaml.parse(written);
    expect(doc.networks).toBeUndefined();

    execSpy.mockRestore();
  });
});

// ---- HLCE-281 AC1: deployApplication never pollutes process.env -----------
// prepareEnvironmentConfig used to do Object.assign(process.env, defaults, config),
// writing the RAW user config into the global process.env. executeDockerCompose
// then built `{ ...process.env, ...filtered }`, so non-allowlisted keys (EVIL) and
// dangerous-valued allowed keys leaked into the spawned env via process.env even
// though `filtered` excluded them — and the values persisted across deploys.
//
// The fix threads a per-deploy trusted-default env explicitly into the spawn and
// stops mutating process.env. This drives the REAL deployApplication(appId, config,
// mode) path (spawn mocked) and asserts the seal holds end-to-end.
describe('HLCE-281 AC1 — deployApplication seals the spawned env and never mutates process.env', () => {
  // A fake child that fires `close 0` on the next tick so the awaited
  // executeDockerCompose promise inside deployStandard resolves on its own.
  function makeAutoChild() {
    const child = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, cb) => {
        if (event === 'close') setImmediate(() => cb(0));
      }),
    };
    return child;
  }

  it('drops a non-allowlisted key, rejects $/backtick/newline values, leaves process.env untouched', async () => {
    vi.mocked(spawn).mockImplementation(() => makeAutoChild());

    const before = { ...process.env };

    const config = {
      // allowlisted + clean — must reach the spawned env
      TZ: 'America/New_York',
      // non-allowlisted — must be dropped, never reach the spawn or process.env
      EVIL: 'pwned',
      // allowlisted but DANGEROUS values — must be REJECTED before spawn
      // (we assert each independently below; here we keep config clean enough to
      //  reach the spawn so we can inspect what landed)
    };

    await bridge.deployApplication('ai-comfyui', config, { type: 'standard' });

    expect(spawn).toHaveBeenCalledTimes(1);
    const [, , options] = vi.mocked(spawn).mock.calls[0];
    // Allowlisted clean value flows through the validated path.
    expect(options.env.TZ).toBe('America/New_York');
    // Non-allowlisted key never reaches the spawned env...
    expect(options.env.EVIL).toBeUndefined();
    // ...and never leaked into the global process.env.
    expect(process.env.EVIL).toBeUndefined();
    // Trusted defaults still reach the spawn (so ${VAR} interpolation works)...
    expect(options.env.RESTARTAPP).toBe('unless-stopped');
    // ...but were NOT written into the global process.env either.
    expect(process.env.RESTARTAPP).toBeUndefined();

    // process.env is unchanged by the deploy (no keys added/removed/changed).
    expect(Object.keys(process.env).sort()).toEqual(Object.keys(before).sort());
  });

  const dangerous = [
    ['dollar/interpolation', 'UTC$(whoami)'],
    ['backtick', 'x`id`'],
    ['newline', 'a\nb'],
  ];

  for (const [label, value] of dangerous) {
    it(`rejects a ${label} value on an allowlisted key (TZ) before any spawn, env untouched`, async () => {
      vi.mocked(spawn).mockImplementation(() => makeAutoChild());
      const before = { ...process.env };

      await expect(
        bridge.deployApplication('ai-comfyui', { TZ: value }, { type: 'standard' })
      ).rejects.toThrow(/Invalid template variable value for TZ/);

      expect(spawn).not.toHaveBeenCalled();
      // The dangerous value never touched the global env.
      expect(process.env.TZ).toBe(before.TZ);
      expect(Object.keys(process.env).sort()).toEqual(Object.keys(before).sort());
    });
  }
});

// ---- HLCE-281 AC2: deployStandard hardening preserved ----------------------
describe('HLCE-281 AC2 — deployStandard re-injects no-new-privileges and matches labels by key prefix', () => {
  let tmpDir;
  let inputPath;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-281-'));
    inputPath = path.join(tmpDir, 'hardenme.yml');
    fs.writeFileSync(
      inputPath,
      yaml.stringify({
        services: {
          app: {
            image: 'busybox',
            security_opt: ['apparmor=unconfined'], // a NON-hardening opt that must be replaced
            labels: [
              'traefik.enable=true',            // routing label — must be stripped
              'dockupdater.enable=true',        // updater label — must be stripped
              'com.example.note=uses traefik',  // benign label whose VALUE mentions traefik — must SURVIVE
            ],
          },
        },
      })
    );
  });

  it('keeps no-new-privileges and the benign "uses traefik" label while dropping traefik.enable', async () => {
    let written;
    const execSpy = vi
      .spyOn(bridge, 'executeDockerCompose')
      .mockImplementation(async (tmpPath) => {
        written = fs.readFileSync(tmpPath, 'utf8');
        return { stdout: '', stderr: '', exitCode: 0 };
      });

    await bridge.deployStandard(inputPath, {});

    const svc = yaml.parse(written).services.app;
    // Hardening opt re-injected (replacing the original non-hardening one).
    expect(svc.security_opt).toEqual(['no-new-privileges:true']);
    // Key-prefix match: traefik.*/dockupdater.* routing labels removed...
    expect(svc.labels).not.toContain('traefik.enable=true');
    expect(svc.labels).not.toContain('dockupdater.enable=true');
    // ...but the benign label whose VALUE merely contains "traefik" survives.
    expect(svc.labels).toContain('com.example.note=uses traefik');

    execSpy.mockRestore();
  });
});

// ---- HLCE-281 AC3: getApplicationLogs coerces a bad `lines` ----------------
describe('HLCE-281 AC3 — getApplicationLogs coerces a non-numeric lines to the 100 default', () => {
  it('builds --tail=100 for a non-numeric lines value (no silent garbage tail)', async () => {
    let captured;
    const execSpy = vi
      .spyOn(bridge, 'executeDockerCompose')
      .mockImplementation(async (_appPath, command) => {
        captured = command;
        return { stdout: '', stderr: '', exitCode: 0 };
      });

    await bridge.getApplicationLogs('ai-comfyui', 'not-a-number');
    expect(captured).toBe('logs --tail=100');

    await bridge.getApplicationLogs('ai-comfyui', -5);
    expect(captured).toBe('logs --tail=100');

    await bridge.getApplicationLogs('ai-comfyui', 0);
    expect(captured).toBe('logs --tail=100');

    // a valid positive value passes through unchanged
    await bridge.getApplicationLogs('ai-comfyui', 42);
    expect(captured).toBe('logs --tail=42');

    execSpy.mockRestore();
  });
});

// ---- AC3: env char-set gate is pinned --------------------------------------
// executeDockerCompose REJECTS an allowed key whose value contains any of:
//   carriage-return \r, newline \n, NUL \0, backtick `, dollar $   (regex
//   /[\r\n\0`$]/) — these are the compose-interpolation ($ `) + control chars.
// It also rejects values longer than 256 chars. Non-allowlisted keys are
// silently dropped. Other shell metacharacters are NOT rejected, because the
// value lands in spawn's `env`, never in a shell.
describe('AC3 — executeDockerCompose env character-set gate', () => {
  const appPath = path.join(repoRoot, 'apps', 'whatever.yml');

  const rejected = [
    ['carriage return', 'a\rb'],
    ['newline', 'a\nb'],
    ['NUL', 'a\0b'],
    ['backtick', 'x`id`'],
    ['dollar', 'UTC$(whoami)'],
  ];

  for (const [label, value] of rejected) {
    it(`rejects a ${label} in an allowed key (TZ)`, async () => {
      vi.mocked(spawn).mockReturnValue(makeFakeChild().child);
      await expect(
        bridge.executeDockerCompose(appPath, 'up -d', { TZ: value })
      ).rejects.toThrow(/Invalid template variable value for TZ/);
      expect(spawn).not.toHaveBeenCalled();
    });
  }

  it('rejects a value longer than 256 chars for an allowed key', async () => {
    vi.mocked(spawn).mockReturnValue(makeFakeChild().child);
    await expect(
      bridge.executeDockerCompose(appPath, 'up -d', { APPDATA: 'x'.repeat(257) })
    ).rejects.toThrow(/Invalid template variable value for APPDATA/);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('silently drops a non-allowlisted key (no throw, absent from spawn env)', async () => {
    const { child, fire } = makeFakeChild();
    vi.mocked(spawn).mockReturnValue(child);

    const p = bridge.executeDockerCompose(appPath, 'up -d', { EVIL: 'whatever' });
    fire('close', 0);
    await expect(p).resolves.toMatchObject({ exitCode: 0 });

    const [, , options] = vi.mocked(spawn).mock.calls[0];
    expect(options.env.EVIL).toBeUndefined();
  });

  it('accepts a value with shell metachars that are NOT in the reject set', async () => {
    const { child, fire } = makeFakeChild();
    vi.mocked(spawn).mockReturnValue(child);

    // ; & | > < are shell metacharacters but contain none of \r \n \0 ` $,
    // so the gate accepts them — safe because the value is passed via env,
    // never interpreted by a shell.
    const value = 'a;b&&c|d>e<f';
    const p = bridge.executeDockerCompose(appPath, 'up -d', { DOMAIN: value });
    fire('close', 0);
    await expect(p).resolves.toMatchObject({ exitCode: 0 });

    const [, , options] = vi.mocked(spawn).mock.calls[0];
    expect(options.env.DOMAIN).toBe(value);
  });
});
