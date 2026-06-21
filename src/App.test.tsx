// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { useAuth } from './contexts/AuthContext';
import { useNotifications } from './contexts/NotificationContext';
import { useLoading } from './hooks/useLoading';

vi.mock('./contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('./contexts/NotificationContext', () => ({ useNotifications: vi.fn() }));
vi.mock('./hooks/useLoading', () => ({ useLoading: vi.fn() }));

// Keep the gate path free of real network calls.
vi.mock('./lib/api', () => ({
  deployApp: vi.fn(),
  getContainers: vi.fn().mockResolvedValue([]),
  getApplicationCatalog: vi.fn().mockResolvedValue({ applications: [], source: 'templates' }),
  getDeploymentModes: vi.fn().mockResolvedValue([]),
  getStars: vi.fn().mockResolvedValue({ stars: [] }),
  starApp: vi.fn(),
  unstarApp: vi.fn(),
}));

// LoginScreen marker for the unauthenticated branch.
vi.mock('./components/LoginScreen', () => ({
  LoginScreen: () => <div data-testid="login-screen">login-screen</div>,
}));

// Heavy custom children rendered on the authenticated path — stub them so the
// gate test stays focused and stable (they touch contexts/api internally).
vi.mock('./components/UserMenu', () => ({ UserMenu: () => <div>user-menu</div> }));
vi.mock('./components/ThemeToggle', () => ({ ThemeToggle: () => <div>theme-toggle</div> }));
vi.mock('./components/AppCard', () => ({ AppCard: () => <div>app-card</div> }));
vi.mock('./components/DeployedAppCard', () => ({ DeployedAppCard: () => <div>deployed-app-card</div> }));
vi.mock('./components/DeployModal', () => ({ DeployModal: () => null }));
vi.mock('./components/DeploymentProgressModal', () => ({ DeploymentProgressModal: () => null }));
vi.mock('./components/LogViewer', () => ({ LogViewer: () => null }));
vi.mock('./components/HelpModal', () => ({ HelpModal: () => null }));
vi.mock('./components/PortManager', () => ({ PortManager: () => null }));
vi.mock('./components/EnhancedMountManager', () => ({ EnhancedMountManager: () => null }));
vi.mock('./components/EnhancedMountOnboarding', () => ({ EnhancedMountOnboarding: () => null }));
vi.mock('./components/LoginModal', () => ({ LoginModal: () => null }));
vi.mock('./components/ApiKeysModal', () => ({ ApiKeysModal: () => null }));
vi.mock('./components/UserSettings', () => ({ UserSettings: () => null }));

function setAuth(over: Partial<ReturnType<typeof useAuth>>) {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: false,
    isAdmin: false,
    loading: false,
    ...over,
  } as unknown as ReturnType<typeof useAuth>);
}

describe('App auth gate', () => {
  beforeEach(() => {
    vi.mocked(useNotifications).mockReturnValue({
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      addNotification: vi.fn(),
      removeNotification: vi.fn(),
      notifications: [],
    } as unknown as ReturnType<typeof useNotifications>);
    vi.mocked(useLoading).mockReturnValue({
      loading: false,
      startLoading: vi.fn(),
      stopLoading: vi.fn(),
    } as unknown as ReturnType<typeof useLoading>);
  });

  it('shows the loading gate while auth is loading', () => {
    setAuth({ loading: true });
    render(<App />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('login-screen')).not.toBeInTheDocument();
  });

  it('renders the login screen when not authenticated', () => {
    setAuth({ loading: false, isAuthenticated: false });
    render(<App />);

    expect(screen.getByTestId('login-screen')).toBeInTheDocument();
  });

  it('renders the main app shell when authenticated', () => {
    setAuth({
      loading: false,
      isAuthenticated: true,
      user: { username: 'admin' } as unknown as ReturnType<typeof useAuth>['user'],
    });
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'HomelabARR' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('login-screen')).not.toBeInTheDocument();
  });
});
