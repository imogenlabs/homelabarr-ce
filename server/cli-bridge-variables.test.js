import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

// HLCE-373: values typed in the deploy dialog must reach the app, and only the
// app's own environment variables may be set that way. child_process is mocked
// so no real docker-compose runs; each test reads the env handed to spawn.

vi.mock('child_process', () => ({ spawn: vi.fn(), execSync: vi.fn() }));

import { spawn } from 'child_process';
import { CLIBridge } from './cli-bridge.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function succeedingChild() {
  return {
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event, cb) => {
      if (event === 'close') setTimeout(() => cb(0), 0);
    }),
  };
}

let bridge;
let StreamingCLIBridge;
beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-that-is-definitely-32-plus-chars-long';
  process.env.CLI_BRIDGE_HOST_PATH = repoRoot;
  process.env.DATA_DIR = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-373-')), 'data');
  bridge = new CLIBridge();
  ({ StreamingCLIBridge } = await import('./progress-stream.js'));
});

beforeEach(() => {
  vi.mocked(spawn).mockReset();
  vi.mocked(spawn).mockImplementation(() => succeedingChild());
});

const spawnEnv = () => vi.mocked(spawn).mock.calls[0][2].env;

describe('settableVariables', () => {
  const doc = {
    services: {
      app: {
        image: '${APPIMAGE}',
        environment: [
          'TOKEN=${APP_TOKEN}',
          'LEVEL=${APP_LEVEL:-info}',
          'DATA=${APP_DIR}',
          'TZ=${TZ}',
          'HOSTDOCK=${DOCKER_HOST}',
          'PLAIN=value',
        ],
        volumes: ['${APP_DIR}:/data', '${APPFOLDER}/app:/config'],
        security_opt: ['${SECURITYOPS}:${SECURITYOPSSET}'],
      },
      side: { environment: { SIDE_KEY: '${SIDE_SECRET}' } },
    },
  };

  it('offers names used only in environment values, required unless a fallback is given', () => {
    const settable = CLIBridge.settableVariables(doc);
    expect(Object.fromEntries(settable)).toEqual({ APP_TOKEN: true, APP_LEVEL: false, SIDE_SECRET: true });
  });

  it('never offers a name also used in volumes, image or security options, a default, or a protected name', () => {
    const settable = CLIBridge.settableVariables(doc);
    for (const name of ['APP_DIR', 'APPIMAGE', 'APPFOLDER', 'SECURITYOPS', 'TZ', 'DOCKER_HOST']) {
      expect(settable.has(name)).toBe(false);
    }
  });
});

describe('deploy dialog values reach compose', () => {
  it('passes the app\'s own variables through deployApplication (CF Companion)', async () => {
    await bridge.deployApplication('system-cf-companion', { CF_TOKEN: 'tok-123', CF_ZONE_ID: 'zone-9' }, { type: 'standard' });
    expect(spawnEnv()).toMatchObject({ CF_TOKEN: 'tok-123', CF_ZONE_ID: 'zone-9' });
  });

  it('passes them through the streaming bridge the dashboard uses', async () => {
    const stream = {
      streamDeploymentStep: () => {},
      streamCommandOutput: () => {},
      streamError: () => {},
      streamDeploymentComplete: () => {},
    };
    const streaming = new StreamingCLIBridge(bridge, stream);
    await streaming.deployApplicationWithProgress('system-cf-companion', { CF_TOKEN: 'tok-123', CF_ZONE_ID: 'zone-9' }, { type: 'standard' }, 'dep-373');
    expect(spawnEnv()).toMatchObject({ CF_TOKEN: 'tok-123', CF_ZONE_ID: 'zone-9' });
  });

  it('still ignores trusted defaults, protected names and other apps\' variables', async () => {
    await bridge.deployApplication(
      'system-cf-companion',
      { CF_TOKEN: 'tok', APPFOLDER: '/etc', SECURITYOPS: 'unconfined', DOCKER_HOST: 'tcp://evil:2375', VNC_PW: 'x' },
      { type: 'standard' },
    );
    const env = spawnEnv();
    expect(env.APPFOLDER).toBe('/opt/appdata');
    expect(env.SECURITYOPS).toBe('no-new-privileges');
    expect(env.DOCKER_HOST).not.toBe('tcp://evil:2375');
    expect(env.VNC_PW).toBeUndefined();
  });

  it('never writes a property named by the request (__proto__, constructor)', async () => {
    const config = JSON.parse('{"__proto__":{"polluted":"yes"},"constructor":"x","CF_TOKEN":"tok"}');
    await bridge.deployApplication('system-cf-companion', config, { type: 'standard' });
    const env = spawnEnv();
    expect(env.CF_TOKEN).toBe('tok');
    expect(Object.hasOwn(env, 'constructor')).toBe(false);
    expect(env.polluted).toBeUndefined();
    expect({}.polluted).toBeUndefined();
  });

  it('still rejects a value with a dollar, backtick or newline', async () => {
    await expect(
      bridge.deployApplication('system-cf-companion', { CF_TOKEN: 'a$b' }, { type: 'standard' }),
    ).rejects.toThrow(/Invalid template variable value for CF_TOKEN/);
    expect(spawn).not.toHaveBeenCalled();
  });
});

describe('the catalog lists each app\'s variables', () => {
  it('lists CF Companion\'s token and zone as required, and not DOMAIN (a default)', async () => {
    const app = await bridge.parseApplicationConfig(path.join(repoRoot, 'apps/system/cf-companion.yml'), 'system');
    expect(app.variables).toEqual([
      { name: 'CF_TOKEN', required: true },
      { name: 'CF_ZONE_ID', required: true },
    ]);
  });
});

describe('the catalog says which apps use the domain themselves (HLCE-378)', () => {
  it('CF Companion does, FlareSolverr does not', async () => {
    const cf = await bridge.parseApplicationConfig(path.join(repoRoot, 'apps/system/cf-companion.yml'), 'system');
    const fs2 = await bridge.parseApplicationConfig(path.join(repoRoot, 'apps/downloads/flaresolverr.yml'), 'downloads');
    expect(cf.usesDomain).toBe(true);
    expect(fs2.usesDomain).toBe(false);
  });

  it('a domain typed in the dialog reaches CF Companion in standard mode', async () => {
    await bridge.deployApplication('system-cf-companion', { CF_TOKEN: 't', CF_ZONE_ID: 'z', domain: 'example.com' }, { type: 'standard' });
    expect(spawnEnv().DOMAIN).toBe('example.com');
  });
});

describe('the catalog lists each app\'s own container names (HLCE-384)', () => {
  it('uses container_name when the template sets one', async () => {
    const app = await bridge.parseApplicationConfig(path.join(repoRoot, 'apps/self-hosted/it-tools.yml'), 'self-hosted');
    expect(app.containerNames).toEqual(['it-tools']);
  });

  it('falls back to the name compose gives a service in the deploy project', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-384-'));
    const file = path.join(dir, 'two.yml');
    fs.writeFileSync(file, 'services:\n  web:\n    image: nginx\n  db:\n    image: postgres\n    container_name: two-db\n');
    const app = await bridge.parseApplicationConfig(file, 'myapps');
    expect(app.containerNames).toEqual(['data-web-1', 'two-db']);
  });
});
