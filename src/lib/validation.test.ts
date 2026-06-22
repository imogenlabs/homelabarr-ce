import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AppTemplate, ConfigField } from '../types';
import { validateConfig, validatePortConflicts } from './validation';
import { checkUsedPorts } from './api';

// validatePortConflicts imports checkUsedPorts from ./api; mock that module so
// no real fetch/DOM is touched.
vi.mock('./api', () => ({
  checkUsedPorts: vi.fn(),
}));

const checkUsedPortsMock = vi.mocked(checkUsedPorts);

// Build a minimal AppTemplate with just the fields validation reads. The rest
// of AppTemplate (logo, category, etc.) is irrelevant here, so cast.
function template(
  configFields: ConfigField[] = [],
  extra: Partial<AppTemplate> = {}
): AppTemplate {
  return { configFields, ...extra } as unknown as AppTemplate;
}

function field(partial: Partial<ConfigField> & Pick<ConfigField, 'name' | 'type'>): ConfigField {
  return {
    label: partial.name,
    required: false,
    ...partial,
  } as ConfigField;
}

describe('validateConfig — required fields', () => {
  it('flags a missing required field', () => {
    const t = template([field({ name: 'apikey', label: 'API Key', type: 'text', required: true })]);
    const errors = validateConfig(t, {}, false);
    expect(errors).toContain('API Key is required');
  });

  it('does not flag a required field that is present', () => {
    const t = template([field({ name: 'apikey', label: 'API Key', type: 'text', required: true })]);
    const errors = validateConfig(t, { apikey: 'xyz' }, false);
    expect(errors).not.toContain('API Key is required');
  });

  it('skips advanced required fields when NOT in advanced mode', () => {
    const t = template([
      field({ name: 'adv', label: 'Adv', type: 'text', required: true, advanced: true }),
    ]);
    const errors = validateConfig(t, {}, false);
    expect(errors).not.toContain('Adv is required');
  });

  it('flags advanced required fields WHEN in advanced mode', () => {
    const t = template([
      field({ name: 'adv', label: 'Adv', type: 'text', required: true, advanced: true }),
    ]);
    const errors = validateConfig(t, {}, true);
    expect(errors).toContain('Adv is required');
  });
});

describe('validateConfig — path validation', () => {
  // Path validation triggers when the field NAME contains "path" case-INsensitively
  // (validation.ts uses key.toLowerCase().includes('path'), HLCE-266).
  const pathField = field({ name: 'configpath', label: 'Config Path', type: 'text' });

  it('flags a camelCase path field (HLCE-266 — case-insensitive key match)', () => {
    const camel = field({ name: 'dataPath', label: 'Data Path', type: 'text' });
    const t = template([camel]);
    const errors = validateConfig(t, { dataPath: 'relative/dir' }, false);
    expect(errors).toContain('Data Path must be a valid absolute path');
  });

  it('flags a path that does not start with /', () => {
    const t = template([pathField]);
    const errors = validateConfig(t, { configpath: 'relative/dir' }, false);
    expect(errors).toContain('Config Path must be a valid absolute path');
  });

  it('flags a path containing the /path/to placeholder', () => {
    const t = template([pathField]);
    const errors = validateConfig(t, { configpath: '/path/to/config' }, false);
    expect(errors).toContain('Config Path must be a valid absolute path');
  });

  it('accepts a valid absolute path', () => {
    const t = template([pathField]);
    const errors = validateConfig(t, { configpath: '/opt/appdata/config' }, false);
    expect(errors).not.toContain('Config Path must be a valid absolute path');
  });
});

describe('validateConfig — port range validation', () => {
  const portField = field({ name: 'webPort', label: 'Web Port', type: 'number' });

  it('flags a port above 65535', () => {
    const t = template([portField]);
    const errors = validateConfig(t, { webPort: '70000' }, false);
    expect(errors).toContain('Web Port must be a valid port number (1-65535)');
  });

  it('flags a non-numeric port', () => {
    const t = template([portField]);
    const errors = validateConfig(t, { webPort: 'abc' }, false);
    expect(errors).toContain('Web Port must be a valid port number (1-65535)');
  });

  it('accepts a valid in-range port without range error', () => {
    const t = template([portField]);
    const errors = validateConfig(t, { webPort: '8080' }, false);
    expect(errors).not.toContain('Web Port must be a valid port number (1-65535)');
  });

  it('does NOT block a privileged port below 1024 (HLCE-280: no warning pushed into errors[])', () => {
    const t = template([portField]);
    const errors = validateConfig(t, { webPort: '80' }, false);
    // Previously a "Warning: …privileged port" string was pushed into the
    // blocking errors[] array, so DeployModal refused every deploy on 80/443.
    expect(errors).toHaveLength(0);
    expect(errors.some(e => /privileged/i.test(e))).toBe(false);
  });

  // HLCE-280 AC4: catalog apps render port fields as type 'text'; the range
  // check must apply to them too (via isPortField), not only type 'number'.
  it('range-validates a TEXT-typed port field (out-of-range rejected)', () => {
    const textPort = field({ name: 'httpPort', label: 'HTTP Port', type: 'text' });
    const t = template([textPort]);
    expect(validateConfig(t, { httpPort: '99999' }, false))
      .toContain('HTTP Port must be a valid port number (1-65535)');
    expect(validateConfig(t, { httpPort: 'abc' }, false))
      .toContain('HTTP Port must be a valid port number (1-65535)');
  });

  it('accepts a valid TEXT-typed port and does not block a privileged text port', () => {
    const textPort = field({ name: 'httpPort', label: 'HTTP Port', type: 'text' });
    const t = template([textPort]);
    expect(validateConfig(t, { httpPort: '8080' }, false)).toHaveLength(0);
    expect(validateConfig(t, { httpPort: '443' }, false)).toHaveLength(0);
  });
});

describe('validatePortConflicts', () => {
  beforeEach(() => {
    checkUsedPortsMock.mockReset();
  });

  it('reports a configured port that collides with a backend used port', async () => {
    checkUsedPortsMock.mockResolvedValue({ usedPorts: [8080] });
    const t = template([field({ name: 'webPort', label: 'Web Port', type: 'number' })]);

    const errors = await validatePortConflicts(t, { webPort: '8080' });

    expect(errors).toContain('Port 8080 is already in use by another container');
  });

  it('reports a template default port that collides with a backend used port', async () => {
    checkUsedPortsMock.mockResolvedValue({ usedPorts: [32400] });
    const t = template([], { defaultPorts: { web: 32400 } });

    const errors = await validatePortConflicts(t, {});

    expect(errors).toContain('Default port 32400 (web) is already in use');
  });

  it('returns no errors when there are no collisions', async () => {
    checkUsedPortsMock.mockResolvedValue({ usedPorts: [9999] });
    const t = template([field({ name: 'webPort', label: 'Web Port', type: 'number' })], {
      defaultPorts: { web: 5000 },
    });

    const errors = await validatePortConflicts(t, { webPort: '8080' });

    expect(errors).toEqual([]);
  });

  it('fails open (returns []) when the backend port check throws', async () => {
    checkUsedPortsMock.mockRejectedValue(new Error('backend down'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const t = template([field({ name: 'webPort', label: 'Web Port', type: 'number' })]);

    const errors = await validatePortConflicts(t, { webPort: '8080' });

    expect(errors).toEqual([]);
    warnSpy.mockRestore();
  });

  // Catalog apps render port fields as type 'text', so the old type==='number'
  // gate skipped them and the user got no pre-submit conflict warning (HLCE-276).
  it('reports a TEXT-typed port field (catalog app) that collides with a used port', async () => {
    checkUsedPortsMock.mockResolvedValue({ usedPorts: [8096] });
    const t = template([field({ name: 'port', label: 'Port', type: 'text' })]);

    const errors = await validatePortConflicts(t, { port: '8096' });

    expect(errors).toContain('Port 8096 is already in use by another container');
  });

  it('recognises a text port field by its label (e.g. "HTTP Port") even when the key does not say port', async () => {
    checkUsedPortsMock.mockResolvedValue({ usedPorts: [443] });
    const t = template([field({ name: 'webUi', label: 'HTTP Port', type: 'text' })]);

    const errors = await validatePortConflicts(t, { webUi: '443' });

    expect(errors).toContain('Port 443 is already in use by another container');
  });

  it('does not report a non-colliding text port field', async () => {
    checkUsedPortsMock.mockResolvedValue({ usedPorts: [8096] });
    const t = template([field({ name: 'port', label: 'Port', type: 'text' })]);

    const errors = await validatePortConflicts(t, { port: '9090' });

    expect(errors).toEqual([]);
  });

  it('does not treat an unrelated text field as a port', async () => {
    checkUsedPortsMock.mockResolvedValue({ usedPorts: [8096] });
    const t = template([field({ name: 'apikey', label: 'API Key', type: 'text' })]);

    // Even if the value happens to parse to a used port number, a non-port field
    // must not be conflict-checked.
    const errors = await validatePortConflicts(t, { apikey: '8096' });

    expect(errors).toEqual([]);
  });

  it('regression: a numeric-typed port field still reports a conflict', async () => {
    checkUsedPortsMock.mockResolvedValue({ usedPorts: [8080] });
    const t = template([field({ name: 'webPort', label: 'Web Port', type: 'number' })]);

    const errors = await validatePortConflicts(t, { webPort: '8080' });

    expect(errors).toContain('Port 8080 is already in use by another container');
  });
});
