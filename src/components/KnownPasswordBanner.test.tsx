import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { KnownPasswordBanner } from './KnownPasswordBanner';
import { getKnownPasswordApps } from '../lib/api';

vi.mock('../lib/api', () => ({ getKnownPasswordApps: vi.fn() }));
const mockApps = vi.mocked(getKnownPasswordApps);

beforeEach(() => mockApps.mockReset());

// HLCE-387: apps deployed before v2.6.5 may still use a default password.
describe('KnownPasswordBanner', () => {
  it('names each app and the setting to change', async () => {
    mockApps.mockResolvedValue({ apps: [
      { container: 'n8n', app: 'n8n', setting: 'N8N_PASSWORD' },
      { container: 'aria', app: 'aria2', setting: 'ARIA_RPC_SECRET' },
    ] });
    render(<KnownPasswordBanner />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Some apps still use a password everyone knows');
    expect(alert).toHaveTextContent('n8n');
    expect(screen.getByText('N8N_PASSWORD').tagName).toBe('CODE');
    expect(screen.getByText('ARIA_RPC_SECRET').tagName).toBe('CODE');
  });

  it('shows nothing when no app uses one', async () => {
    mockApps.mockResolvedValue({ apps: [] });
    render(<KnownPasswordBanner />);
    await waitFor(() => expect(mockApps).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows nothing when the backend is older and has no such check', async () => {
    mockApps.mockRejectedValueOnce(new Error('Not Found'));
    render(<KnownPasswordBanner />);
    await waitFor(() => expect(mockApps).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
