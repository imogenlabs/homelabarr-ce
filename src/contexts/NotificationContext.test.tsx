// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

import { NotificationProvider, useNotifications } from "./NotificationContext";
import { toast } from "sonner";

const mockToast = vi.mocked(toast);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NotificationContext", () => {
  it("delegates success/error/warning/info to sonner with descriptions and durations", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    result.current.success("Saved", "all good");
    result.current.error("Boom", "it broke");
    result.current.warning("Careful", "heads up");
    result.current.info("FYI", "note");

    expect(mockToast.success).toHaveBeenCalledWith("Saved", { description: "all good" });
    expect(mockToast.error).toHaveBeenCalledWith("Boom", {
      description: "it broke",
      duration: 8000,
    });
    expect(mockToast.warning).toHaveBeenCalledWith("Careful", {
      description: "heads up",
      duration: 6000,
    });
    expect(mockToast.info).toHaveBeenCalledWith("FYI", { description: "note" });
  });

  it("addNotification routes by type", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    result.current.addNotification({ type: "success", title: "S", message: "m" });
    result.current.addNotification({ type: "error", title: "E" });
    result.current.addNotification({ type: "warning", title: "W" });

    expect(mockToast.success).toHaveBeenCalledWith("S", { description: "m" });
    expect(mockToast.error).toHaveBeenCalledWith("E", { description: undefined });
    expect(mockToast.warning).toHaveBeenCalledWith("W", { description: undefined });
  });

  it("addNotification falls back to info for an unknown type", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    result.current.addNotification({ type: "mystery", title: "M", message: "x" });

    expect(mockToast.info).toHaveBeenCalledWith("M", { description: "x" });
  });

  it("removeNotification is a no-op that does not throw", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    expect(() => result.current.removeNotification("any-id")).not.toThrow();
    expect(result.current.notifications).toEqual([]);
  });

  it("useNotifications throws outside a NotificationProvider", () => {
    expect(() => renderHook(() => useNotifications())).toThrow(
      "useNotifications must be used within a NotificationProvider",
    );
  });
});
