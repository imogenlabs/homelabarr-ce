// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";

vi.mock("../lib/theme", () => ({
  getTheme: vi.fn(() => "light"),
  setTheme: vi.fn(),
}));

import { ThemeProvider, useTheme } from "./ThemeContext";
import { getTheme, setTheme } from "../lib/theme";

const mockGetTheme = vi.mocked(getTheme);
const mockSetTheme = vi.mocked(setTheme);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTheme.mockReturnValue("light");
});

describe("ThemeContext", () => {
  it("seeds the theme from getTheme and applies it on mount", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("light");
    expect(mockGetTheme).toHaveBeenCalled();
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("toggleTheme flips light → dark → light and re-applies each time", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("dark");
    expect(mockSetTheme).toHaveBeenLastCalledWith("dark");

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("light");
    expect(mockSetTheme).toHaveBeenLastCalledWith("light");
  });

  it("seeds from a persisted dark theme", () => {
    mockGetTheme.mockReturnValue("dark");

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("dark");
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("useTheme returns the default context (no-op) outside a provider", () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
    expect(() => result.current.toggleTheme()).not.toThrow();
  });
});
