import type { AppTemplate, CLIApplication, ConfigField } from '../types';

const SECRET_NAME = /PASSWORD|PASS$|_PW$|TOKEN|SECRET|KEY$/;

// Build the deploy dialog's fields from CLI app data.
export function buildConfigFields(app: AppTemplate): ConfigField[] {
  const cliApp = (app as AppTemplate & { _cliApp?: CLIApplication })._cliApp;
  const fields: ConfigField[] = [
    {
      name: 'containerName',
      label: 'Container Name',
      type: 'text',
      required: false,
      placeholder: cliApp?.name || 'auto',
      defaultValue: '',
    },
    {
      name: 'domain',
      label: 'Domain',
      type: 'text',
      required: false,
      placeholder: 'yourdomain.com — no https:// needed',
      defaultValue: '',
      trafikOnly: true,
      helpText: 'Just the domain (e.g. mjashley.com). Apps will be accessible at appname.yourdomain.com',
    },
  ];

  // The app's own settings, named exactly as its template uses them, because
  // those are the only names the backend passes to the app (HLCE-373). The
  // dialog used to list the container's environment lines instead, sent them
  // lowercase, and the backend dropped every one. Required settings sit with
  // the basic fields, so the dialog will not deploy while one is empty.
  for (const { name, required } of cliApp?.variables ?? []) {
    fields.push({
      name,
      label: name.replace(/_/g, ' '),
      type: SECRET_NAME.test(name) ? 'password' : 'text',
      required,
      defaultValue: '',
      advanced: !required,
    });
  }

  if (cliApp?.ports) {
    Object.entries(cliApp.ports).forEach(([key, value]) => {
      fields.push({
        name: `port_${key}`,
        label: `Port: ${key}`,
        type: 'text',
        required: false,
        defaultValue: String(value),
        advanced: true,
      });
    });
  }

  return fields;
}
