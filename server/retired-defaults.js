// Passwords earlier releases gave these apps when the user left them empty.
// v2.6.5 stopped (HLCE-377), but containers deployed before keep them, and
// anyone can look them up. The dashboard warns about each one (HLCE-387).
export const RETIRED_DEFAULTS = [
  { app: 'n8n', env: 'N8N_BASIC_AUTH_PASSWORD', value: 'changeme', setting: 'N8N_PASSWORD' },
  { app: 'Flowise', env: 'FLOWISE_PASSWORD', value: 'changeme', setting: 'FLOWISE_PASSWORD' },
  { app: 'aria2', env: 'RPC_SECRET', value: 'homelabarr', setting: 'ARIA_RPC_SECRET' },
];

/**
 * Containers still running with a retired default. Takes [{ name, env }] where
 * env is Docker's "KEY=value" list. Returns names only, never a value.
 */
export function findRetiredDefaults(containers) {
  const found = [];
  for (const { name, env = [] } of containers) {
    for (const d of RETIRED_DEFAULTS) {
      if (env.includes(`${d.env}=${d.value}`)) {
        found.push({ container: name, app: d.app, setting: d.setting });
      }
    }
  }
  return found;
}
