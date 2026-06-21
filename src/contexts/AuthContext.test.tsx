// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";

// AuthContext gates the whole app. We mock the api layer so we can drive the
// auth state machine (initial-load retry race, MFA branch, session-dead) with
// no network. Fake timers throughout because the failed-mount path schedules a
// 1500ms retry; without fake timers that timer dangles past the test.
vi.mock("../lib/api", () => ({
  apiFetch: vi.fn(),
  apiFetchRaw: vi.fn(),
}));

import { AuthProvider, useAuth } from "./AuthContext";
import { apiFetch, apiFetchRaw } from "../lib/api";

const mockApiFetch = vi.mocked(apiFetch);
const mockApiFetchRaw = vi.mocked(apiFetchRaw);

function res(ok: boolean, body: unknown = {}, status = ok ? 200 : 401): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

const sampleUser = {
  id: "1",
  username: "alice",
  email: "alice@example.com",
  role: "admin" as const,
  lastLogin: null,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

// Flush pending microtasks + any timers due right now (resolves the mount
// checkAuth promise chain).
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  mockApiFetch.mockReset();
  mockApiFetchRaw.mockReset();
  // Default: mount finds nobody logged in (and won't throw).
  mockApiFetchRaw.mockResolvedValue(res(false));
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("AuthContext — initial load (AC1)", () => {
  it("sets user on a successful /auth/me and clears loading", async () => {
    mockApiFetchRaw.mockResolvedValue(res(true, { user: sampleUser }));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await flush();

    expect(result.current.user).toEqual(sampleUser);
    expect(result.current.loading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(mockApiFetchRaw).toHaveBeenCalledWith("/auth/me");
  });

  it("leaves user null and clears loading when /auth/me is unauthorized", async () => {
    mockApiFetchRaw.mockResolvedValue(res(false));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await flush();

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("clears user and loading when /auth/me throws (network error)", async () => {
    mockApiFetchRaw.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await flush();

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("the 1500ms retry still populates user after loading has flipped false (cold-load race)", async () => {
    mockApiFetchRaw
      .mockResolvedValueOnce(res(false))
      .mockResolvedValueOnce(res(true, { user: sampleUser }));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await flush();

    // First attempt failed: loading is already false, still no user.
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(result.current.user).toEqual(sampleUser);
    expect(mockApiFetchRaw).toHaveBeenCalledTimes(2);
  });
});

describe("AuthContext — rate-limit & event contracts (AC2)", () => {
  it("calls apiFetchRaw on mount and never apiFetch (page-load rate-limit bypass)", async () => {
    mockApiFetchRaw.mockResolvedValue(res(false));

    renderHook(() => useAuth(), { wrapper });
    await flush();

    expect(mockApiFetchRaw).toHaveBeenCalledWith("/auth/me");
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("login MFA branch returns the ticket and leaves user null", async () => {
    mockApiFetch.mockResolvedValueOnce(
      res(true, { mfa_required: true, ticket: "ticket-xyz" }),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    await flush();

    let out: { mfa_required?: boolean; ticket?: string } = {};
    await act(async () => {
      out = await result.current.login("alice", "pw");
    });

    expect(out).toEqual({ mfa_required: true, ticket: "ticket-xyz" });
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("hl-session-dead clears the user", async () => {
    mockApiFetch.mockResolvedValueOnce(res(true, { user: sampleUser }));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await flush();
    await act(async () => {
      await result.current.login("alice", "pw");
    });
    expect(result.current.user).toEqual(sampleUser);

    await act(async () => {
      window.dispatchEvent(new Event("hl-session-dead"));
    });

    expect(result.current.user).toBeNull();
  });
});

describe("AuthContext — login/logout (AC3)", () => {
  it("login success then logout flips isAuthenticated", async () => {
    mockApiFetch
      .mockResolvedValueOnce(res(true, { user: sampleUser })) // login
      .mockResolvedValueOnce(res(true, {})); // logout

    const { result } = renderHook(() => useAuth(), { wrapper });
    await flush();

    let out: { mfa_required?: boolean; ticket?: string } = { mfa_required: true };
    await act(async () => {
      out = await result.current.login("alice", "pw");
    });
    expect(out).toEqual({});
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(mockApiFetch).toHaveBeenCalledWith("/auth/logout", { method: "POST" });
  });

  it("login with bad credentials rejects with the server's details message", async () => {
    mockApiFetch.mockResolvedValueOnce(
      res(false, { error: "Login failed", details: "Invalid username or password" }, 401),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    await flush();

    await act(async () => {
      await expect(result.current.login("alice", "wrong")).rejects.toThrow(
        "Invalid username or password",
      );
    });
    expect(result.current.user).toBeNull();
  });

  it("login falls back to a generic message when the error body is unparseable", async () => {
    const badBody = {
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response;
    mockApiFetch.mockResolvedValueOnce(badBody);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await flush();

    await act(async () => {
      await expect(result.current.login("alice", "pw")).rejects.toThrow("Login failed");
    });
  });

  it("logout clears the user even when the network call fails", async () => {
    mockApiFetch
      .mockResolvedValueOnce(res(true, { user: sampleUser })) // login
      .mockRejectedValueOnce(new Error("server down")); // logout

    const { result } = renderHook(() => useAuth(), { wrapper });
    await flush();
    await act(async () => {
      await result.current.login("alice", "pw");
    });
    expect(result.current.user).toEqual(sampleUser);

    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("isAdmin is false for a non-admin user", async () => {
    mockApiFetch.mockResolvedValueOnce(
      res(true, { user: { ...sampleUser, role: "user" } }),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    await flush();
    await act(async () => {
      await result.current.login("alice", "pw");
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });
});

describe("AuthContext — guard", () => {
  it("useAuth throws when used outside an AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider",
    );
  });
});
