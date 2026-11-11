import { describe, it, expect } from 'vitest';
import { buildConfigFields } from './config-fields';
import type { AppTemplate, CLIApplication } from '../types';

function appWith(cli: Partial<CLIApplication>): AppTemplate {
  return { id: 'system-cf-companion', name: 'CF Companion', _cliApp: { name: 'cf-companion', ...cli } } as unknown as AppTemplate;
}

// HLCE-373: the dialog used to build fields from the container's environment
// lines and send them lowercase, and the backend dropped every one.
describe('buildConfigFields', () => {
  it('offers the app\'s own variables under their exact names', () => {
    const fields = buildConfigFields(appWith({
      environment: { CF_TOKEN: '${CF_TOKEN}', TARGET_DOMAIN: '${DOMAIN}' },
      variables: [
        { name: 'CF_TOKEN', required: true },
        { name: 'LOG_LEVEL', required: false },
      ],
    }));
    const byName = Object.fromEntries(fields.map(f => [f.name, f]));

    expect(byName.CF_TOKEN).toMatchObject({ required: true, advanced: false, type: 'password', defaultValue: '' });
    expect(byName.LOG_LEVEL).toMatchObject({ required: false, advanced: true, type: 'text' });
    // Environment lines are no longer turned into fields that go nowhere.
    expect(byName.cf_token).toBeUndefined();
    expect(byName.target_domain).toBeUndefined();
  });

  it('still offers the container name and domain fields', () => {
    const names = buildConfigFields(appWith({ variables: [] })).map(f => f.name);
    expect(names).toEqual(expect.arrayContaining(['containerName', 'domain']));
  });
});
