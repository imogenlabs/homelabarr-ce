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
  // NOTE: validateConfig only runs path validation when the field NAME includes
  // the lowercase substring "path" (validation.ts:21, case-sensitive), so the
  // field name must contain lowercase "path".
  const pathField = field({ name: 'configpath', label: 'Config Path', type: 'text' });

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

  it('warns (but does not invalidate) on a privileged port below 1024', () => {
    const t = template([portField]);
    const errors = validateConfig(t, { webPort: '80' }, false);
    expect(errors).toContain('Warning: Port 80 is a privileged port and may require elevated permissions');
    expect(errors).not.toContain('Web Port must be a valid port number (1-65535)');
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
});
