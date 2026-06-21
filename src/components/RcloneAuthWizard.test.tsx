// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { RcloneAuthWizard } from './RcloneAuthWizard';

// RcloneAuthWizard imports only react + lucide-react (no auth/notification
// contexts), so the only externals to control are global fetch and
// navigator.clipboard.

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}
function errJson(status: number, body: unknown) {
  return { ok: false, status, json: async () => body } as unknown as Response;
}

function renderWizard(props: Partial<React.ComponentProps<typeof RcloneAuthWizard>> = {}) {
  const onClose = vi.fn();
  const onComplete = vi.fn();
  render(
    <RcloneAuthWizard
      isOpen
      onClose={onClose}
      containerId="c123"
      provider={props.provider ?? 'gdrive'}
      onComplete={onComplete}
      {...props}
    />,
  );
  return { onClose, onComplete };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('RcloneAuthWizard', () => {
  it('renders nothing when closed', () => {
    renderWizard({ isOpen: false });
    expect(screen.queryByText(/setup/i)).not.toBeInTheDocument();
  });

  it('renders nothing for an unknown provider', () => {
    renderWizard({ provider: 'does-not-exist' });
    expect(screen.queryByText(/setup/i)).not.toBeInTheDocument();
  });

  it('renders the OAuth setup header for an oauth provider', () => {
    renderWizard({ provider: 'gdrive' });
    expect(screen.getByText('Setup Google Drive')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate auth url/i })).toBeInTheDocument();
  });

  // AC1 (OAuth): start -> authorize -> complete -> onComplete.
  it('runs the OAuth start then complete flow and fires onComplete with the data', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        okJson({ success: true, data: { auth_url: 'https://auth.example/go' } }),
      )
      .mockResolvedValueOnce(
        okJson({ success: true, data: { remote: 'gdrive', token: 'tok' } }),
      );

    const { onComplete, onClose } = renderWizard({ provider: 'gdrive' });

    await user.click(screen.getByRole('button', { name: /generate auth url/i }));

    // start POST hit the right endpoint with the provider id.
    const startCall = fetchMock.mock.calls[0];
    expect(startCall[0]).toBe('/api/enhanced-mount/c123/auth/start');
    expect(JSON.parse((startCall[1] as RequestInit).body as string)).toEqual({
      provider: 'gdrive',
    });

    // Now on the authorize step: the generated URL is shown and a code field appears.
    const urlInput = await screen.findByDisplayValue('https://auth.example/go');
    expect(urlInput).toBeInTheDocument();

    const codeField = screen.getByPlaceholderText(/paste the code/i);
    await user.type(codeField, 'authcode-123');
    await user.click(screen.getByRole('button', { name: /complete authentication/i }));

    const completeCall = fetchMock.mock.calls[1];
    expect(completeCall[0]).toBe('/api/enhanced-mount/c123/auth/complete');
    expect(JSON.parse((completeCall[1] as RequestInit).body as string)).toEqual({
      provider: 'gdrive',
      auth_code: 'authcode-123',
    });

    expect(onComplete).toHaveBeenCalledWith({ remote: 'gdrive', token: 'tok' });
    // handleComplete also closes the wizard.
    expect(onClose).toHaveBeenCalled();
  });

  // AC4 (clipboard): copy the generated auth URL. Drive the copy click with
  // fireEvent rather than user-event — userEvent.setup() installs its own
  // navigator.clipboard stub, which would shadow the spy we asserted on.
  it('copies the auth URL to the clipboard from the authorize step', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      okJson({ success: true, data: { auth_url: 'https://auth.example/copy-me' } }),
    );

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    renderWizard({ provider: 'gdrive' });
    await user.click(screen.getByRole('button', { name: /generate auth url/i }));
    await screen.findByDisplayValue('https://auth.example/copy-me');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy url/i }));
    });
    expect(writeText).toHaveBeenCalledWith('https://auth.example/copy-me');
  });

  it('keeps Complete disabled (so no complete fetch fires) until a code is entered', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      okJson({ success: true, data: { auth_url: 'https://auth.example/x' } }),
    );

    renderWizard({ provider: 'gdrive' });
    await user.click(screen.getByRole('button', { name: /generate auth url/i }));
    await screen.findByDisplayValue('https://auth.example/x');

    // The complete button is disabled while the code field is empty, so the
    // empty-code guard is unreachable through the UI — assert the disabled
    // state and that no /auth/complete request was attempted.
    expect(
      screen.getByRole('button', { name: /complete authentication/i }),
    ).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // AC3 (failure): OAuth start fails -> error surfaced, no onComplete.
  it('surfaces the server error when OAuth start returns success:false and does not complete', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      okJson({ success: false, error: 'provider unavailable' }),
    );

    const { onComplete } = renderWizard({ provider: 'gdrive' });
    await user.click(screen.getByRole('button', { name: /generate auth url/i }));

    expect(await screen.findByText('provider unavailable')).toBeInTheDocument();
    // Still on the generate step; never advanced.
    expect(screen.getByRole('button', { name: /generate auth url/i })).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('surfaces a network error when the OAuth complete fetch rejects', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        okJson({ success: true, data: { auth_url: 'https://auth.example/y' } }),
      )
      .mockRejectedValueOnce(new Error('boom'));

    const { onComplete } = renderWizard({ provider: 'gdrive' });
    await user.click(screen.getByRole('button', { name: /generate auth url/i }));
    await screen.findByDisplayValue('https://auth.example/y');

    await user.type(screen.getByPlaceholderText(/paste the code/i), 'code-1');
    await user.click(screen.getByRole('button', { name: /complete authentication/i }));

    expect(
      await screen.findByText(/network error during authentication/i),
    ).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  // AC2 (API-key): fill required fields -> submit -> onComplete.
  it('renders the API-key setup for an api_key provider', () => {
    renderWizard({ provider: 'backblaze' });
    expect(screen.getByText('Configure Backblaze B2')).toBeInTheDocument();
    expect(screen.getByText('Account ID')).toBeInTheDocument();
    expect(screen.getByText('Application Key')).toBeInTheDocument();
    expect(screen.getByText('Bucket Name')).toBeInTheDocument();
    // Submit is disabled until every field has a value.
    expect(screen.getByRole('button', { name: /configure provider/i })).toBeDisabled();
  });

  it('submits API-key credentials and fires onComplete on success', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      okJson({ success: true, data: { configured: true } }),
    );

    const { onComplete, onClose } = renderWizard({ provider: 'backblaze' });

    await user.type(screen.getByPlaceholderText(/enter your account id/i), 'acct-1');
    await user.type(screen.getByPlaceholderText(/enter your application key/i), 'app-key-1');
    await user.type(screen.getByPlaceholderText(/enter your bucket name/i), 'my-bucket');

    const submit = screen.getByRole('button', { name: /configure provider/i });
    expect(submit).toBeEnabled();
    await user.click(submit);

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe('/api/enhanced-mount/c123/auth/api-key');
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({
      provider: 'backblaze',
      credentials: {
        account_id: 'acct-1',
        application_key: 'app-key-1',
        bucket: 'my-bucket',
      },
    });
    expect(onComplete).toHaveBeenCalledWith({ configured: true });
    expect(onClose).toHaveBeenCalled();
  });

  // AC3 (failure): API-key submit returns ok:false -> error, no onComplete.
  it('surfaces the server error when API-key configuration fails', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(errJson(500, { error: 'nope' }));

    const { onComplete } = renderWizard({ provider: 'backblaze' });

    await user.type(screen.getByPlaceholderText(/enter your account id/i), 'acct-1');
    await user.type(screen.getByPlaceholderText(/enter your application key/i), 'app-key-1');
    await user.type(screen.getByPlaceholderText(/enter your bucket name/i), 'my-bucket');
    await user.click(screen.getByRole('button', { name: /configure provider/i }));

    // ok:false -> result.success is undefined -> error branch with fallback string.
    expect(await screen.findByText('nope')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('closes via the header close button', async () => {
    const { onClose } = renderWizard({ provider: 'gdrive' });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
