import { describe, it, expect, beforeAll, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// HLCE-380: two deploys started together must each run compose with their own
// settings and stream only their own output. The bridge is shared by every
// deploy, so the per-deploy settings used to sit on it and the second deploy's
// values reached the first deploy's compose run.
vi.mock('child_process', () => ({ spawn: vi.fn() }));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'x'.repeat(40);

const { spawn } = await import('child_process');
const { CLIBridge } = await import('./cli-bridge.js');
const { StreamingCLIBridge } = await import('./progress-stream.js');

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// A compose run that prints the DOMAIN it was given, then exits 0.
function composeChild(env) {
  return {
    stdout: { on: (event, cb) => event === 'data' && setTimeout(() => cb(Buffer.from(`domain=${env.DOMAIN}`)), 5) },
    stderr: { on: () => {} },
    on: (event, cb) => event === 'close' && setTimeout(() => cb(0), 15),
  };
}

function recordingStream() {
  const output = {};
  return {
    output,
    streamDeploymentStep: () => {},
    streamCommandOutput: (id, _cmd, data) => { (output[id] ||= []).push(data); },
    streamError: () => {},
    streamDeploymentComplete: () => {},
  };
}

let cli;
beforeAll(() => {
  process.env.CLI_BRIDGE_HOST_PATH = repoRoot;
  process.env.DATA_DIR = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-380-')), 'data');
  cli = new CLIBridge();
});

describe('HLCE-380: concurrent deploys keep their own settings', () => {
  it('gives each compose run only its own values and streams only its own output', async () => {
    vi.mocked(spawn).mockImplementation((_cmd, _args, opts) => composeChild(opts.env));
    const stream = recordingStream();
    const bridge = new StreamingCLIBridge(cli, stream);

    await Promise.all([
      bridge.deployApplicationWithProgress('ai-comfyui', { domain: 'a.example.com' }, { type: 'standard' }, 'dep-a'),
      bridge.deployApplicationWithProgress('ai-jan', { domain: 'b.example.com' }, { type: 'standard' }, 'dep-b'),
    ]);

    const domainByFile = Object.fromEntries(
      vi.mocked(spawn).mock.calls.map(([, args, opts]) => [path.basename(args[args.indexOf('-f') + 1]), opts.env.DOMAIN])
    );
    expect(domainByFile).toEqual({ 'comfyui-local.yml': 'a.example.com', 'jan-local.yml': 'b.example.com' });

    expect(stream.output['dep-a']).toEqual(['domain=a.example.com']);
    expect(stream.output['dep-b']).toEqual(['domain=b.example.com']);
  });

  it('keeps no per-deploy settings or output hook on the shared bridge', async () => {
    await cli.prepareEnvironmentConfig({ domain: 'c.example.com' }, { type: 'standard' });
    expect(Object.values(cli)).not.toContainEqual(expect.objectContaining({ DOMAIN: 'c.example.com' }));
    // The streaming deploys in the test above must not have replaced the
    // bridge's own output method.
    expect(Object.hasOwn(cli, 'streamProgress')).toBe(false);
  });
});
