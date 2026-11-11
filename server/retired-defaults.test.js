import { describe, it, expect } from 'vitest';
import { findRetiredDefaults } from './retired-defaults.js';

// HLCE-387: containers deployed before v2.6.5 may still carry a default password.
describe('findRetiredDefaults', () => {
  it('names each container still using a retired default, without the value', () => {
    const found = findRetiredDefaults([
      { name: 'n8n', env: ['TZ=UTC', 'N8N_BASIC_AUTH_PASSWORD=changeme'] },
      { name: 'flowise', env: ['FLOWISE_PASSWORD=changeme'] },
      { name: 'aria', env: ['RPC_SECRET=homelabarr'] },
    ]);
    expect(found).toEqual([
      { container: 'n8n', app: 'n8n', setting: 'N8N_PASSWORD' },
      { container: 'flowise', app: 'Flowise', setting: 'FLOWISE_PASSWORD' },
      { container: 'aria', app: 'aria2', setting: 'ARIA_RPC_SECRET' },
    ]);
    expect(JSON.stringify(found)).not.toMatch(/changeme|homelabarr/);
  });

  it('ignores a password the user chose and unrelated containers', () => {
    expect(findRetiredDefaults([
      { name: 'n8n', env: ['N8N_BASIC_AUTH_PASSWORD=s3cret'] },
      { name: 'aria', env: ['RPC_SECRET=homelabarr2'] },
      { name: 'web', env: ['PASSWORD=changeme'] },
      { name: 'bare' },
    ])).toEqual([]);
  });
});
