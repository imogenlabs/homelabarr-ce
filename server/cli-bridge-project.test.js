import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

// HLCE-376: deploy runs compose from the data folder, so compose named the
// project "data"; stop, remove and logs ran from the template folder and looked
// in a project named after the category, missing the running app. Every app
// command now names the same project. child_process is mocked.

vi.mock('child_process', () => ({ spawn: vi.fn(), execSync: vi.fn() }));

import { spawn } from 'child_process';
import { CLIBridge, appProjectName } from './cli-bridge.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let bridge;
beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-that-is-definitely-32-plus-chars-long';
  process.env.CLI_BRIDGE_HOST_PATH = repoRoot;
  process.env.DATA_DIR = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-376-')), 'data');
  bridge = new CLIBridge();
});

beforeEach(() => {
  vi.mocked(spawn).mockReset();
  vi.mocked(spawn).mockImplementation(() => ({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event, cb) => {
      if (event === 'close') setTimeout(() => cb(0), 0);
    }),
  }));
});

const projectOf = (call) => {
  const args = call[1];
  return args[0] === '-p' ? args[1] : undefined;
};

describe('every app command uses the deploy\'s compose project', () => {
  it('is named after the data folder, as deploys always were', () => {
    expect(appProjectName()).toBe('data');
  });

  it('deploy, stop, remove and logs all name the same project', async () => {
    await bridge.deployApplication('transcoding-tdarr', {}, { type: 'standard' });
    await bridge.stopApplication('transcoding-tdarr');
    await bridge.removeApplication('transcoding-tdarr', true);
    await bridge.getApplicationLogs('transcoding-tdarr', 20);

    const calls = vi.mocked(spawn).mock.calls;
    expect(calls).toHaveLength(4);
    expect(calls.map(projectOf)).toEqual(['data', 'data', 'data', 'data']);
    expect(calls.map(c => c[1].slice(4))).toEqual([['up', '-d'], ['down'], ['down', '-v'], ['logs', '--tail=20']]);
  });

  it('stop and remove target the app\'s own services, not a whole project', async () => {
    await bridge.stopApplication('transcoding-tdarr');
    const args = vi.mocked(spawn).mock.calls[0][1];
    expect(args[3]).toBe(path.join(repoRoot, 'apps', 'transcoding', 'tdarr.yml'));
    expect(args).not.toContain('--remove-orphans');
  });

  it('leaves Traefik and Authelia in their own projects', async () => {
    await bridge.executeDockerCompose('/opt/traefik/docker-compose.yml', 'up -d');
    expect(vi.mocked(spawn).mock.calls[0][1]).toEqual(['-f', '/opt/traefik/docker-compose.yml', 'up', '-d']);
  });
});
