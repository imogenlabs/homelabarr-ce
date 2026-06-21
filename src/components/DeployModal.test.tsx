// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from 'lucide-react';
import { DeployModal } from './DeployModal';
import type { AppTemplate, ConfigField, DeploymentMode } from '../types';
import { validateConfig, validatePortConflicts } from '../lib/validation';

// DeployModal delegates all validation to ../lib/validation; mock both named
// exports so each test controls exactly which errors come back.
vi.mock('../lib/validation', () => ({
  validateConfig: vi.fn(() => []),
  validatePortConflicts: vi.fn(async () => []),
}));

const mockValidateConfig = vi.mocked(validateConfig);
const mockValidatePortConflicts = vi.mocked(validatePortConflicts);

function makeApp(overrides: Partial<AppTemplate> = {}): AppTemplate {
  return {
    id: 'plex',
    name: 'Plex',
    description: 'Media server',
    category: 'media',
    logo: Home,
    deploymentModes: ['local', 'traefik'],
    configFields: [
      {
        name: 'port',
        label: 'Host Port',
        type: 'number',
        required: true,
        placeholder: '32400',
      },
      {
        name: 'domain',
        label: 'Domain',
        type: 'text',
        required: true,
        trafikOnly: true,
        placeholder: 'plex.example.com',
      },
    ],
    ...overrides,
  };
}

function renderModal(props: Partial<React.ComponentProps<typeof DeployModal>> = {}) {
  const onClose = vi.fn();
  const onDeploy = vi.fn();
  const app = props.app ?? makeApp();
  render(
    <DeployModal
      app={app}
      onClose={onClose}
      onDeploy={onDeploy}
      isOpen
      {...props}
    />,
  );
  return { onClose, onDeploy, app };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockValidateConfig.mockReturnValue([]);
  mockValidatePortConflicts.mockResolvedValue([]);
});

describe('DeployModal', () => {
  it('renders the dialog with the app name and basic config fields when open', () => {
    renderModal();

    expect(
      screen.getByRole('dialog', { name: /deploy plex/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Configure deployment settings')).toBeInTheDocument();
    // Basic (non-traefik-only) field is visible; trafikOnly field is hidden in local mode.
    expect(screen.getByLabelText(/host port/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/domain/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^deploy$/i })).toBeInTheDocument();
  });

  it('does not render dialog content when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('blocks deploy and surfaces validation errors returned by validateConfig', async () => {
    const user = userEvent.setup();
    // Use a non-required field so native HTML5 validation doesn't pre-empt
    // submit; the component's own validateConfig is what gates the deploy here.
    const app = makeApp({
      configFields: [{ name: 'port', label: 'Host Port', type: 'number', required: false }],
    });
    mockValidateConfig.mockReturnValue(['Host Port is required']);
    const { onDeploy } = renderModal({ app });

    await user.click(screen.getByRole('button', { name: /^deploy$/i }));

    expect(await screen.findByText(/please fix the following errors/i)).toBeInTheDocument();
    expect(screen.getByText('Host Port is required')).toBeInTheDocument();
    expect(onDeploy).not.toHaveBeenCalled();
  });

  it('blocks deploy and warns when the chosen port conflicts with a used port', async () => {
    const user = userEvent.setup();
    mockValidatePortConflicts.mockResolvedValue([
      'Port 32400 is already in use by another container',
    ]);
    const { onDeploy } = renderModal();

    await user.type(screen.getByLabelText(/host port/i), '32400');
    await user.click(screen.getByRole('button', { name: /^deploy$/i }));

    expect(
      await screen.findByText('Port 32400 is already in use by another container'),
    ).toBeInTheDocument();
    expect(onDeploy).not.toHaveBeenCalled();
  });

  it('proceeds to deploy when the port check reports no conflict', async () => {
    const user = userEvent.setup();
    const { onDeploy, app } = renderModal();

    await user.type(screen.getByLabelText(/host port/i), '32400');
    await user.click(screen.getByRole('button', { name: /^deploy$/i }));

    expect(onDeploy).toHaveBeenCalledTimes(1);
    const [appId, config, mode] = onDeploy.mock.calls[0];
    expect(appId).toBe(app.id);
    expect(config).toEqual({ port: '32400' });
    expect((mode as DeploymentMode).type).toBe('local');
  });

  it('reveals the traefik-only domain field when switching to Traefik mode', async () => {
    const user = userEvent.setup();
    renderModal();

    // Local mode: domain hidden.
    expect(screen.queryByLabelText(/domain/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /traefik/i }));

    // Traefik mode: the trafikOnly field now renders.
    expect(await screen.findByLabelText(/domain/i)).toBeInTheDocument();
  });

  it('switches to the authelia deployment mode via the Authelia checkbox', async () => {
    const user = userEvent.setup();
    const { onDeploy } = renderModal();

    await user.click(screen.getByRole('radio', { name: /traefik/i }));
    const autheliaToggle = await screen.findByRole('checkbox', {
      name: /enable authelia authentication/i,
    });
    await user.click(autheliaToggle);

    // domain (trafikOnly) is still present under authelia; fill both required
    // inputs so native HTML5 validation lets the form submit.
    await user.type(await screen.findByLabelText(/domain/i), 'plex.example.com');
    await user.type(screen.getByLabelText(/host port/i), '32400');
    await user.click(screen.getByRole('button', { name: /^deploy$/i }));

    expect(onDeploy).toHaveBeenCalledTimes(1);
    const mode = onDeploy.mock.calls[0][2] as DeploymentMode;
    expect(mode.type).toBe('authelia');
  });

  it('passes the collected config object to onDeploy on the happy path', async () => {
    const user = userEvent.setup();
    const { onDeploy } = renderModal();

    await user.type(screen.getByLabelText(/host port/i), '8080');
    await user.click(screen.getByRole('button', { name: /^deploy$/i }));

    expect(onDeploy).toHaveBeenCalledTimes(1);
    expect(onDeploy.mock.calls[0][1]).toEqual({ port: '8080' });
    // validation helpers were invoked with the app + collected config.
    expect(mockValidateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'plex' }),
      { port: '8080' },
      false,
    );
    expect(mockValidatePortConflicts).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'plex' }),
      { port: '8080' },
    );
  });

  it('invokes onClose when the Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const { onClose, onDeploy } = renderModal();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDeploy).not.toHaveBeenCalled();
  });

  it('renders an explicit deployment-mode list and selects a custom mode', async () => {
    const user = userEvent.setup();
    const modes: DeploymentMode[] = [
      { type: 'local', name: 'Local Only', description: 'Ports', features: ['fast'], icon: Home },
      { type: 'traefik', name: 'Behind Traefik', description: 'Proxy', features: ['tls', 'https'], icon: Home },
    ];
    const { onDeploy } = renderModal({ deploymentModes: modes });

    expect(screen.getByText('Local Only')).toBeInTheDocument();
    expect(screen.getByText('Behind Traefik')).toBeInTheDocument();
    expect(screen.getByText('https')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /behind traefik/i }));
    await user.type(await screen.findByLabelText(/domain/i), 'app.example.com');
    await user.type(screen.getByLabelText(/host port/i), '9000');
    await user.click(screen.getByRole('button', { name: /^deploy$/i }));

    expect(onDeploy).toHaveBeenCalledTimes(1);
    const [, config, mode] = onDeploy.mock.calls[0];
    expect((mode as DeploymentMode).type).toBe('traefik');
    expect(config).toEqual({ domain: 'app.example.com', port: '9000' });
  });

  it('toggles and renders advanced fields, including them in validation context', async () => {
    const user = userEvent.setup();
    const advancedField: ConfigField = {
      name: 'tz',
      label: 'Timezone',
      type: 'text',
      required: false,
      advanced: true,
    };
    const app = makeApp({
      configFields: [
        { name: 'port', label: 'Host Port', type: 'number', required: false },
        advancedField,
      ],
    });
    renderModal({ app });

    // Advanced field hidden until the collapsible is opened.
    expect(screen.queryByLabelText(/timezone/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /advanced configuration/i }));

    const tz = await screen.findByLabelText(/timezone/i);
    await user.type(tz, 'UTC');
    await user.click(screen.getByRole('button', { name: /^deploy$/i }));

    // showAdvanced flag (3rd arg) is now true.
    expect(mockValidateConfig).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ tz: 'UTC' }),
      true,
    );
  });

  it('renders a select field with its options and captures the chosen value', async () => {
    const user = userEvent.setup();
    const app = makeApp({
      configFields: [
        {
          name: 'puid',
          label: 'User ID',
          type: 'select',
          required: true,
          options: ['1000', '1001'],
        },
      ],
    });
    const { onDeploy } = renderModal({ app });

    const select = screen.getByLabelText(/user id/i);
    expect(within(select).getByRole('option', { name: '1001' })).toBeInTheDocument();

    await user.selectOptions(select, '1001');
    await user.click(screen.getByRole('button', { name: /^deploy$/i }));

    expect(onDeploy).toHaveBeenCalledTimes(1);
    expect(onDeploy.mock.calls[0][1]).toEqual({ puid: '1001' });
  });
});
