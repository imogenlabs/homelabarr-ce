// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

function Boom({ message }: { message: string }): never {
  throw new Error(message);
}

describe('ErrorBoundary', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // React logs the caught error to console.error; suppress the expected noise.
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('renders children normally when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <div>healthy child</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('healthy child')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('renders the fallback with the thrown error message when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom message="kaboom from child" />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole('heading', { name: 'Something went wrong' }),
    ).toBeInTheDocument();
    expect(screen.getByText('kaboom from child')).toBeInTheDocument();
  });

  it('reloads the page when the Reload Page button is clicked', async () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
      writable: true,
    });

    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Boom message="needs reload" />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole('button', { name: 'Reload Page' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
