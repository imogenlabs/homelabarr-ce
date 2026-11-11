import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import yaml from 'yaml';
import { fileURLToPath } from 'url';

// HLCE-375: the port typed in the deploy dialog is the port the app is
// published on. child_process is mocked; each test reads the compose file the
// deploy handed to docker-compose.

vi.mock('child_process', () => ({ spawn: vi.fn(), execSync: vi.fn() }));

import { spawn } from 'child_process';
import { CLIBridge } from './cli-bridge.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let bridge;
let composeSeen;
beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-that-is-definitely-32-plus-chars-long';
  process.env.CLI_BRIDGE_HOST_PATH = repoRoot;
  process.env.DATA_DIR = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hlce-375-')), 'data');
  bridge = new CLIBridge();
});

beforeEach(() => {
  composeSeen = undefined;
  vi.mocked(spawn).mockReset();
  vi.mocked(spawn).mockImplementation((...call) => {
    composeSeen = yaml.parse(fs.readFileSync(call[1][1], 'utf8'));
    return {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, cb) => {
        if (event === 'close') setTimeout(() => cb(0), 0);
      }),
    };
  });
});

const doc = () => ({
  services: {
    app: {
      ports: [
        '8080:80',
        '${PORTBLOCK}:8443:443/tcp',
        '${PORTBLOCK}:5353:53/udp',
        { target: 3000, published: 3000, protocol: 'tcp', mode: 'host' },
        '9000-9010:9000-9010',
        '7000',
      ],
    },
    side: { ports: ['1234:1234'] },
  },
});

describe('publishedPorts', () => {
  it('reads every port form the templates use, keyed like the dialog fields', () => {
    const ports = CLIBridge.publishedPorts(doc().services.app);
    expect(ports.map(p => [p.key, p.host])).toEqual([
      ['80', 8080],
      ['443', 8443],
      ['53/udp', 5353],
      ['3000', 3000],
    ]);
  });

  it('gives every catalog app a real port number, never NaN', async () => {
    const catalog = await bridge.getAvailableApplications();
    const apps = Object.values(catalog).flat();
    expect(apps.length).toBeGreaterThan(50);
    for (const app of apps) {
      for (const host of Object.values(app.ports || {})) {
        expect(Number.isInteger(host) && host >= 1 && host <= 65535, `${app.id}: ${host}`).toBe(true);
      }
    }
  });
});

describe('applyPortChoices', () => {
  it('moves only the host side of the chosen ports, in every form', () => {
    const d = doc();
    CLIBridge.applyPortChoices(d, { port_80: '18080', 'port_53/udp': '15353', port_3000: ' 13000 ' });
    expect(d.services.app.ports.slice(0, 4)).toEqual([
      '18080:80',
      '${PORTBLOCK}:8443:443/tcp',
      '${PORTBLOCK}:15353:53/udp',
      { target: 3000, published: 13000, protocol: 'tcp', mode: 'host' },
    ]);
    expect(d.services.side.ports).toEqual(['1234:1234']);
  });

  it('keeps the template port when the field is empty or absent', () => {
    const d = doc();
    CLIBridge.applyPortChoices(d, { port_80: '' });
    expect(d.services.app.ports).toEqual(doc().services.app.ports);
  });

  it('names every value that is not a port number and changes nothing', () => {
    for (const bad of ['abc', '0', '65536', '80.5', '-1', '8080abc']) {
      expect(CLIBridge.portChoices(doc(), { port_80: bad }).invalid).toEqual(['port_80']);
    }
    const d = doc();
    expect(() => CLIBridge.applyPortChoices(d, { port_80: '18080', port_443: 'x' })).toThrow(/port_443/);
    expect(d.services.app.ports[0]).toBe('8080:80');
  });

  it('ignores fields the template does not publish', () => {
    expect(CLIBridge.portChoices(doc(), { port_1234: 'x', port_9999: 'y' }).invalid).toEqual([]);
  });
});

describe('a deploy publishes the chosen port (tdarr)', () => {
  it('standard mode', async () => {
    await bridge.deployApplication('transcoding-tdarr', { port_8265: '18265' }, { type: 'standard' });
    expect(composeSeen.services.tdarr.ports).toEqual([
      '${PORTBLOCK}:18265:8265',
      '${PORTBLOCK}:8266:8266',
      '${PORTBLOCK}:8267:8267',
    ]);
  });

  it('refuses a bad port before docker-compose runs', async () => {
    await expect(
      bridge.deployApplication('transcoding-tdarr', { port_8265: 'nope' }, { type: 'standard' }),
    ).rejects.toThrow(/port_8265/);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('findInvalidPorts names the bad field for the route', () => {
    expect(bridge.findInvalidPorts('transcoding-tdarr', { port_8266: '99999' })).toEqual(['port_8266']);
    expect(bridge.findInvalidPorts('transcoding-tdarr', { port_8266: '18266' })).toEqual([]);
  });
});
