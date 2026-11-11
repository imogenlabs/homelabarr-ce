import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import yaml from 'yaml';
import { fileURLToPath } from 'url';
import { CLIBridge } from './cli-bridge.js';

// HLCE-377: a password every install shares is no password. No template and no
// built-in default may give a secret a fixed value; the user types it in the
// deploy dialog, and a deploy without it is refused by name.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The same names the deploy dialog shows as password fields.
const SECRET_NAME = /PASSWORD|PASS$|_PW$|TOKEN|SECRET|KEY$/;

const templates = fs.readdirSync(path.join(repoRoot, 'apps'), { withFileTypes: true })
  .filter(d => d.isDirectory())
  .flatMap(d => fs.readdirSync(path.join(repoRoot, 'apps', d.name))
    .filter(f => f.endsWith('.yml'))
    .map(f => path.join('apps', d.name, f)));

let bridge;
beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-that-is-definitely-32-plus-chars-long';
  process.env.CLI_BRIDGE_HOST_PATH = repoRoot;
  process.env.DATA_DIR = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-377-')), 'data');
  bridge = new CLIBridge();
});

describe('no fixed secrets', () => {
  it('no template gives a secret a fallback value (an empty one means optional)', () => {
    expect(templates.length).toBeGreaterThan(100);
    const fixed = [];
    for (const file of templates) {
      const text = JSON.stringify(yaml.parse(fs.readFileSync(path.join(repoRoot, file), 'utf8')));
      for (const [, name, value] of text.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*):?-([^}]*)\}/g)) {
        if (value !== '' && SECRET_NAME.test(name)) fixed.push(`${file}: ${name}`);
      }
    }
    expect(fixed).toEqual([]);
  });

  it('no built-in default fills in a secret', () => {
    const builtIn = [
      ...Object.keys(CLIBridge.trustedDefaults()),
      ...Object.keys(CLIBridge.ENV_DEFAULTS),
    ];
    expect(builtIn.filter(name => SECRET_NAME.test(name))).toEqual([]);
  });
});

describe('the user sets them', () => {
  it('aria2 asks for its RPC secret and refuses to deploy without it', async () => {
    const app = await bridge.parseApplicationConfig(path.join(repoRoot, 'apps/downloads/aria.yml'), 'downloads');
    expect(app.variables).toContainEqual({ name: 'ARIA_RPC_SECRET', required: true });
    expect(bridge.findUnresolvedVariables('downloads-aria', {})).toContain('ARIA_RPC_SECRET');
    expect(bridge.findUnresolvedVariables('downloads-aria', { ARIA_RPC_SECRET: 's3cret' })).not.toContain('ARIA_RPC_SECRET');
  });

  it('flowise and n8n ask for their passwords', async () => {
    const flowise = await bridge.parseApplicationConfig(path.join(repoRoot, 'apps/ai/flowise.yml'), 'ai');
    expect(flowise.variables).toContainEqual({ name: 'FLOWISE_PASSWORD', required: true });
    const n8n = await bridge.parseApplicationConfig(path.join(repoRoot, 'apps/self-hosted/n8n.yml'), 'self-hosted');
    expect(n8n.variables).toContainEqual({ name: 'N8N_PASSWORD', required: true });
  });
});
