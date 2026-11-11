import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DeployBlockedBanner } from './DeployBlockedBanner';
import { getDeployReadiness } from '../lib/api';

vi.mock('../lib/api', () => ({ getDeployReadiness: vi.fn() }));
const mockReadiness = vi.mocked(getDeployReadiness);

beforeEach(() => mockReadiness.mockReset());

// HLCE-372: tell the user to update the AppArmor profile before a deploy fails.
describe('DeployBlockedBanner', () => {
  it('shows the command when deploys are blocked', async () => {
    mockReadiness.mockResolvedValue({
      ok: false,
      message: 'Update them with `sudo bash scripts/install-apparmor.sh`, then deploy again.',
    });
    render(<DeployBlockedBanner />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Deploys are blocked on this host');
    expect(screen.getByText('sudo bash scripts/install-apparmor.sh').tagName).toBe('CODE');
  });

  it('shows nothing when deploys can run', async () => {
    mockReadiness.mockResolvedValue({ ok: true });
    render(<DeployBlockedBanner />);
    await waitFor(() => expect(mockReadiness).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows nothing when the backend is older and has no such check', async () => {
    mockReadiness.mockRejectedValueOnce(new Error('Not Found'));
    render(<DeployBlockedBanner />);
    await waitFor(() => expect(mockReadiness).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
