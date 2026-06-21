// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTheme, setTheme } from './theme';

// jsdom's localStorage here lacks a working clear(), so back the global with a
// simple in-memory Storage shim that the tests fully control.
function makeStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeStorage());
  document.documentElement.classList.remove('dark');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('setTheme', () => {
  it('adds the `dark` class to <html> and persists "dark"', () => {
    setTheme('dark');

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('removes the `dark` class from <html> and persists "light"', () => {
    document.documentElement.classList.add('dark');

    setTheme('light');

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('toggling dark→light→dark keeps the class and storage in sync', () => {
    setTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    setTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    setTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});

describe('getTheme', () => {
  it('returns the persisted theme when one is stored', () => {
    localStorage.setItem('theme', 'dark');
    expect(getTheme()).toBe('dark');

    localStorage.setItem('theme', 'light');
    expect(getTheme()).toBe('light');
  });

  it('falls back to the OS preference (dark) when nothing is stored', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
    } as unknown as MediaQueryList);

    expect(getTheme()).toBe('dark');
  });

  it('falls back to the OS preference (light) when nothing is stored', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
    } as unknown as MediaQueryList);

    expect(getTheme()).toBe('light');
  });

  it('reads back whatever setTheme persisted (round-trip)', () => {
    setTheme('dark');
    expect(getTheme()).toBe('dark');
  });
});
